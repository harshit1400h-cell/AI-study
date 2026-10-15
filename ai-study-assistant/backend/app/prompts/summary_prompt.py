"""Prompt definitions and helpers for generating structured study summaries."""

SUMMARY_SYSTEM_INSTRUCTION = (
    "You are an expert academic tutor synthesizing high-yield study summaries and revision notes. "
    "Output strictly valid JSON matching the specified schema based only on the provided materials."
)


def build_summary_prompt(context: str) -> str:
    """Build user prompt requesting a structured JSON study summary.

    Args:
        context: Context text extracted from selected documents.

    Returns:
        Structured prompt string.
    """
    return f"""Synthesize comprehensive revision notes and key concepts based exclusively on the following study materials:

Study Materials:
----------------------------------------
{context}
----------------------------------------

Return a JSON object conforming strictly to this format:
{{
  "summary": "Detailed revision notes formatted in clean Markdown with headings (##), bullet points, definitions, mechanisms, and formulas.",
  "key_concepts": [
    "Key concept 1: Core definition and significance",
    "Key concept 2: Core definition and significance"
  ],
  "citations": [
    {{
      "filename": "source document filename",
      "page": 1,
      "section": "section heading or null",
      "text_excerpt": "Direct supporting quote"
    }}
  ]
}}

Return ONLY the JSON object.
"""

