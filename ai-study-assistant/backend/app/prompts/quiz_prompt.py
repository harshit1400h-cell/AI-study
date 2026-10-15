"""Prompt definitions and helpers for generating structured study quizzes."""

from typing import List


QUIZ_SYSTEM_INSTRUCTION = (
    "You are an expert academic evaluator. Your task is to generate rigorous, high-quality "
    "quiz questions strictly derived from the provided study material. "
    "You must output ONLY valid, parseable JSON conforming exactly to the requested schema, "
    "with no additional commentary, conversational filler, or markdown wrappers unless inside a standard ```json block."
)


def build_quiz_prompt(context: str, num_questions: int, question_types: List[str]) -> str:
    """Build user prompt requesting a JSON-formatted quiz based on study materials.

    Args:
        context: Context text extracted from selected documents.
        num_questions: Number of questions to generate.
        question_types: List of question formats (e.g., ['mcq', 'true_false', 'short_answer']).

    Returns:
        Structured prompt string.
    """
    types_str = ", ".join(question_types)

    return f"""Based exclusively on the following study materials, generate exactly {num_questions} quiz questions.
Allowed question types: {types_str}.

Study Materials:
----------------------------------------
{context}
----------------------------------------

Return a JSON array of objects, where each object follows this exact structure:
[
  {{
    "question": "Question text here",
    "question_type": "mcq",
    "options": {{
      "A": "Option A text",
      "B": "Option B text",
      "C": "Option C text",
      "D": "Option D text"
    }},
    "correct_answer": "A",
    "explanation": "Detailed explanation why A is correct and others are incorrect.",
    "source": {{
      "filename": "filename from passage",
      "page": 1,
      "section": "section name or null",
      "text_excerpt": "Direct supporting quote from passage"
    }}
  }}
]

Notes for question types:
- For 'mcq', 'options' MUST be a dictionary with keys "A", "B", "C", "D" and 'correct_answer' should be "A", "B", "C", or "D".
- For 'true_false', 'options' should be {{"True": "True", "False": "False"}} and 'correct_answer' should be "True" or "False".
- For 'short_answer', 'options' should be null, and 'correct_answer' should be a concise model answer phrase or sentence.

Return ONLY the JSON array.
"""

