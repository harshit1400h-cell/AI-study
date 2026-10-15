import React, { useState } from 'react';
import {
  FileText,
  Presentation,
  FileCode,
  File,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Layers,
  BookOpen,
} from 'lucide-react';
import { DocumentInfo } from '../types';

interface DocumentCardProps {
  document: DocumentInfo;
  onDelete: (id: string) => Promise<boolean | void> | void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ document, onDelete }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getFileIcon = (fileType: string) => {
    const ext = fileType.toLowerCase().replace('.', '');
    switch (ext) {
      case 'pdf':
        return <FileText className="w-6 h-6 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="w-6 h-6 text-blue-500" />;
      case 'ppt':
      case 'pptx':
        return <Presentation className="w-6 h-6 text-amber-500" />;
      case 'txt':
      case 'md':
        return <FileCode className="w-6 h-6 text-emerald-500" />;
      default:
        return <File className="w-6 h-6 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: DocumentInfo['status']) => {
    switch (status) {
      case 'ready':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Ready</span>
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
            <span>Indexing...</span>
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
            <AlertCircle className="w-3 h-3 text-rose-500" />
            <span>Error</span>
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(document.id);
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      <div>
        {/* Top bar: icon, badge, delete button */}
        <div className="flex items-start justify-between mb-3">
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg group-hover:scale-105 transition-transform">
            {getFileIcon(document.file_type)}
          </div>

          <div className="flex items-center space-x-2">
            {getStatusBadge(document.status)}

            {!showConfirm && (
              <button
                onClick={() => setShowConfirm(true)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                title="Delete document"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* File Name */}
        <h3
          className="font-semibold text-slate-900 dark:text-slate-100 text-sm line-clamp-2 mb-2 leading-snug"
          title={document.filename}
        >
          {document.filename}
        </h3>

        {/* Metadata badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
          <span className="flex items-center space-x-1">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {document.page_count} {document.page_count === 1 ? 'page' : 'pages'}
            </span>
          </span>
          <span>•</span>
          <span className="flex items-center space-x-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {document.chunk_count} {document.chunk_count === 1 ? 'chunk' : 'chunks'}
            </span>
          </span>
        </div>
      </div>

      {/* Footer: Date & Delete confirmation inline */}
      <div>
        {showConfirm ? (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs animate-fadeIn">
            <span className="text-rose-600 dark:text-rose-400 font-medium">Delete doc?</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
                className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-2.5 py-1 rounded bg-rose-600 text-white hover:bg-rose-700 font-medium disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
            <span className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{formatDate(document.uploaded_at)}</span>
            </span>
            <span className="uppercase font-mono text-[10px] tracking-wider font-semibold text-slate-400">
              {document.file_type}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentCard;
