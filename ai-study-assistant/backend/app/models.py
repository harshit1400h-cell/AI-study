"""Data models for AI Study Assistant using Pydantic v2."""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class DocumentInfo(BaseModel):
    """Document metadata model."""

    id: str = Field(description="Unique document ID (UUID)")
    filename: str = Field(description="Original uploaded file name")
    file_type: str = Field(description="File extension without dot, e.g., pdf, docx, pptx, txt")
    page_count: int = Field(default=0, description="Total pages/slides or 1 for text documents")
    chunk_count: int = Field(default=0, description="Number of vectorized chunks")
    uploaded_at: str = Field(
        default_factory=lambda: datetime.utcnow().isoformat(),
        description="ISO timestamp of upload",
    )
    status: Literal["processing", "ready", "error"] = Field(
        default="processing",
        description="Current processing status",
    )


class ChunkMetadata(BaseModel):
    """Metadata attached to an embedded text chunk."""

    doc_id: str = Field(description="Associated document ID")
    filename: str = Field(description="Associated document filename")
    page: Optional[int] = Field(default=None, description="Page or slide number if applicable")
    section: Optional[str] = Field(default=None, description="Section heading or title if available")
    chunk_index: int = Field(description="Index of this chunk within the document")


class Citation(BaseModel):
    """Source reference for generated answers or questions."""

    filename: str = Field(description="Referenced document filename")
    page: Optional[int] = Field(default=None, description="Referenced page or slide number")
    section: Optional[str] = Field(default=None, description="Referenced section heading")
    text_excerpt: str = Field(description="Brief excerpt from source text")


class RetrievedChunk(BaseModel):
    """Retrieved chunk from vector search."""

    text: str = Field(description="Chunk content")
    metadata: ChunkMetadata = Field(description="Chunk metadata")
    relevance_score: float = Field(description="Cosine similarity / relevance score")


class QuestionRequest(BaseModel):
    """Request payload for RAG question-answering."""

    question: str = Field(description="User question to answer")
    doc_ids: Optional[List[str]] = Field(
        default=None,
        description="Optional list of doc_ids to filter the knowledge base",
    )
    mode: Literal["beginner", "intermediate", "exam"] = Field(
        default="intermediate",
        description="Answer explanation depth and style",
    )


class AnswerResponse(BaseModel):
    """Response payload for RAG question-answering."""

    answer: str = Field(description="Generated answer")
    citations: List[Citation] = Field(default_factory=list, description="Source citations")
    retrieved_chunks: List[RetrievedChunk] = Field(
        default_factory=list,
        description="List of chunks retrieved for this question",
    )


class QuizRequest(BaseModel):
    """Request payload for generating a quiz."""

    doc_ids: List[str] = Field(description="List of document IDs to base quiz on")
    num_questions: int = Field(default=5, ge=1, le=20, description="Number of questions to generate")
    question_types: List[Literal["mcq", "true_false", "short_answer"]] = Field(
        default_factory=lambda: ["mcq"],
        description="List of question types to include",
    )


class QuizQuestion(BaseModel):
    """Single question within a quiz."""

    question: str = Field(description="Question text")
    question_type: Literal["mcq", "true_false", "short_answer"] = Field(
        description="Type of question",
    )
    options: Optional[Dict[str, str]] = Field(
        default=None,
        description="Dictionary of options for MCQs (e.g. {'A': '...', 'B': '...'})",
    )
    correct_answer: str = Field(description="Correct answer string or key")
    explanation: str = Field(description="Explanation of why this answer is correct")
    source: Citation = Field(description="Source citation for the question")


class QuizResponse(BaseModel):
    """Generated quiz response."""

    questions: List[QuizQuestion] = Field(description="List of generated quiz questions")


class QuizSubmission(BaseModel):
    """Submission payload for grading a quiz."""

    answers: Dict[int, str] = Field(
        description="Mapping from 0-based question index to user answer",
    )
    quiz: Optional[QuizResponse] = Field(
        default=None,
        description="Original quiz questions for grading context if state is stateless",
    )


class QuestionResult(BaseModel):
    """Grading details for a single question."""

    question_index: int
    question: str
    user_answer: str
    correct_answer: str
    is_correct: bool
    explanation: str
    topic: Optional[str] = None


class QuizResult(BaseModel):
    """Result of grading a quiz submission."""

    score: int = Field(description="Number of correct answers")
    total: int = Field(description="Total number of graded questions")
    percentage: float = Field(description="Percentage score from 0.0 to 100.0")
    weak_topics: List[str] = Field(
        default_factory=list,
        description="Topics where the user made mistakes",
    )
    details: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Per-question grading details",
    )


class FlashcardRequest(BaseModel):
    """Request payload for generating flashcards."""

    doc_ids: List[str] = Field(description="Document IDs to generate flashcards from")
    num_cards: int = Field(default=10, ge=1, le=30, description="Number of flashcards to generate")


class Flashcard(BaseModel):
    """Single study flashcard."""

    front: str = Field(description="Question or prompt on the front of the flashcard")
    back: str = Field(description="Answer or explanation on the back of the flashcard")
    source: Citation = Field(description="Source citation for the card")


class FlashcardResponse(BaseModel):
    """Flashcard generation response."""

    flashcards: List[Flashcard] = Field(description="List of generated flashcards")


class SummaryRequest(BaseModel):
    """Request payload for generating a summary."""

    doc_ids: List[str] = Field(description="Document IDs to summarize")


class SummaryResponse(BaseModel):
    """Summary generation response."""

    summary: str = Field(description="Revision notes and structured summary")
    key_concepts: List[str] = Field(
        default_factory=list,
        description="List of key concepts and definitions",
    )
    citations: List[Citation] = Field(
        default_factory=list,
        description="Source citations referenced in the summary",
    )


class UploadResponse(BaseModel):
    """Response payload for document upload endpoint."""

    doc_id: str = Field(description="Assigned document UUID")
    filename: str = Field(description="Uploaded file name")
    status: str = Field(description="Processing status (ready, processing, error)")
    message: str = Field(description="Informative message")


class ErrorResponse(BaseModel):
    """Standard error response payload."""

    detail: str = Field(description="Detailed error message")


class StudyProgress(BaseModel):
    """Overall study progress and quiz statistics."""

    total_documents: int = Field(description="Total active documents stored")
    total_quizzes_taken: int = Field(description="Total quizzes attempted")
    average_score: float = Field(description="Average percentage score on quizzes")
    recent_sessions: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Recent quiz and study session records",
    )

