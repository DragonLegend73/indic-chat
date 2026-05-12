"""
Adaptive Learning Service — Per-student, per-topic difficulty tracking + conversation history.
Implements topic-level mastery tracking beyond simplistic global difficulty.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
from collections import defaultdict

logger = logging.getLogger("indic-chat.adaptive")


class ConversationHistory:
    """In-memory sliding-window conversation history per student session."""

    def __init__(self, max_messages: int = 8, timeout_minutes: int = 30):
        self._histories: dict[int, list[dict]] = defaultdict(list)
        self._last_active: dict[int, datetime] = {}
        self._max = max_messages
        self._timeout = timedelta(minutes=timeout_minutes)

    def add(self, student_id: int, role: str, content: str):
        """Add a message to the student's history."""
        now = datetime.now()
        # Clear stale sessions
        if student_id in self._last_active:
            if now - self._last_active[student_id] > self._timeout:
                self._histories[student_id] = []

        self._histories[student_id].append({"role": role, "content": content[:500]})
        self._last_active[student_id] = now

        # Trim to max
        if len(self._histories[student_id]) > self._max:
            self._histories[student_id] = self._histories[student_id][-self._max:]

    def get(self, student_id: int) -> list[dict]:
        """Get conversation history for a student."""
        now = datetime.now()
        if student_id in self._last_active:
            if now - self._last_active[student_id] > self._timeout:
                self._histories[student_id] = []
        return self._histories.get(student_id, [])

    def clear(self, student_id: int):
        self._histories.pop(student_id, None)
        self._last_active.pop(student_id, None)


class AdaptiveService:
    """
    Manages per-student adaptive difficulty and conversation context.

    Difficulty levels: beginner → intermediate → advanced
    Topic mastery: novice → learning → proficient → mastered
    """

    DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced"]

    def __init__(self):
        self.history = ConversationHistory()

    async def update_difficulty(self, db_session, student, is_correct: bool, topic: str = None):
        """
        Update student difficulty based on quiz/answer correctness.
        Also updates per-topic mastery if topic is provided.
        """
        from app.models.student import TopicMastery

        if is_correct:
            student.consecutive_correct += 1
            student.consecutive_incorrect = 0
        else:
            student.consecutive_incorrect += 1
            student.consecutive_correct = 0

        # Adjust global difficulty (3-strike rule)
        current_idx = self.DIFFICULTY_LEVELS.index(student.current_difficulty)

        if student.consecutive_correct >= 3 and current_idx < len(self.DIFFICULTY_LEVELS) - 1:
            student.current_difficulty = self.DIFFICULTY_LEVELS[current_idx + 1]
            student.consecutive_correct = 0
            logger.info(f"Student {student.id} leveled up → {student.current_difficulty}")

        elif student.consecutive_incorrect >= 3 and current_idx > 0:
            student.current_difficulty = self.DIFFICULTY_LEVELS[current_idx - 1]
            student.consecutive_incorrect = 0
            logger.info(f"Student {student.id} leveled down → {student.current_difficulty}")

        # Update per-topic mastery
        if topic:
            await self._update_topic_mastery(db_session, student.id, topic, is_correct)

    async def _update_topic_mastery(self, db_session, student_id: int, topic: str, is_correct: bool):
        """Update or create topic mastery record."""
        from sqlalchemy import select
        from app.models.student import TopicMastery

        stmt = select(TopicMastery).where(
            TopicMastery.student_id == student_id,
            TopicMastery.topic == topic,
        )
        result = await db_session.execute(stmt)
        mastery = result.scalar_one_or_none()

        if mastery is None:
            mastery = TopicMastery(
                student_id=student_id,
                topic=topic,
                total_attempts=0,
                correct_attempts=0,
            )
            db_session.add(mastery)

        mastery.total_attempts += 1
        if is_correct:
            mastery.correct_attempts += 1
        mastery.last_attempted = datetime.now()
        mastery.update_mastery()

    async def get_weak_topics(self, db_session, student_id: int, limit: int = 5) -> list[dict]:
        """Get student's weakest topics by accuracy."""
        from sqlalchemy import select
        from app.models.student import TopicMastery

        stmt = (
            select(TopicMastery)
            .where(TopicMastery.student_id == student_id, TopicMastery.total_attempts >= 2)
            .order_by(TopicMastery.accuracy.asc())
            .limit(limit)
        )
        result = await db_session.execute(stmt)
        topics = result.scalars().all()

        return [
            {
                "topic": t.topic,
                "accuracy": round(t.accuracy * 100, 1),
                "mastery_level": t.mastery_level,
                "attempts": t.total_attempts,
            }
            for t in topics
        ]

    def build_context(self, student, history: list[dict], rag_chunks: list[dict], intent: str) -> dict:
        """
        Build the full context dict for prompt construction.
        """
        return {
            "student_name": student.name,
            "difficulty": student.current_difficulty,
            "intent": intent,
            "history": history,
            "rag_context": "\n\n".join(
                f"[Source: {c['metadata'].get('source', '?')}, Page {c['metadata'].get('page', '?')}]\n{c['content']}"
                for c in rag_chunks
            ) if rag_chunks else "No relevant textbook content found.",
        }


# Singleton
_adaptive_service: Optional[AdaptiveService] = None


def get_adaptive_service() -> AdaptiveService:
    global _adaptive_service
    if _adaptive_service is None:
        _adaptive_service = AdaptiveService()
    return _adaptive_service
