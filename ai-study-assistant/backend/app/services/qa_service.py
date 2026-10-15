"""RAG Question Answering service orchestrating vector search and LLM completion."""

from typing import List, Optional
from app.db.vector_store import get_vector_store
from app.models import AnswerResponse, ChunkMetadata, Citation, RetrievedChunk
from app.prompts.qa_prompt import QA_SYSTEM_INSTRUCTION, build_qa_prompt
from app.services.llm import get_llm_provider


def answer_question(
    question: str,
    doc_ids: Optional[List[str]] = None,
    mode: str = "intermediate",
) -> AnswerResponse:
    """Answer a user study question using semantic search and RAG synthesis.

    Args:
        question: User query string.
        doc_ids: Optional document IDs to restrict search to.
        mode: Explanation style ('beginner', 'intermediate', or 'exam').

    Returns:
        AnswerResponse containing generated text, citations, and retrieved chunks.
    """
    vector_store = get_vector_store()
    raw_results = vector_store.search(query=question, k=5, doc_ids=doc_ids)

    if not raw_results:
        return AnswerResponse(
            answer="I cannot find the answer to this question in your uploaded study materials. Please upload relevant files or adjust your question.",
            citations=[],
            retrieved_chunks=[],
        )

    retrieved_chunks: List[RetrievedChunk] = []
    citations: List[Citation] = []
    context_blocks: List[str] = []

    for item in raw_results:
        text = item.get("text", "")
        meta = item.get("metadata", {})
        score = float(item.get("score", 0.0))

        chunk_meta = ChunkMetadata(
            doc_id=str(meta.get("doc_id", "")),
            filename=str(meta.get("filename", "Unknown")),
            page=meta.get("page"),
            section=meta.get("section"),
            chunk_index=int(meta.get("chunk_index", 0)),
        )
        retrieved_chunks.append(RetrievedChunk(
            text=text,
            metadata=chunk_meta,
            relevance_score=score,
        ))

        # Build citation entry
        excerpt = text[:200].replace("\n", " ").strip()
        citations.append(Citation(
            filename=chunk_meta.filename,
            page=chunk_meta.page,
            section=chunk_meta.section,
            text_excerpt=f"{excerpt}...",
        ))

        # Format context block for the prompt
        loc_info = f"File: {chunk_meta.filename}"
        if chunk_meta.page is not None:
            loc_info += f", Page: {chunk_meta.page}"
        if chunk_meta.section:
            loc_info += f", Section: {chunk_meta.section}"

        context_blocks.append(f"[{loc_info}]\n{text}")

    context_str = "\n\n".join(context_blocks)
    prompt = build_qa_prompt(question=question, context=context_str, mode=mode)

    llm = get_llm_provider()
    answer_text = llm.generate(prompt=prompt, system_instruction=QA_SYSTEM_INSTRUCTION)

    return AnswerResponse(
        answer=answer_text,
        citations=citations,
        retrieved_chunks=retrieved_chunks,
    )

