"""Flashcard generation service using active recall principles."""

import json
from typing import List
from app.db.vector_store import get_vector_store
from app.models import Citation, Flashcard, FlashcardResponse
from app.prompts.flashcard_prompt import FLASHCARD_SYSTEM_INSTRUCTION, build_flashcard_prompt
from app.services.llm import get_llm_provider
from app.services.quiz_service import _extract_json_block


def generate_flashcards(doc_ids: List[str], num_cards: int = 10) -> FlashcardResponse:
    """Generate study flashcards from the specified documents.

    Args:
        doc_ids: List of document IDs to source flashcards from.
        num_cards: Number of flashcards to generate.

    Returns:
        FlashcardResponse containing list of Flashcard items.

    Raises:
        ValueError: If no content is found for the given documents.
    """
    vector_store = get_vector_store()
    chunks = vector_store.get_chunks_by_docs(doc_ids)

    if not chunks:
        if vector_store.count() == 0:
            raise ValueError("No study materials found. Please upload documents first.")
        raise ValueError(f"No content found for document IDs: {doc_ids}")

    context_blocks: List[str] = []
    total_len = 0
    for chunk in chunks:
        t = chunk.get("text", "")
        meta = chunk.get("metadata", {})
        header = f"[{meta.get('filename', 'doc')}, Page {meta.get('page', 1)}, Section: {meta.get('section', 'General')}]"
        block = f"{header}\n{t}"
        if total_len + len(block) > 12000:
            break
        context_blocks.append(block)
        total_len += len(block)

    context_str = "\n\n".join(context_blocks)
    prompt = build_flashcard_prompt(context=context_str, num_cards=num_cards)

    llm = get_llm_provider()
    raw_response = llm.generate(prompt=prompt, system_instruction=FLASHCARD_SYSTEM_INSTRUCTION)
    json_str = _extract_json_block(raw_response)

    parsed_cards: List[Flashcard] = []
    try:
        data = json.loads(json_str)
        if isinstance(data, list):
            for item in data:
                src_data = item.get("source", {})
                source = Citation(
                    filename=str(src_data.get("filename", "Study Notes")),
                    page=src_data.get("page"),
                    section=src_data.get("section"),
                    text_excerpt=str(src_data.get("text_excerpt", "")),
                )
                parsed_cards.append(Flashcard(
                    front=str(item.get("front", "Concept")),
                    back=str(item.get("back", "Definition")),
                    source=source,
                ))
    except (json.JSONDecodeError, TypeError, KeyError):
        pass

    # Fallback if LLM produced non-JSON or NoneProvider was active
    if not parsed_cards:
        for i, chunk in enumerate(chunks[:num_cards]):
            filename = chunk.get("metadata", {}).get("filename", "Notes")
            section = chunk.get("metadata", {}).get("section", f"Section {i+1}")
            page = chunk.get("metadata", {}).get("page", 1)
            text = chunk.get("text", "")
            first_sentence = text.split(". ")[0].strip()
            parsed_cards.append(Flashcard(
                front=f"Key concept from {section} ({filename})",
                back=first_sentence if first_sentence else text[:100],
                source=Citation(
                    filename=filename,
                    page=page,
                    section=section,
                    text_excerpt=text[:150],
                ),
            ))

    return FlashcardResponse(flashcards=parsed_cards[:num_cards])

