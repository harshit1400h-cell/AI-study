"""Plain text (.txt, .md) file parser."""

import os
from typing import Any, Dict, List


def parse_txt(file_path: str) -> List[Dict[str, Any]]:
    """Read a text file and split it into logical sections separated by double newlines.

    Args:
        file_path: Absolute or relative path to the text document.

    Returns:
        List of dictionaries with 'text' and 'metadata'.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If the file cannot be decoded.
    """
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"Text file not found: {file_path}")

    filename = os.path.basename(file_path)

    raw_content: str = ""
    for encoding in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
        try:
            with open(file_path, "r", encoding=encoding) as f:
                raw_content = f.read()
            break
        except UnicodeDecodeError:
            continue
    else:
        raise ValueError(f"Unable to decode text file {filename} with supported encodings.")

    raw_sections = [s.strip() for s in raw_content.split("\n\n") if s.strip()]

    # If document has no double newlines, treat whole content as one section
    if not raw_sections and raw_content.strip():
        raw_sections = [raw_content.strip()]

    results: List[Dict[str, Any]] = []
    for idx, sec in enumerate(raw_sections):
        # Extract first line as a potential section title if concise
        first_line = sec.split("\n")[0].strip()
        section_name = first_line[:60] if (0 < len(first_line) <= 60) else f"Section {idx + 1}"

        results.append({
            "text": sec,
            "metadata": {
                "filename": filename,
                "section": section_name,
                "section_index": idx + 1,
                "page": 1,
            },
        })

    return results

