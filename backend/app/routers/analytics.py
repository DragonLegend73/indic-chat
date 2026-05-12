"""
Analytics Router — Teacher dashboard data (JWT-protected).
"""

import logging
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import get_db
from app.models.student import Student, Interaction, QuizAttempt, TopicMastery
from app.routers.auth import require_teacher

logger = logging.getLogger("indic-chat.analytics")
router = APIRouter()


@router.get("/analytics/overview", dependencies=[Depends(require_teacher)])
async def analytics_overview(db: AsyncSession = Depends(get_db)):
    """High-level dashboard stats."""
    student_count = (await db.execute(select(func.count(Student.id)))).scalar() or 0
    interaction_count = (await db.execute(select(func.count(Interaction.id)))).scalar() or 0
    quiz_count = (await db.execute(select(func.count(QuizAttempt.id)))).scalar() or 0

    # Average quiz accuracy
    correct_count = (await db.execute(
        select(func.count(QuizAttempt.id)).where(QuizAttempt.is_correct == True)
    )).scalar() or 0
    avg_accuracy = round(correct_count / quiz_count * 100, 1) if quiz_count > 0 else 0

    return {
        "total_students": student_count,
        "total_interactions": interaction_count,
        "total_quiz_attempts": quiz_count,
        "average_quiz_accuracy": avg_accuracy,
    }


@router.get("/analytics/languages", dependencies=[Depends(require_teacher)])
async def analytics_languages(db: AsyncSession = Depends(get_db)):
    """Language distribution across all interactions."""
    stmt = (
        select(Interaction.language_detected, func.count(Interaction.id).label("count"))
        .group_by(Interaction.language_detected)
        .order_by(desc("count"))
    )
    result = await db.execute(stmt)
    rows = result.all()

    total = sum(r.count for r in rows)
    distribution = [
        {
            "language": r.language_detected or "unknown",
            "count": r.count,
            "percentage": round(r.count / total * 100, 1) if total > 0 else 0,
        }
        for r in rows
    ]
    return {"total": total, "distribution": distribution}


@router.get("/analytics/topics", dependencies=[Depends(require_teacher)])
async def analytics_topics(db: AsyncSession = Depends(get_db)):
    """Topic performance across all students."""
    stmt = (
        select(
            TopicMastery.topic,
            func.avg(TopicMastery.accuracy).label("avg_accuracy"),
            func.sum(TopicMastery.total_attempts).label("total_attempts"),
            func.count(TopicMastery.student_id).label("student_count"),
        )
        .group_by(TopicMastery.topic)
        .order_by(func.avg(TopicMastery.accuracy).asc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "topic": r.topic,
            "avg_accuracy": round(float(r.avg_accuracy or 0) * 100, 1),
            "total_attempts": int(r.total_attempts or 0),
            "student_count": r.student_count,
        }
        for r in rows
    ]


@router.get("/analytics/students", dependencies=[Depends(require_teacher)])
async def analytics_students(db: AsyncSession = Depends(get_db)):
    """Per-student performance summary."""
    students = (await db.execute(select(Student).order_by(Student.id))).scalars().all()
    data = []

    for s in students:
        # Quiz stats
        total_q = (await db.execute(
            select(func.count(QuizAttempt.id)).where(QuizAttempt.student_id == s.id)
        )).scalar() or 0
        correct_q = (await db.execute(
            select(func.count(QuizAttempt.id)).where(
                QuizAttempt.student_id == s.id, QuizAttempt.is_correct == True
            )
        )).scalar() or 0

        # Interaction count
        interactions = (await db.execute(
            select(func.count(Interaction.id)).where(Interaction.student_id == s.id)
        )).scalar() or 0

        data.append({
            "id": s.id,
            "name": s.name,
            "preferred_language": s.preferred_language,
            "difficulty": s.current_difficulty,
            "total_interactions": interactions,
            "total_quizzes": total_q,
            "quiz_accuracy": round(correct_q / total_q * 100, 1) if total_q > 0 else 0,
        })

    return data


@router.get("/analytics/student/{student_id}/weak-topics", dependencies=[Depends(require_teacher)])
async def student_weak_topics(student_id: int, db: AsyncSession = Depends(get_db)):
    """Get weak topics for a specific student."""
    from app.services.adaptive import get_adaptive_service
    adaptive = get_adaptive_service()
    return await adaptive.get_weak_topics(db, student_id)
