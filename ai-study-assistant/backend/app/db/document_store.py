"""JSON file-based document metadata store."""

import json
import os
import threading
from functools import lru_cache
from typing import Any, Dict, List, Optional
from app.models import DocumentInfo, StudyProgress


class DocumentStore:
    """Persistent storage for document metadata and study progress using JSON."""

    def __init__(self, file_path: str = "./uploads/documents_metadata.json") -> None:
        """Initialize DocumentStore with a persistent JSON file path.

        Args:
            file_path: Relative or absolute path to JSON storage file.
        """
        self.file_path = file_path
        self._lock = threading.Lock()
        directory = os.path.dirname(self.file_path)
        if directory:
            os.makedirs(directory, exist_ok=True)
        if not os.path.exists(self.file_path):
            self._save({"documents": {}, "quiz_sessions": []})

    def _load(self) -> Dict[str, Any]:
        """Load database dictionary from the JSON file.

        Returns:
            Dictionary containing 'documents' and 'quiz_sessions'.
        """
        if not os.path.exists(self.file_path):
            return {"documents": {}, "quiz_sessions": []}
        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if not isinstance(data, dict):
                    return {"documents": {}, "quiz_sessions": []}
                data.setdefault("documents", {})
                data.setdefault("quiz_sessions", [])
                return data
        except (json.JSONDecodeError, OSError):
            return {"documents": {}, "quiz_sessions": []}

    def _save(self, data: Dict[str, Any]) -> None:
        """Atomically persist dictionary to JSON file.

        Args:
            data: Data dictionary to persist.
        """
        temp_file = f"{self.file_path}.tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(temp_file, self.file_path)

    def add_document(self, doc_info: DocumentInfo) -> None:
        """Save new document metadata to store.

        Args:
            doc_info: DocumentInfo instance.
        """
        with self._lock:
            data = self._load()
            data["documents"][doc_info.id] = doc_info.model_dump()
            self._save(data)

    def get_document(self, doc_id: str) -> Optional[DocumentInfo]:
        """Retrieve single document metadata by ID.

        Args:
            doc_id: Unique document ID.

        Returns:
            DocumentInfo if found, else None.
        """
        with self._lock:
            data = self._load()
            raw = data["documents"].get(doc_id)
            if raw:
                return DocumentInfo(**raw)
            return None

    def list_documents(self) -> List[DocumentInfo]:
        """List all documents currently in the store.

        Returns:
            List of DocumentInfo instances.
        """
        with self._lock:
            data = self._load()
            return [DocumentInfo(**item) for item in data["documents"].values()]

    def delete_document(self, doc_id: str) -> bool:
        """Delete document metadata by ID.

        Args:
            doc_id: Unique document ID.

        Returns:
            True if document existed and was deleted, False otherwise.
        """
        with self._lock:
            data = self._load()
            if doc_id in data["documents"]:
                del data["documents"][doc_id]
                self._save(data)
                return True
            return False

    def update_status(self, doc_id: str, status: str, chunk_count: int = 0) -> None:
        """Update processing status and chunk count of a document.

        Args:
            doc_id: Unique document ID.
            status: New status ('processing', 'ready', 'error').
            chunk_count: Count of generated chunks.
        """
        with self._lock:
            data = self._load()
            if doc_id in data["documents"]:
                data["documents"][doc_id]["status"] = status
                if chunk_count > 0:
                    data["documents"][doc_id]["chunk_count"] = chunk_count
                self._save(data)

    def exists(self, filename: str) -> bool:
        """Check if a file with the given filename already exists in the store.

        Args:
            filename: Original filename to check.

        Returns:
            True if file already exists with ready or processing status.
        """
        with self._lock:
            data = self._load()
            for doc in data["documents"].values():
                if doc.get("filename") == filename and doc.get("status") != "error":
                    return True
            return False

    def record_quiz_session(self, session: Dict[str, Any]) -> None:
        """Record a completed quiz session for study progress tracking.

        Args:
            session: Dictionary containing score, total, percentage, timestamp, etc.
        """
        with self._lock:
            data = self._load()
            data["quiz_sessions"].append(session)
            self._save(data)

    def get_progress(self) -> StudyProgress:
        """Calculate overall study progress metrics.

        Returns:
            StudyProgress instance.
        """
        with self._lock:
            data = self._load()
            docs = data.get("documents", {})
            total_documents = len([d for d in docs.values() if d.get("status") == "ready"])
            sessions = data.get("quiz_sessions", [])
            total_quizzes = len(sessions)
            avg_score = 0.0
            if total_quizzes > 0:
                total_pct = sum(float(s.get("percentage", 0.0)) for s in sessions)
                avg_score = round(total_pct / total_quizzes, 2)

            # Return latest 10 sessions in reverse chronological order
            recent = sessions[-10:]
            recent.reverse()

            return StudyProgress(
                total_documents=total_documents,
                total_quizzes_taken=total_quizzes,
                average_score=avg_score,
                recent_sessions=recent,
            )


@lru_cache()
def get_document_store() -> DocumentStore:
    """Return a cached singleton instance of DocumentStore."""
    return DocumentStore()

