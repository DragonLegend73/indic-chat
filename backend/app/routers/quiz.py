"""
Quiz Router — Generate and evaluate quiz questions.
"""

import json
import logging
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import get_db
from app.models.student import Student, QuizAttempt
from app.services.llm import get_llm_service
from app.services.rag import get_rag_service
from app.services.adaptive import get_adaptive_service
from app.services.language import get_language_service
from app.services.translation import get_translation_service
from app.prompts.templates import build_prompt
from fastapi.concurrency import run_in_threadpool

logger = logging.getLogger("indic-chat.quiz")
router = APIRouter()


class QuizGenerateRequest(BaseModel):
    student_id: int
    topic: str = "general"
    subject: str = "math"


class QuizEvaluateRequest(BaseModel):
    student_id: int
    question: str
    student_answer: str
    correct_answer: str
    topic: str = "general"


@router.post("/quiz/generate")
async def generate_quiz(req: QuizGenerateRequest, db: AsyncSession = Depends(get_db)):
    """Generate a quiz question based on topic and difficulty."""
    result = await db.execute(select(Student).where(Student.id == req.student_id))
    student = result.scalar_one_or_none()
    if not student:
        return {"error": "Student not found"}

    lang_service = get_language_service()
    trans_service = get_translation_service()

    detection = await run_in_threadpool(lang_service.detect, req.topic)
    detected_lang = detection.language

    response_lang = student.preferred_language
    if response_lang == "auto":
        response_lang = detected_lang

    english_topic = req.topic
    if detected_lang != "eng_Latn":
        try:
            english_topic = await trans_service.translate_async(req.topic, detected_lang, "eng_Latn")
        except Exception:
            pass

    # Get RAG context for the topic
    rag = get_rag_service()
    chunks = []
    try:
        chunks = rag.retrieve(english_topic, top_k=3, subject=req.subject)
    except Exception:
        pass

    rag_context = "\n\n".join(c["content"] for c in chunks) if chunks else "Use general NCERT Class 10 knowledge."

    system, prompt, _ = build_prompt(
        query=english_topic,
        intent="request_quiz",
        difficulty=student.current_difficulty,
        rag_context=rag_context,
        history=[],
        topic=english_topic,
        subject=req.subject,
    )

    llm = get_llm_service()
    response = await llm.generate(prompt, system=system)

    try:
        # Find JSON in response
        start = response.find("{")
        end = response.rfind("}") + 1
        if start >= 0 and end > start:
            quiz_data = json.loads(response[start:end])
            
            if response_lang != "eng_Latn":
                try:
                    quiz_data["question"] = await trans_service.translate_async(quiz_data.get("question", ""), "eng_Latn", response_lang)
                    quiz_data["explanation"] = await trans_service.translate_async(quiz_data.get("explanation", ""), "eng_Latn", response_lang)
                    if quiz_data.get("options"):
                        new_options = []
                        for opt in quiz_data["options"]:
                            new_options.append(await trans_service.translate_async(opt, "eng_Latn", response_lang))
                        quiz_data["options"] = new_options
                except Exception as e:
                    logger.error(f"Translation failed for quiz: {e}")

            return quiz_data
    except json.JSONDecodeError:
        pass

    return {"question": response, "options": [], "correct_answer": "", "explanation": ""}


@router.post("/quiz/evaluate")
async def evaluate_answer(req: QuizEvaluateRequest, db: AsyncSession = Depends(get_db)):
    """Evaluate a student's quiz answer and update adaptive model."""
    result = await db.execute(select(Student).where(Student.id == req.student_id))
    student = result.scalar_one_or_none()
    if not student:
        return {"error": "Student not found"}

    lang_service = get_language_service()
    trans_service = get_translation_service()

    detection = await run_in_threadpool(lang_service.detect, req.student_answer)
    detected_lang = detection.language

    response_lang = student.preferred_language
    if response_lang == "auto":
        response_lang = detected_lang

    english_answer = req.student_answer
    if detected_lang != "eng_Latn":
        try:
            english_answer = await trans_service.translate_async(req.student_answer, detected_lang, "eng_Latn")
        except Exception:
            pass

    # Translate question and correct answer back to English for the LLM prompt
    english_question = req.question
    english_correct_answer = req.correct_answer
    if response_lang != "eng_Latn" and response_lang != "auto":
        # The question and correct_answer were previously translated to response_lang
        try:
            english_question = await trans_service.translate_async(req.question, response_lang, "eng_Latn")
            english_correct_answer = await trans_service.translate_async(req.correct_answer, response_lang, "eng_Latn")
        except Exception:
            pass
    elif response_lang == "auto" and detected_lang != "eng_Latn":
        try:
            english_question = await trans_service.translate_async(req.question, detected_lang, "eng_Latn")
            english_correct_answer = await trans_service.translate_async(req.correct_answer, detected_lang, "eng_Latn")
        except Exception:
            pass

    # Check correctness
    is_correct = english_answer.strip().upper() == english_correct_answer.strip().upper() or req.student_answer.strip().upper() == req.correct_answer.strip().upper()

    # Get feedback from LLM
    system, prompt, _ = build_prompt(
        query=english_answer,
        intent="submit_answer",
        difficulty=student.current_difficulty,
        rag_context="",
        history=[],
        question=english_question,
        correct_answer=english_correct_answer,
    )
    llm = get_llm_service()
    feedback = await llm.generate(prompt, system=system)

    if response_lang != "eng_Latn":
        try:
            feedback = await trans_service.translate_async(feedback, "eng_Latn", response_lang)
        except Exception as e:
            logger.error(f"Translation failed for feedback: {e}")

    # Log attempt
    attempt = QuizAttempt(
        student_id=student.id,
        topic=req.topic,
        question=req.question,
        student_answer=req.student_answer,
        correct_answer=req.correct_answer,
        is_correct=is_correct,
        difficulty=student.current_difficulty,
    )
    db.add(attempt)

    # Update adaptive model
    adaptive = get_adaptive_service()
    await adaptive.update_difficulty(db, student, is_correct, topic=req.topic)

    return {
        "is_correct": is_correct,
        "feedback": feedback,
        "new_difficulty": student.current_difficulty,
    }
