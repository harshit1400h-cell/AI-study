"""Prompt definitions and helpers for RAG question answering."""

QA_SYSTEM_INSTRUCTION = (
    "You are an AI Study Assistant. Answer questions accurately and exclusively using "
    "the supplied retrieved passages from the user's study materials. If the answer cannot "
    "be found or deduced strictly from the context, state clearly: "
    "'I cannot find the answer to this question in your uploaded study materials.' "
    "Do not hallucinate, speculate, or incorporate external facts. "
    "Always cite the source document, page, and section for key facts using [Doc: <filename>, Page: <page>, Section: <section>]."
)

MODE_INSTRUCTIONS = {
    "beginner": (
        "Target Audience: Beginner.\n"
        "Tone and Style: Use simple, accessible language. Explain core concepts step-by-step "
        "with intuitive analogies. Avoid excessive technical jargon unless clearly defined."
    ),
    "intermediate": (
        "Target Audience: Intermediate / Undergraduate.\n"
        "Tone and Style: Provide a well-structured, thorough, and balanced academic explanation. "
        "Include relevant terminology, explanations of mechanisms, and practical examples."
    ),
    "exam": (
        "Target Audience: Exam Preparation.\n"
        "Tone and Style: Extremely concise, direct, and focused on high-yield exam points. "
        "Use bullet points, bold key terms, list essential formulas/definitions, and emphasize common exam traps."
    ),
}


def build_qa_prompt(question: str, context: str, mode: str = "intermediate") -> str:
    """Build the formatted QA user prompt with context, question, and mode instructions.

    Args:
        question: User query.
        context: Concatenated text of retrieved chunks with citation headers.
        mode: Study mode ('beginner', 'intermediate', or 'exam').

    Returns:
        Formatted prompt string.
    """
    mode_guidance = MODE_INSTRUCTIONS.get(mode, MODE_INSTRUCTIONS["intermediate"])

    return f"""Context passages from uploaded study materials:
----------------------------------------
{context}
----------------------------------------

{mode_guidance}

User Question: {question}

Instructions:
1. Answer the question thoroughly based ONLY on the context passages above.
2. If the context does not contain the answer, say "I cannot find the answer to this question in your uploaded study materials."
3. Include inline citations wherever relevant in the format [Doc: <filename>, Page: <page>].
"""

