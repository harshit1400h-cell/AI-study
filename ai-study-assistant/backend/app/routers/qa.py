"""FastAPI router for semantic RAG question answering."""

from fastapi import APIRouter, HTTPException, status
from app.models import AnswerResponse, QuestionRequest
from app.services.qa_service import answer_question

router = APIRouter(prefix="/api/qa", tags=["qa"])


@router.post("/ask", response_model=AnswerResponse)
def ask_question(request: QuestionRequest) -> AnswerResponse:
    """Answer a study question based on uploaded materials with citations and mode customization."""
    query = request.question.strip()
    if not query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question string cannot be empty.",
        )

    try:
        return answer_question(
            question=query,
            doc_ids=request.doc_ids,
            mode=request.mode,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating answer: {str(e)}",
        ) from e

