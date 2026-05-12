"""
Chat Router — Main tutoring pipeline (streaming, multilingual).
POST /api/chat: full English-pivot pipeline with SSE streaming.
"""

import json
import logging
import asyncio
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import get_db
from app.models.student import Student, Interaction
from app.services.llm import get_llm_service
from app.services.language import get_language_service
from app.services.translation import get_translation_service
from app.services.rag import get_rag_service
from app.services.intent import get_intent_service
from app.services.adaptive import get_adaptive_service
from app.prompts.templates import build_prompt

logger = logging.getLogger("indic-chat.chat")
router = APIRouter()


class ChatRequest(BaseModel):
    student_id: int
    message: str


class ChatResponse(BaseModel):
    response: str
    language_detected: str
    response_language: str
    intent: str
    topic: str | None = None
    rag_chunks_used: int = 0


@router.post("/chat")
async def chat(req: ChatRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """
    Main chat endpoint — non-streaming version.
    Full English-pivot pipeline:
    1. Detect language (IndicLID)
    2. Translate to English (IndicTrans2, if needed)
    3. Classify intent
    4. RAG retrieval (English)
    5. Build adaptive prompt
    6. LLM generation (Gemma 4 E2B)
    7. Translate response back (IndicTrans2, if needed)
    8. Log interaction
    """

    # Get student
    from sqlalchemy import select
    result = await db.execute(select(Student).where(Student.id == req.student_id))
    student = result.scalar_one_or_none()
    if not student:
        return {"error": f"Student {req.student_id} not found"}

    # 1. Language detection
    lang_service = get_language_service()
    detection = await run_in_threadpool(lang_service.detect, req.message)
    detected_lang = detection.language

    # 2. Determine response language & refine detection
    # If student has a fixed preference, use it for response.
    # Otherwise, use detected language with history fallback for low confidence.
    preferred_lang = student.preferred_language
    response_lang = preferred_lang
    
    if preferred_lang == "auto":
        logger.info(f"Auto-detection: detected={detected_lang}, confidence={detection.confidence}")
        if detection.confidence < 0.5:
            # Fallback to history for response language
            from sqlalchemy import select
            last_interaction = await db.execute(
                select(Interaction)
                .where(Interaction.student_id == student.id)
                .order_by(Interaction.timestamp.desc())
                .limit(1)
            )
            last_int = last_interaction.scalar_one_or_none()
            if last_int:
                response_lang = last_int.language_detected
                logger.info(f"Low confidence fallback: using history ({response_lang})")
            else:
                response_lang = "eng_Latn"
                logger.info("Low confidence fallback: no history, using eng_Latn")
        else:
            response_lang = detected_lang
    else:
        # User explicitly selected a language. 
        # If detection is uncertain, trust the preferred language as the input language too.
        if detection.confidence < 0.3 and detected_lang == "eng_Latn":
            detected_lang = preferred_lang
            logger.info(f"Overriding detected_lang with preferred_lang ({preferred_lang}) due to low confidence")

    # 3. Translate to English
    trans_service = get_translation_service()
    if detected_lang != "eng_Latn":
        english_query = await trans_service.translate_async(req.message, detected_lang, "eng_Latn")
    else:
        english_query = req.message

    # 4 & 5. Intent classification and RAG retrieval (Parallel)
    intent_service = get_intent_service()
    rag_service = get_rag_service()
    
    async def fetch_rag():
        try:
            return await run_in_threadpool(rag_service.retrieve, english_query)
        except Exception as e:
            logger.warning(f"RAG retrieval failed: {e}")
            return []

    intent, all_rag_chunks = await asyncio.gather(
        intent_service.classify(english_query),
        fetch_rag()
    )

    rag_chunks = []
    if intent in ("ask_question", "request_explanation", "request_quiz"):
        rag_chunks = all_rag_chunks

    # 6. Build prompt with adaptive context
    adaptive = get_adaptive_service()
    history = adaptive.history.get(student.id)
    context = adaptive.build_context(student, history, rag_chunks, intent)

    system_prompt, user_prompt, use_thinking = build_prompt(
        query=english_query,
        intent=intent,
        difficulty=student.current_difficulty,
        rag_context=context["rag_context"],
        history=history,
    )

    # 7. LLM generation
    llm = get_llm_service()
    english_response = await llm.generate(user_prompt, system=system_prompt, thinking=use_thinking)

    # 8. Translate response to student's language
    if response_lang != "eng_Latn":
        translated_response = await trans_service.translate_async(english_response, "eng_Latn", response_lang)
    else:
        translated_response = english_response

    # Update conversation history
    adaptive.history.add(student.id, "user", english_query)
    adaptive.history.add(student.id, "assistant", english_response)

    # Log interaction
    interaction = Interaction(
        student_id=student.id,
        query=req.message,
        query_english=english_query,
        response=translated_response,
        response_english=english_response,
        language_detected=detected_lang,
        response_language=response_lang,
        intent=intent,
        difficulty=student.current_difficulty,
        rag_chunks_used=len(rag_chunks),
    )
    db.add(interaction)

    return ChatResponse(
        response=translated_response,
        language_detected=detected_lang,
        response_language=response_lang,
        intent=intent,
        rag_chunks_used=len(rag_chunks),
    )


@router.post("/chat/stream")
async def chat_stream(req: ChatRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """
    Streaming chat endpoint — SSE (Server-Sent Events).
    Streams tokens as they're generated for real-time UI.
    """
    # Get student
    from sqlalchemy import select
    result = await db.execute(select(Student).where(Student.id == req.student_id))
    student = result.scalar_one_or_none()
    if not student:
        async def error_stream():
            yield f"data: {json.dumps({'error': 'Student not found'})}\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    # Language detection
    lang_service = get_language_service()
    detection = await run_in_threadpool(lang_service.detect, req.message)
    detected_lang = detection.language

    # 2. Determine response language & refine detection
    preferred_lang = student.preferred_language
    response_lang = preferred_lang

    if preferred_lang == "auto":
        logger.info(f"Auto-detection (stream): detected={detected_lang}, confidence={detection.confidence}")
        if detection.confidence < 0.5:
            last_interaction = await db.execute(
                select(Interaction)
                .where(Interaction.student_id == student.id)
                .order_by(Interaction.timestamp.desc())
                .limit(1)
            )
            last_int = last_interaction.scalar_one_or_none()
            if last_int:
                response_lang = last_int.language_detected
                logger.info(f"Low confidence fallback (stream): using history ({response_lang})")
            else:
                response_lang = "eng_Latn"
                logger.info("Low confidence fallback (stream): no history, using eng_Latn")
        else:
            response_lang = detected_lang
    else:
        # Trust preference for input detection if confidence is very low
        if detection.confidence < 0.3 and detected_lang == "eng_Latn":
            detected_lang = preferred_lang
            logger.info(f"Overriding detected_lang with preferred_lang ({preferred_lang}) in stream")

    # Translate to English
    trans_service = get_translation_service()
    if detected_lang != "eng_Latn":
        english_query = await trans_service.translate_async(req.message, detected_lang, "eng_Latn")
    else:
        english_query = req.message

    # Intent + RAG (Parallel)
    intent_service = get_intent_service()
    rag_service = get_rag_service()
    
    async def fetch_rag_stream():
        try:
            return await run_in_threadpool(rag_service.retrieve, english_query)
        except Exception:
            return []

    intent, all_rag_chunks = await asyncio.gather(
        intent_service.classify(english_query),
        fetch_rag_stream()
    )

    rag_chunks = []
    if intent in ("ask_question", "request_explanation"):
        rag_chunks = all_rag_chunks

    # Build prompt
    adaptive = get_adaptive_service()
    history = adaptive.history.get(student.id)
    context = adaptive.build_context(student, history, rag_chunks, intent)

    system_prompt, user_prompt, use_thinking = build_prompt(
        query=english_query,
        intent=intent,
        difficulty=student.current_difficulty,
        rag_context=context["rag_context"],
        history=history,
    )

    async def event_stream():
        llm = get_llm_service()
        full_response = ""

        # Send metadata first
        yield f"data: {json.dumps({'type': 'meta', 'language': detected_lang, 'intent': intent})}\n\n"

        # Stream LLM tokens
        async for token in llm.generate_stream(user_prompt, system=system_prompt, thinking=use_thinking):
            full_response += token
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

        # After streaming, translate the full response
        final_response = full_response
        if response_lang != "eng_Latn":
            yield f"data: {json.dumps({'type': 'translating'})}\n\n"
            try:
                final_response = await trans_service.translate_async(full_response, "eng_Latn", response_lang)
            except Exception as e:
                logger.error(f"Streaming translation failed: {e}")
                final_response = full_response

        # Send the final translated response
        yield f"data: {json.dumps({'type': 'final', 'content': final_response, 'response_language': response_lang})}\n\n"

        # Update history
        adaptive.history.add(student.id, "user", english_query)
        adaptive.history.add(student.id, "assistant", full_response)

        # Log interaction
        interaction = Interaction(
            student_id=student.id,
            query=req.message,
            query_english=english_query,
            response=final_response,
            response_english=full_response,
            language_detected=detected_lang,
            response_language=response_lang,
            intent=intent,
            difficulty=student.current_difficulty,
            rag_chunks_used=len(rag_chunks),
        )
        db.add(interaction)
        try:
            await db.commit()
        except:
            pass # Generator commit could be tricky depending on session state, but safe to try.

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
