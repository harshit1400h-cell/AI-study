"""ChromaDB vector store integration for semantic chunk storage and retrieval."""

import os
from functools import lru_cache
from typing import Any, Dict, List, Optional
import chromadb
from chromadb.utils import embedding_functions

from app.config import get_settings


class VectorStore:
    """Wrapper around ChromaDB for semantic search over document chunks."""

    def __init__(self, persist_dir: str, embedding_model_name: str = "all-MiniLM-L6-v2") -> None:
        """Initialize ChromaDB PersistentClient and vector collection.

        Args:
            persist_dir: Directory where ChromaDB indexes are persisted.
            embedding_model_name: Name of the sentence-transformers model.
        """
        self.persist_dir = persist_dir
        os.makedirs(self.persist_dir, exist_ok=True)

        self.client = chromadb.PersistentClient(path=self.persist_dir)
        self.embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=embedding_model_name
        )
        self.collection = self.client.get_or_create_collection(
            name="study_materials",
            embedding_function=self.embedding_fn,
            metadata={"hnsw:space": "cosine"},
        )

    def add_chunks(self, doc_id: str, chunks: List[Dict[str, Any]]) -> int:
        """Add document chunks and their metadata to the collection.

        Args:
            doc_id: Unique document identifier.
            chunks: List of chunk dictionaries containing 'text' and 'metadata'.

        Returns:
            Number of chunks successfully added.
        """
        if not chunks:
            return 0

        documents: List[str] = []
        metadatas: List[Dict[str, Any]] = []
        ids: List[str] = []

        for i, chunk in enumerate(chunks):
            chunk_id = f"{doc_id}_chunk_{i}"
            text = chunk.get("text", "")
            raw_meta = chunk.get("metadata", {})

            # ChromaDB requires metadata values to be str, int, float, or bool
            clean_meta: Dict[str, Any] = {
                "doc_id": doc_id,
                "chunk_index": int(raw_meta.get("chunk_index", i)),
                "filename": str(raw_meta.get("filename", "")),
            }
            if raw_meta.get("page") is not None:
                clean_meta["page"] = int(raw_meta["page"])
            if raw_meta.get("section"):
                clean_meta["section"] = str(raw_meta["section"])

            documents.append(text)
            metadatas.append(clean_meta)
            ids.append(chunk_id)

        self.collection.upsert(
            documents=documents,
            metadatas=metadatas,
            ids=ids,
        )
        return len(documents)

    def search(
        self,
        query: str,
        k: int = 5,
        doc_ids: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Perform semantic similarity search on stored chunks.

        Args:
            query: Query string to embed and search for.
            k: Maximum number of top chunks to return.
            doc_ids: Optional list of document IDs to restrict search to.

        Returns:
            List of dicts containing 'text', 'metadata', and 'score'.
        """
        if self.collection.count() == 0:
            return []

        where_clause: Optional[Dict[str, Any]] = None
        if doc_ids:
            if len(doc_ids) == 1:
                where_clause = {"doc_id": doc_ids[0]}
            else:
                where_clause = {"doc_id": {"$in": doc_ids}}

        # Ensure k is not greater than the available items in collection
        effective_k = min(k, max(1, self.collection.count()))

        query_kwargs: Dict[str, Any] = {
            "query_texts": [query],
            "n_results": effective_k,
            "include": ["documents", "metadatas", "distances"],
        }
        if where_clause:
            query_kwargs["where"] = where_clause

        try:
            results = self.collection.query(**query_kwargs)
        except Exception:
            # In case where-filtering produces no results or where syntax edge case
            return []

        retrieved: List[Dict[str, Any]] = []
        documents_list = results.get("documents", [[]])[0]
        metadatas_list = results.get("metadatas", [[]])[0]
        distances_list = results.get("distances", [[]])[0]

        for text, meta, dist in zip(documents_list, metadatas_list, distances_list):
            # Chroma cosine distance is in [0, 2]; convert to similarity score in [0, 1]
            similarity_score = max(0.0, min(1.0, 1.0 - float(dist)))
            retrieved.append({
                "text": text,
                "metadata": meta,
                "score": round(similarity_score, 4),
            })

        return retrieved

    def delete_document(self, doc_id: str) -> None:
        """Delete all chunks belonging to a document.

        Args:
            doc_id: Unique document identifier to delete.
        """
        try:
            self.collection.delete(where={"doc_id": doc_id})
        except Exception:
            # Handled gracefully if no documents match
            pass

    def get_document_chunks(self, doc_id: str) -> List[Dict[str, Any]]:
        """Retrieve all chunks for a single document.

        Args:
            doc_id: Unique document identifier.

        Returns:
            List of dicts containing 'text' and 'metadata'.
        """
        try:
            results = self.collection.get(
                where={"doc_id": doc_id},
                include=["documents", "metadatas"],
            )
        except Exception:
            return []

        chunks: List[Dict[str, Any]] = []
        documents = results.get("documents") or []
        metadatas = results.get("metadatas") or []

        for text, meta in zip(documents, metadatas):
            chunks.append({
                "text": text,
                "metadata": meta,
            })

        # Sort chunks by chunk_index if present
        chunks.sort(key=lambda c: c.get("metadata", {}).get("chunk_index", 0))
        return chunks

    def get_chunks_by_docs(self, doc_ids: List[str]) -> List[Dict[str, Any]]:
        """Retrieve all chunks belonging to a list of document IDs.

        Args:
            doc_ids: List of document IDs.

        Returns:
            List of dicts containing 'text' and 'metadata'.
        """
        if not doc_ids:
            return []

        if len(doc_ids) == 1:
            where_clause = {"doc_id": doc_ids[0]}
        else:
            where_clause = {"doc_id": {"$in": doc_ids}}

        try:
            results = self.collection.get(
                where=where_clause,
                include=["documents", "metadatas"],
            )
        except Exception:
            return []

        chunks: List[Dict[str, Any]] = []
        documents = results.get("documents") or []
        metadatas = results.get("metadatas") or []

        for text, meta in zip(documents, metadatas):
            chunks.append({
                "text": text,
                "metadata": meta,
            })

        return chunks

    def count(self) -> int:
        """Return total number of chunks currently stored in vector store.

        Returns:
            Total chunk count.
        """
        return self.collection.count()


@lru_cache()
def get_vector_store() -> VectorStore:
    """Return a cached singleton instance of VectorStore."""
    settings = get_settings()
    return VectorStore(
        persist_dir=settings.CHROMA_PERSIST_DIR,
        embedding_model_name=settings.EMBEDDING_MODEL,
    )

