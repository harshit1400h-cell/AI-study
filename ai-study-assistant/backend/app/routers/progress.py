"""FastAPI router for tracking learner progress, quiz history, and statistics."""

from fastapi import APIRouter
from app.db.document_store import get_document_store
from app.models import StudyProgress

router = APIRouter(prefix="/api/progress", tags=["progress"])


@router.get("", response_model=StudyProgress)
def get_study_progress() -> StudyProgress:
    """Retrieve cumulative study progress metrics including documents processed, quiz scores, and recent sessions."""
    doc_store = get_document_store()
    return doc_store.get_progress()

