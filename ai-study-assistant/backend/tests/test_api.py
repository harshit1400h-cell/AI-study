"""Integration tests for all FastAPI endpoints using TestClient."""

import io
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Verify health check returns healthy status and metadata."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "llm_provider" in data
    assert "total_documents" in data


def test_root_redirect():
    """Root URL should redirect to /docs."""
    response = client.get("/", follow_redirects=False)
    assert response.status_code in (307, 308)
    assert "/docs" in response.headers["location"]


def test_document_lifecycle_and_features():
    """Test full document lifecycle: upload, retrieve, query, quiz, flashcards, summary, delete."""
    # 1. Upload a sample study document
    sample_content = (
        "Cellular Respiration Overview\n\n"
        "Cellular respiration is a set of metabolic reactions that convert chemical energy from nutrients into ATP.\n"
        "The three main stages are Glycolysis, the Citric Acid Cycle (Krebs cycle), and Oxidative Phosphorylation.\n\n"
        "Glycolysis occurs in the cytoplasm and breaks glucose down into pyruvate without requiring oxygen.\n"
        "The Citric Acid Cycle occurs in the mitochondrial matrix and generates electron carriers NADH and FADH2.\n"
        "Oxidative Phosphorylation occurs across the inner mitochondrial membrane and produces the vast majority of ATP."
    )

    file_bytes = io.BytesIO(sample_content.encode("utf-8"))
    files = {"files": ("cellular_respiration.txt", file_bytes, "text/plain")}

    upload_res = client.post("/api/documents/upload", files=files)
    assert upload_res.status_code == 200
    upload_data = upload_res.json()
    assert len(upload_data) == 1
    doc_id = upload_data[0]["doc_id"]
    assert upload_data[0]["status"] == "ready"
    assert doc_id != ""

    try:
        # 2. Get document metadata
        get_doc_res = client.get(f"/api/documents/{doc_id}")
        assert get_doc_res.status_code == 200
        doc_info = get_doc_res.json()
        assert doc_info["filename"] == "cellular_respiration.txt"
        assert doc_info["status"] == "ready"
        assert doc_info["chunk_count"] > 0

        # 3. List documents
        list_res = client.get("/api/documents")
        assert list_res.status_code == 200
        docs_list = list_res.json()
        assert any(d["id"] == doc_id for d in docs_list)

        # 4. Get chunks
        chunks_res = client.get(f"/api/documents/{doc_id}/chunks")
        assert chunks_res.status_code == 200
        chunks = chunks_res.json()
        assert len(chunks) > 0
        assert "text" in chunks[0]

        # 5. Q&A Ask
        qa_res = client.post(
            "/api/qa/ask",
            json={
                "question": "Where does glycolysis take place?",
                "doc_ids": [doc_id],
                "mode": "intermediate",
            },
        )
        assert qa_res.status_code == 200
        qa_data = qa_res.json()
        assert "answer" in qa_data
        assert "citations" in qa_data
        assert len(qa_data["retrieved_chunks"]) > 0

        # 6. Generate Quiz
        quiz_res = client.post(
            "/api/quiz/generate",
            json={
                "doc_ids": [doc_id],
                "num_questions": 2,
                "question_types": ["mcq"],
            },
        )
        assert quiz_res.status_code == 200
        quiz_data = quiz_res.json()
        assert "questions" in quiz_data
        assert len(quiz_data["questions"]) > 0

        # 7. Grade Quiz
        first_q = quiz_data["questions"][0]
        grade_res = client.post(
            "/api/quiz/grade",
            json={
                "answers": {0: first_q["correct_answer"]},
                "quiz": quiz_data,
            },
        )
        assert grade_res.status_code == 200
        grade_data = grade_res.json()
        assert grade_data["score"] >= 1
        assert "percentage" in grade_data

        # 8. Flashcards
        flash_res = client.post(
            "/api/flashcards/generate",
            json={"doc_ids": [doc_id], "num_cards": 2},
        )
        assert flash_res.status_code == 200
        flash_data = flash_res.json()
        assert "flashcards" in flash_data
        assert len(flash_data["flashcards"]) > 0

        # 9. Summary
        sum_res = client.post(
            "/api/summary/generate",
            json={"doc_ids": [doc_id]},
        )
        assert sum_res.status_code == 200
        sum_data = sum_res.json()
        assert "summary" in sum_data
        assert len(sum_data["key_concepts"]) > 0

        # 10. Study Progress
        prog_res = client.get("/api/progress")
        assert prog_res.status_code == 200
        prog_data = prog_res.json()
        assert prog_data["total_documents"] >= 1
        assert prog_data["total_quizzes_taken"] >= 1

    finally:
        # 11. Delete document
        del_res = client.delete(f"/api/documents/{doc_id}")
        assert del_res.status_code == 200

        # Verify 404 after deletion
        not_found_res = client.get(f"/api/documents/{doc_id}")
        assert not_found_res.status_code == 404

