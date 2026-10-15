"""Document processing pipeline: parsing, recursive chunking, and vector storage."""

import os
from typing import Any, Dict, List, Optional
import tiktoken

from app.db.document_store import get_document_store
from app.db.vector_store import get_vector_store
from app.models import DocumentInfo
from app.services.docx_parser import parse_docx
from app.services.pdf_parser import parse_pdf
from app.services.pptx_parser import parse_pptx
from app.services.txt_parser import parse_txt

# Try loading tiktoken tokenizer for token-aware chunking
try:
    _TOKENIZER = tiktoken.get_encoding("cl100k_base")
except Exception:
    _TOKENIZER = None


def count_tokens(text: str) -> int:
    """Return token count of text using tiktoken or approximation."""
    if _TOKENIZER:
        try:
            return len(_TOKENIZER.encode(text))
        except Exception:
            pass
    # Rough approximation: 1 token ~ 4 characters
    return max(1, len(text) // 4)


def split_text_recursive(
    text: str,
    chunk_size_chars: int = 2800,
    chunk_overlap_chars: int = 400,
    separators: Optional[List[str]] = None,
) -> List[str]:
    """Recursively split text into chunks respecting natural boundary separators.

    Args:
        text: Input string to split.
        chunk_size_chars: Maximum character length per chunk (~700 tokens).
        chunk_overlap_chars: Overlap character length (~100 tokens).
        separators: Hierarchical list of separators to split on.

    Returns:
        List of chunk strings.
    """
    if separators is None:
        separators = ["\n\n", "\n", ". ", " ", ""]

    text = text.strip()
    if not text:
        return []

    if len(text) <= chunk_size_chars:
        return [text]

    # Find the highest-level separator present in the text
    chosen_sep = separators[-1]
    next_separators: List[str] = []
    for i, sep in enumerate(separators):
        if sep == "" or sep in text:
            chosen_sep = sep
            next_separators = separators[i + 1:]
            break

    # Split using chosen separator
    if chosen_sep:
        splits = text.split(chosen_sep)
    else:
        splits = list(text)

    final_chunks: List[str] = []
    current_chunk: List[str] = []
    current_len = 0

    for split in splits:
        split_len = len(split) + (len(chosen_sep) if current_chunk else 0)

        # If an individual split is larger than chunk_size, recursively split it
        if len(split) > chunk_size_chars and next_separators:
            if current_chunk:
                joined = chosen_sep.join(current_chunk).strip()
                if joined:
                    final_chunks.append(joined)
                current_chunk = []
                current_len = 0

            sub_chunks = split_text_recursive(
                split,
                chunk_size_chars=chunk_size_chars,
                chunk_overlap_chars=chunk_overlap_chars,
                separators=next_separators,
            )
            final_chunks.extend(sub_chunks)
            continue

        if current_len + split_len > chunk_size_chars and current_chunk:
            joined = chosen_sep.join(current_chunk).strip()
            if joined:
                final_chunks.append(joined)

            # Build overlapping start for the next chunk
            overlap_items: List[str] = []
            overlap_len = 0
            for item in reversed(current_chunk):
                item_len = len(item) + len(chosen_sep)
                if overlap_len + item_len <= chunk_overlap_chars:
                    overlap_items.insert(0, item)
                    overlap_len += item_len
                else:
                    break

            current_chunk = overlap_items
            current_len = sum(len(x) for x in current_chunk) + max(0, len(current_chunk) - 1) * len(chosen_sep)

        current_chunk.append(split)
        current_len += split_len

    if current_chunk:
        joined = chosen_sep.join(current_chunk).strip()
        if joined:
            final_chunks.append(joined)

    return [c for c in final_chunks if c.strip()]


def process_document(file_path: str, doc_id: str, filename: str) -> DocumentInfo:
    """Orchestrate parsing, chunking, and embedding for an uploaded document.

    Args:
        file_path: Path to the stored document.
        doc_id: Unique UUID assigned to the document.
        filename: Original file name.

    Returns:
        Updated DocumentInfo instance.

    Raises:
        ValueError: If file format is unsupported or parsing fails.
    """
    doc_store = get_document_store()
    vector_store = get_vector_store()

    ext = os.path.splitext(filename)[1].lower().lstrip(".")
    if ext not in ("pdf", "docx", "pptx", "txt", "md"):
        doc_store.update_status(doc_id, "error")
        raise ValueError(f"Unsupported file format: .{ext}")

    try:
        # 1. Parse document into section/page elements
        if ext == "pdf":
            parsed_elements = parse_pdf(file_path)
        elif ext == "docx":
            parsed_elements = parse_docx(file_path)
        elif ext == "pptx":
            parsed_elements = parse_pptx(file_path)
        else:  # txt, md
            parsed_elements = parse_txt(file_path)

        # Determine page count
        max_page = 1
        for elem in parsed_elements:
            page_val = elem.get("metadata", {}).get("page")
            if page_val and isinstance(page_val, int) and page_val > max_page:
                max_page = page_val

        # 2. Chunk elements into optimal vector size (~700 tokens / 2800 chars)
        all_chunks: List[Dict[str, Any]] = []
        global_chunk_idx = 0

        for elem in parsed_elements:
            elem_text = elem.get("text", "").strip()
            elem_meta = elem.get("metadata", {})
            if not elem_text:
                continue

            sub_chunks = split_text_recursive(
                elem_text,
                chunk_size_chars=2800,
                chunk_overlap_chars=400,
            )

            for sub in sub_chunks:
                chunk_metadata = {
                    "doc_id": doc_id,
                    "filename": filename,
                    "page": elem_meta.get("page"),
                    "section": elem_meta.get("section") or f"Section {global_chunk_idx + 1}",
                    "chunk_index": global_chunk_idx,
                }
                all_chunks.append({
                    "text": sub,
                    "metadata": chunk_metadata,
                })
                global_chunk_idx += 1

        # 3. Store in vector database
        added_count = vector_store.add_chunks(doc_id=doc_id, chunks=all_chunks)

        # 4. Update document metadata store
        doc_store.update_status(doc_id=doc_id, status="ready", chunk_count=added_count)

        doc_info = doc_store.get_document(doc_id)
        if doc_info is None:
            doc_info = DocumentInfo(
                id=doc_id,
                filename=filename,
                file_type=ext,
                page_count=max_page,
                chunk_count=added_count,
                status="ready",
            )
        else:
            doc_info.page_count = max_page
            doc_info.chunk_count = added_count
            doc_info.status = "ready"
            doc_store.add_document(doc_info)

        return doc_info

    except Exception as e:
        doc_store.update_status(doc_id, "error")
        raise e

