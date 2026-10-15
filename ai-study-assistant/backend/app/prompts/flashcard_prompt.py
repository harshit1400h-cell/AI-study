"""Prompt definitions and helpers for generating study flashcards."""

FLASHCARD_SYSTEM_INSTRUCTION = (
    "You are an expert learning specialist focused on spaced repetition and active recall. "
    "Your task is to generate high-yield flashcards from the provided study material. "
    "Output ONLY valid, parseable JSON conforming to the requested schema."
)


def build_flashcard_prompt(context: str, num_cards: int) -> str:
    """Build user prompt requesting JSON-formatted flashcards.

    Args:
        context: Context text extracted from selected documents.
        num_cards: Number of flashcards to generate.

    Returns:
        Structured prompt string.
    """
    return f"""Based exclusively on the following study materials, generate exactly {num_cards} high-yield flashcards for active recall study.

Study Materials:
----------------------------------------
{context}
----------------------------------------

Return a JSON array of objects, where each object follows this exact structure:
[
  {{
    "front": "Concept, term, or question (clear and focused)",
    "back": "Clear definition, formula, mechanism, or explanation",
    "source": {{
      "filename": "source document filename",
      "page": 1,
      "section": "section name or null",
      "text_excerpt": "Brief verbatim quote supporting the card"
    }}
  }}
]

Guidelines:
- Each card should focus on one single discrete concept or relationship.
- The front should be a clear question or prompt.
- The back should be complete but concise.
- Return ONLY the JSON array.
"""

