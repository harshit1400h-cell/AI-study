"""FastAPI router for quizzes, grading, flashcards, and study summaries."""

from fastapi import APIRouter, HTTPException, status
from app.models import (
    FlashcardRequest,
    FlashcardResponse,
    QuizRequest,
    QuizResponse,
    QuizResult,
    QuizSubmission,
    SummaryRequest,
    SummaryResponse,
)
from app.services.flashcard_service import generate_flashcards
from app.services.quiz_service import generate_quiz, grade_quiz
from app.services.summary_service import generate_summary

router = APIRouter(prefix="/api", tags=["study-tools"])


@router.post("/quiz/generate", response_model=QuizResponse)
def create_quiz(request: QuizRequest) -> QuizResponse:
    """Generate a structured quiz based on the specified documents."""
    try:
        return generate_quiz(
            doc_ids=request.doc_ids,
            num_questions=request.num_questions,
            question_types=request.question_types,
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        ) from ve
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating quiz: {str(e)}",
        ) from e


@router.post("/quiz/grade", response_model=QuizResult)
def evaluate_quiz(submission: QuizSubmission) -> QuizResult:
    """Grade a completed quiz submission and identify areas of weakness."""
    if not submission.quiz or not submission.quiz.questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submission must include the original 'quiz' object containing questions to grade against.",
        )

    try:
        return grade_quiz(
            quiz=submission.quiz,
            submission=submission,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error evaluating quiz: {str(e)}",
        ) from e


@router.post("/flashcards/generate", response_model=FlashcardResponse)
def create_flashcards(request: FlashcardRequest) -> FlashcardResponse:
    """Generate active recall flashcards based on the specified documents."""
    try:
        return generate_flashcards(
            doc_ids=request.doc_ids,
            num_cards=request.num_cards,
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        ) from ve
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating flashcards: {str(e)}",
        ) from e


@router.post("/summary/generate", response_model=SummaryResponse)
def create_summary(request: SummaryRequest) -> SummaryResponse:
    """Generate structured revision notes and key concepts from specified documents."""
    try:
        return generate_summary(doc_ids=request.doc_ids)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        ) from ve
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating summary: {str(e)}",
        ) from e

