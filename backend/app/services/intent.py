"""
Intent Classification — Classifies student input intent via LLM.
"""

import logging
from typing import Optional

logger = logging.getLogger("indic-chat.intent")

# Supported intents
INTENTS = {
    "ask_question": "Student is asking a conceptual question about a topic",
    "request_explanation": "Student wants a detailed explanation or step-by-step solution",
    "request_quiz": "Student wants a quiz or practice questions",
    "submit_answer": "Student is answering a quiz question",
    "greeting": "Student is greeting or casual conversation",
    "off_topic": "Query is unrelated to academics",
}

INTENT_PROMPT = """Classify the student's message into exactly one intent.
Respond with ONLY the intent label, nothing else.

Intents:
- ask_question: asking about a concept or topic
- request_explanation: wants a detailed explanation or step-by-step solution
- request_quiz: wants quiz questions or practice problems
- submit_answer: answering or responding to a quiz question
- greeting: saying hello, thank you, or casual chat
- off_topic: unrelated to academics

Student message: {message}

Intent:"""


class IntentService:
    """Classify student intents using the LLM."""

    async def classify(self, message: str) -> str:
        """
        Classify the intent of a student message.
        Returns one of the INTENTS keys.
        """
        # Quick heuristics first (avoid LLM call for obvious cases)
        lower = message.lower().strip()

        if any(g in lower for g in ["hello", "hi", "hey", "namaste", "thanks", "thank you"]):
            return "greeting"

        if any(q in lower for q in ["quiz", "test me", "practice", "questions give"]):
            return "request_quiz"

        if any(e in lower for e in ["explain", "step by step", "how to solve", "show me how"]):
            return "request_explanation"

        # For more nuanced cases, use LLM
        try:
            from app.services.llm import get_llm_service
            llm = get_llm_service()
            result = await llm.generate(
                INTENT_PROMPT.format(message=message[:200]),
                max_tokens=20,
            )
            intent = result.strip().lower().replace(" ", "_")

            if intent in INTENTS:
                return intent
        except Exception as e:
            logger.warning(f"Intent classification failed: {e}")

        return "ask_question"  # Default


# Singleton
_intent_service: Optional[IntentService] = None


def get_intent_service() -> IntentService:
    global _intent_service
    if _intent_service is None:
        _intent_service = IntentService()
    return _intent_service
