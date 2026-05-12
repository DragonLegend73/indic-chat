"""
Prompt Templates — Difficulty-tuned English prompts with thinking mode support.
All prompts are in English (the LLM operates in English via the pivot architecture).
"""

SYSTEM_PROMPT = """You are an expert NCERT tutor for Class 10 students in India. You teach Mathematics, Science, and English.

Rules:
- Answer ONLY based on NCERT curriculum content
- Always respond in English.
- Use simple, clear language matching the student's difficulty level
- For math: use LaTeX notation (e.g., $x^2 + 5x + 6 = 0$, $\\sqrt{x}$, $\\frac{a}{b}$)
- Show step-by-step solutions for math/science problems
- If the question is outside NCERT Class 10 scope, say so politely
- Never make up facts. If unsure, say "I'm not sure about this, please check your textbook."
- Be encouraging and patient — you are a tutor, not a judge

Student difficulty level: {difficulty}
"""

DIFFICULTY_INSTRUCTIONS = {
    "beginner": """
The student is a beginner. Use:
- Very simple vocabulary
- Short sentences
- Real-world examples and analogies
- Break complex concepts into small steps
- Use bullet points for clarity
""",
    "intermediate": """
The student is intermediate. Use:
- Standard academic language
- Include relevant formulas and equations
- Provide moderate detail
- Connect concepts to related topics
""",
    "advanced": """
The student is advanced. Use:
- Precise technical terminology
- Detailed derivations where relevant
- Discuss edge cases and exceptions
- Encourage deeper reasoning and connections
""",
}

ASK_QUESTION_TEMPLATE = """{difficulty_instruction}

TEXTBOOK CONTEXT:
{rag_context}

CONVERSATION HISTORY:
{history}

STUDENT'S QUESTION:
{query}

Provide a clear, helpful answer grounded in the textbook context above. If the context doesn't cover the question, use your general knowledge of NCERT Class 10 curriculum."""

EXPLANATION_TEMPLATE = """{difficulty_instruction}

TEXTBOOK CONTEXT:
{rag_context}

CONVERSATION HISTORY:
{history}

STUDENT WANTS DETAILED EXPLANATION:
{query}

Provide a thorough, step-by-step explanation. For math problems, show every step. For science, explain the underlying mechanism."""

QUIZ_GENERATE_TEMPLATE = """Generate a quiz question on the topic: {topic}
Subject: {subject}
Difficulty: {difficulty}

The question should be appropriate for NCERT Class 10 students.

TEXTBOOK CONTEXT:
{rag_context}

Format your response as JSON:
{{
    "question": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correct_answer": "A",
    "explanation": "..."
}}"""

QUIZ_EVALUATE_TEMPLATE = """The student answered a quiz question.

Question: {question}
Student's answer: {student_answer}
Correct answer: {correct_answer}

Was the student correct? Provide brief feedback:
- If correct: praise them and reinforce the concept
- If incorrect: explain why the correct answer is right, gently"""

GREETING_TEMPLATE = """The student is greeting you or making casual conversation.
Respond warmly and briefly, then ask if they need help with any NCERT subject.
Student said: {query}"""


def build_prompt(
    query: str,
    intent: str,
    difficulty: str,
    rag_context: str,
    history: list[dict],
    **kwargs,
) -> tuple[str, str, bool]:
    """
    Build the system prompt and user prompt based on intent.

    Returns: (system_prompt, user_prompt, use_thinking)
    """
    difficulty_instruction = DIFFICULTY_INSTRUCTIONS.get(difficulty, DIFFICULTY_INSTRUCTIONS["beginner"])
    system = SYSTEM_PROMPT.replace("{difficulty}", difficulty)

    # Format history
    history_text = ""
    if history:
        history_lines = []
        for msg in history[-5:]:  # Last 5 messages
            role = "Student" if msg["role"] == "user" else "Tutor"
            history_lines.append(f"{role}: {msg['content']}")
        history_text = "\n".join(history_lines)
    else:
        history_text = "(No previous conversation)"

    use_thinking = False

    match intent:
        case "ask_question":
            prompt = ASK_QUESTION_TEMPLATE.format(
                difficulty_instruction=difficulty_instruction,
                rag_context=rag_context,
                history=history_text,
                query=query,
            )
            use_thinking = True  # Enable thinking for conceptual questions

        case "request_explanation":
            prompt = EXPLANATION_TEMPLATE.format(
                difficulty_instruction=difficulty_instruction,
                rag_context=rag_context,
                history=history_text,
                query=query,
            )
            use_thinking = True  # Enable thinking for explanations

        case "request_quiz":
            topic = kwargs.get("topic", "general")
            subject = kwargs.get("subject", "math")
            prompt = QUIZ_GENERATE_TEMPLATE.format(
                topic=topic,
                subject=subject,
                difficulty=difficulty,
                rag_context=rag_context,
            )
            use_thinking = False  # Fast response for quiz generation

        case "submit_answer":
            prompt = QUIZ_EVALUATE_TEMPLATE.format(
                question=kwargs.get("question", ""),
                student_answer=query,
                correct_answer=kwargs.get("correct_answer", ""),
            )
            use_thinking = False

        case "greeting":
            prompt = GREETING_TEMPLATE.format(query=query)
            use_thinking = False

        case _:
            prompt = ASK_QUESTION_TEMPLATE.format(
                difficulty_instruction=difficulty_instruction,
                rag_context=rag_context,
                history=history_text,
                query=query,
            )

    return system, prompt, use_thinking
