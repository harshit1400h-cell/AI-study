"""PDF parser using PyMuPDF (fitz)."""

import os
from typing import Any, Dict, List
import fitz  # PyMuPDF


def parse_pdf(file_path: str) -> List[Dict[str, Any]]:
    """Extract text and metadata page-by-page from a PDF file.

    Detects if the PDF is likely scanned (insufficient extracted characters per page).

    Args:
        file_path: Absolute or relative path to the PDF document.

    Returns:
        List of dictionaries with 'text' and 'metadata'.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If the PDF cannot be opened or parsed.
    """
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"PDF file not found: {file_path}")

    filename = os.path.basename(file_path)
    try:
        doc = fitz.open(file_path)
    except Exception as e:
        raise ValueError(f"Failed to open PDF file {filename}: {e}") from e

    try:
        total_pages = len(doc)
        if total_pages == 0:
            return []

        raw_pages: List[Dict[str, Any]] = []
        total_chars = 0

        for page_index in range(total_pages):
            page = doc.load_page(page_index)
            text = page.get_text("text").strip()
            total_chars += len(text)
            raw_pages.append({
                "page_number": page_index + 1,
                "text": text,
            })

        # Heuristic: if average text per page is under 50 characters, likely scanned/image-only
        avg_chars_per_page = total_chars / total_pages if total_pages > 0 else 0
        is_scanned = avg_chars_per_page < 50

        results: List[Dict[str, Any]] = []
        for item in raw_pages:
            text = item["text"]
            # Skip empty pages unless it's a scanned document where we still want a placeholder or notify
            if not text:
                continue

            results.append({
                "text": text,
                "metadata": {
                    "filename": filename,
                    "page": item["page_number"],
                    "total_pages": total_pages,
                    "is_scanned": is_scanned,
                    "section": f"Page {item['page_number']}",
                },
            })

        # If PDF was scanned and had no text at all, create an indicator entry
        if not results and is_scanned:
            results.append({
                "text": f"Scanned or image-only document ({filename}). No extractable text detected.",
                "metadata": {
                    "filename": filename,
                    "page": 1,
                    "total_pages": total_pages,
                    "is_scanned": True,
                    "section": "Page 1",
                },
            })

        return results
    finally:
        doc.close()

