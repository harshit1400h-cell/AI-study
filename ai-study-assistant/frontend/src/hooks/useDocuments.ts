import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { DocumentInfo } from '../types';
import { getDocuments, uploadDocuments, deleteDocument } from '../lib/api';

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDocs = useCallback(async (isSilent: boolean = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const data = await getDocuments();
      setDocuments(data || []);
      return data || [];
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch documents';
      setError(msg);
      if (!isSilent) {
        toast.error('Could not load documents from server');
      }
      return [];
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // Poll if any document is currently in 'processing' status
  useEffect(() => {
    fetchDocs();

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [fetchDocs]);

  useEffect(() => {
    const hasProcessing = documents.some((doc) => doc.status === 'processing');
    if (hasProcessing) {
      if (!pollTimerRef.current) {
        pollTimerRef.current = setInterval(() => {
          fetchDocs(true);
        }, 3000);
      }
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }
  }, [documents, fetchDocs]);

  const uploadFiles = async (files: File[]): Promise<boolean> => {
    if (files.length === 0) return false;
    setIsUploading(true);
    const toastId = toast.loading(`Uploading ${files.length} document${files.length > 1 ? 's' : ''}...`);

    try {
      await uploadDocuments(files);
      toast.success('Upload complete! Processing documents...', { id: toastId });
      await fetchDocs(true);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      toast.error(`Upload failed: ${msg}`, { id: toastId });
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const removeDocument = async (docId: string): Promise<boolean> => {
    try {
      await deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      toast.success('Document deleted');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete document';
      toast.error(msg);
      return false;
    }
  };

  return {
    documents,
    loading,
    error,
    isUploading,
    fetchDocuments: fetchDocs,
    uploadFiles,
    removeDocument,
  };
}

export default useDocuments;
