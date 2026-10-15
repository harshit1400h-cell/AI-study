"""Unit tests for recursive text chunking and token counting."""

from app.services.document_processor import count_tokens, split_text_recursive


def test_split_empty_text():
    """Empty or whitespace-only text should return an empty list."""
    assert split_text_recursive("") == []
    assert split_text_recursive("   \n\n   ") == []


def test_split_short_text():
    """Text shorter than chunk size should return a single intact chunk."""
    text = "Photosynthesis converts light into chemical energy."
    chunks = split_text_recursive(text, chunk_size_chars=200, chunk_overlap_chars=20)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_split_by_paragraphs():
    """Text with double newlines should split across paragraphs when exceeding size."""
    para1 = "Paragraph 1: " + ("Data " * 30).strip()
    para2 = "Paragraph 2: " + ("Information " * 30).strip()
    para3 = "Paragraph 3: " + ("Knowledge " * 30).strip()
    full_text = f"{para1}\n\n{para2}\n\n{para3}"

    chunks = split_text_recursive(full_text, chunk_size_chars=200, chunk_overlap_chars=30)
    assert len(chunks) >= 2
    # Ensure all original content is preserved across chunks
    combined = " ".join(chunks)
    assert "Paragraph 1" in combined
    assert "Paragraph 2" in combined
    assert "Paragraph 3" in combined


def test_chunk_overlap():
    """Adjacent chunks should exhibit overlap."""
    sentences = [f"Sentence {i} explains important concept {i}." for i in range(20)]
    full_text = " ".join(sentences)

    chunks = split_text_recursive(full_text, chunk_size_chars=120, chunk_overlap_chars=40)
    assert len(chunks) > 1
    # Check that adjacent chunks have overlapping words
    for i in range(len(chunks) - 1):
        words1 = set(chunks[i].split())
        words2 = set(chunks[i + 1].split())
        common_words = words1.intersection(words2)
        assert len(common_words) > 0


def test_count_tokens():
    """Token counting should return positive integers proportional to text length."""
    short = "Hello world"
    long_text = "Hello world, this is a longer text that contains several words and sentences."
    assert count_tokens(short) > 0
    assert count_tokens(long_text) > count_tokens(short)

