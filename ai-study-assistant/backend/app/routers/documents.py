"""FastAPI router for document upload, listing, retrieval, and deletion."""

import os
import shutil
import uuid
from typing import Any, Dict, List
from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.config import get_settings
from app.db.document_store import get_document_store
from app.db.vector_store import get_vector_store
from app.models import DocumentInfo, UploadResponse
from app.services.document_processor import process_document

router = APIRouter(prefix="/api/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".txt", ".md"}


@router.post("/upload", response_model=List[UploadResponse])
async def upload_documents(files: List[UploadFile] = File(...)) -> List[UploadResponse]:
    """Upload one or more study documents, parse their contents, and generate vector embeddings.

    Supported formats: PDF, DOCX, PPTX, TXT, MD.
    """
    settings = get_settings()
    doc_store = get_document_store()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)

    responses: List[UploadResponse] = []

    for file in files:
        filename = file.filename or "unnamed_document.txt"
        ext = os.path.splitext(filename)[1].lower()

        # Validate file format
        if ext not in ALLOWED_EXTENSIONS:
            responses.append(UploadResponse(
                doc_id="",
                filename=filename,
                status="error",
                message=f"Unsupported file format '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            ))
            continue

        doc_id = str(uuid.uuid4())
        safe_filename = f"{doc_id}_{filename}"
        saved_path = os.path.join(upload_dir, safe_filename)

        try:
            # Read content and enforce size limits
            content = await file.read()
            if len(content) > max_bytes:
                responses.append(UploadResponse(
                    doc_id=doc_id,
                    filename=filename,
                    status="error",
                    message=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB.",
                ))
                continue

            with open(saved_path, "wb") as f_out:
                f_out.write(content)

            # Record initial document in processing state
            initial_doc = DocumentInfo(
                id=doc_id,
                filename=filename,
                file_type=ext.lstrip("."),
                page_count=0,
                chunk_count=0,
                status="processing",
            )
            doc_store.add_document(initial_doc)

            # Process, chunk, embed, and update store
            doc_info = process_document(
                file_path=saved_path,
                doc_id=doc_id,
                filename=filename,
            )

            responses.append(UploadResponse(
                doc_id=doc_id,
                filename=filename,
                status=doc_info.status,
                message=f"Successfully processed {doc_info.chunk_count} chunks across {doc_info.page_count} pages/sections.",
            ))

        except Exception as e:
            doc_store.update_status(doc_id, "error")
            responses.append(UploadResponse(
                doc_id=doc_id,
                filename=filename,
                status="error",
                message=f"Failed to process document: {str(e)}",
            ))

    return responses


@router.get("", response_model=List[DocumentInfo])
def list_documents() -> List[DocumentInfo]:
    """Retrieve metadata for all uploaded study documents."""
    doc_store = get_document_store()
    return doc_store.list_documents()


@router.get("/{doc_id}", response_model=DocumentInfo)
def get_document(doc_id: str) -> DocumentInfo:
    """Retrieve metadata for a specific document by its ID."""
    doc_store = get_document_store()
    doc = doc_store.get_document(doc_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{doc_id}' not found.",
        )
    return doc


@router.delete("/{doc_id}")
def delete_document(doc_id: str) -> Dict[str, Any]:
    """Delete a document, its persisted file, and its vector embeddings."""
    settings = get_settings()
    doc_store = get_document_store()
    vector_store = get_vector_store()

    doc = doc_store.get_document(doc_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{doc_id}' not found.",
        )

    # 1. Remove vector embeddings
    vector_store.delete_document(doc_id)

    # 2. Remove physical uploaded file if it exists
    upload_dir = settings.UPLOAD_DIR
    target_prefix = f"{doc_id}_"
    if os.path.exists(upload_dir):
        for f in os.listdir(upload_dir):
            if f.startswith(target_prefix):
                try:
                    os.remove(os.path.join(upload_dir, f))
                except OSError:
                    pass

    # 3. Remove document record from metadata store
    doc_store.delete_document(doc_id)

    return {
        "status": "success",
        "message": f"Document '{doc.filename}' ({doc_id}) successfully deleted.",
    }


@router.get("/{doc_id}/chunks")
def get_document_chunks(doc_id: str) -> List[Dict[str, Any]]:
    """Retrieve all vectorized chunks and metadata for a specific document."""
    doc_store = get_document_store()
    if not doc_store.get_document(doc_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{doc_id}' not found.",
        )

    vector_store = get_vector_store()
    return vector_store.get_document_chunks(doc_id)

