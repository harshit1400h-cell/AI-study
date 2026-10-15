"""Structured revision notes and study summary generation service."""

import json
from typing import List
from app.db.vector_store import get_vector_store
from app.models import Citation, SummaryResponse
from app.prompts.summary_prompt import SUMMARY_SYSTEM_INSTRUCTION, build_summary_prompt
from app.services.llm import get_llm_provider
from app.services.quiz_service import _extract_json_block


def generate_summary(doc_ids: List[str]) -> SummaryResponse:
    """Generate structured revision notes and key concepts from selected documents.

    Args:
        doc_ids: List of document IDs to summarize.

    Returns:
        SummaryResponse containing Markdown notes, key concepts, and citations.

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
    citations_collected: List[Citation] = []

    for chunk in chunks:
        t = chunk.get("text", "")
        meta = chunk.get("metadata", {})
        header = f"[{meta.get('filename', 'doc')}, Page {meta.get('page', 1)}, Section: {meta.get('section', 'General')}]"
        block = f"{header}\n{t}"

        if len(citations_collected) < 5:
            citations_collected.append(Citation(
                filename=str(meta.get("filename", "Doc")),
                page=meta.get("page"),
                section=meta.get("section"),
                text_excerpt=t[:180].replace("\n", " ").strip() + "...",
            ))

        if total_len + len(block) > 12000:
            break
        context_blocks.append(block)
        total_len += len(block)

    context_str = "\n\n".join(context_blocks)
    prompt = build_summary_prompt(context=context_str)

    llm = get_llm_provider()
    raw_response = llm.generate(prompt=prompt, system_instruction=SUMMARY_SYSTEM_INSTRUCTION)
    json_str = _extract_json_block(raw_response)

    summary_text = ""
    key_concepts: List[str] = []
    citations: List[Citation] = []

    try:
        data = json.loads(json_str)
        if isinstance(data, dict):
            summary_text = str(data.get("summary", ""))
            raw_concepts = data.get("key_concepts", [])
            if isinstance(raw_concepts, list):
                key_concepts = [str(c) for c in raw_concepts]

            raw_cites = data.get("citations", [])
            if isinstance(raw_cites, list):
                for c in raw_cites:
                    citations.append(Citation(
                        filename=str(c.get("filename", "Document")),
                        page=c.get("page"),
                        section=c.get("section"),
                        text_excerpt=str(c.get("text_excerpt", "")),
                    ))
    except (json.JSONDecodeError, TypeError, KeyError):
        pass

    # Fallback if LLM output was raw text or parsing failed
    if not summary_text:
        if raw_response and not raw_response.startswith("{"):
            summary_text = raw_response
        else:
            summary_text = f"## Study Notes Summary\n\nThis material covers key concepts from {len(chunks)} sections across your uploaded documents.\n\n"
            for i, chunk in enumerate(chunks[:5]):
                sec = chunk.get("metadata", {}).get("section", f"Topic {i+1}")
                summary_text += f"- **{sec}**: {chunk.get('text', '')[:120]}...\n"

    if not key_concepts:
        key_concepts = [
            chunk.get("metadata", {}).get("section", f"Concept {i+1}")
            for i, chunk in enumerate(chunks[:5])
        ]

    if not citations:
        citations = citations_collected

    return SummaryResponse(
        summary=summary_text,
        key_concepts=key_concepts,
        citations=citations,
    )

