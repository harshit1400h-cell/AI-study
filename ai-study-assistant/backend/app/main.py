"""Main FastAPI application entry point for AI Study Assistant."""

import os
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator, Dict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import uvicorn

from app.config import get_settings
from app.db.document_store import get_document_store
from app.db.vector_store import get_vector_store
from app.routers import documents, progress, qa, quiz


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context manager for startup and shutdown procedures."""
    settings = get_settings()

    # Ensure required persistence directories exist
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)

    # Pre-initialize singletons
    get_document_store()
    get_vector_store()

    yield


app = FastAPI(
    title="AI Study Assistant API",
    description="Intelligent RAG-powered study assistant for document Q&A, active recall quizzes, flashcards, and revision notes.",
    version="1.0.0",
    lifespan=lifespan,
)

settings = get_settings()

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all API routers
app.include_router(documents.router)
app.include_router(qa.router)
app.include_router(quiz.router)
app.include_router(progress.router)


@app.get("/", include_in_schema=False)
def root_redirect() -> RedirectResponse:
    """Redirect root access directly to interactive Swagger API documentation."""
    return RedirectResponse(url="/docs")


@app.get("/api/health")
def health_check() -> Dict[str, Any]:
    """Health check endpoint to verify backend status, storage, and configured LLM provider."""
    cfg = get_settings()
    doc_store = get_document_store()
    vector_store = get_vector_store()

    return {
        "status": "healthy",
        "llm_provider": cfg.LLM_PROVIDER,
        "embedding_model": cfg.EMBEDDING_MODEL,
        "total_documents": len(doc_store.list_documents()),
        "total_chunks": vector_store.count(),
    }


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=True,
    )

