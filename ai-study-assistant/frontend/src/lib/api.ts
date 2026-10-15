import axios from 'axios';
import {
  DocumentInfo,
  QuestionRequest,
  AnswerResponse,
  QuizRequest,
  QuizResponse,
  QuizSubmission,
  QuizResult,
  FlashcardRequest,
  FlashcardResponse,
  SummaryRequest,
  SummaryResponse,
  StudyProgress,
  UploadResponse,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60s for LLM generations
});

/**
 * Upload multiple documents as multipart form data.
 */
export async function uploadDocuments(files: File[]): Promise<UploadResponse[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await api.post<UploadResponse[]>('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

/**
 * Retrieve all uploaded documents and their processing status.
 */
export async function getDocuments(): Promise<DocumentInfo[]> {
  const response = await api.get<DocumentInfo[]>('/documents');
  return response.data;
}

/**
 * Delete a document by its ID.
 */
export async function deleteDocument(docId: string): Promise<{ success: boolean; message?: string }> {
  const response = await api.delete(`/documents/${docId}`);
  return response.data;
}

/**
 * Ask a question using RAG against selected or all documents.
 */
export async function askQuestion(request: QuestionRequest): Promise<AnswerResponse> {
  const response = await api.post<AnswerResponse>('/chat', request);
  return response.data;
}

/**
 * Generate a new quiz based on documents.
 */
export async function generateQuiz(request: QuizRequest): Promise<QuizResponse> {
  const response = await api.post<QuizResponse>('/quiz/generate', request);
  return response.data;
}

/**
 * Grade a completed quiz submission.
 */
export async function gradeQuiz(
  quizOrSubmission: QuizResponse | QuizSubmission,
  submissionAnswers?: Record<number, string>
): Promise<QuizResult> {
  let payload: QuizSubmission;
  if ('answers' in quizOrSubmission) {
    payload = quizOrSubmission as QuizSubmission;
  } else {
    payload = {
      quiz: quizOrSubmission as QuizResponse,
      answers: submissionAnswers || {},
    };
  }
  const response = await api.post<QuizResult>('/quiz/grade', payload);
  return response.data;
}

/**
 * Generate flashcards from documents.
 */
export async function generateFlashcards(request: FlashcardRequest): Promise<FlashcardResponse> {
  const response = await api.post<FlashcardResponse>('/flashcards/generate', request);
  return response.data;
}

/**
 * Generate revision summary and key concepts.
 */
export async function generateSummary(request: SummaryRequest): Promise<SummaryResponse> {
  const response = await api.post<SummaryResponse>('/summary/generate', request);
  return response.data;
}

/**
 * Get overall study progress and stats.
 */
export async function getProgress(): Promise<StudyProgress> {
  const response = await api.get<StudyProgress>('/progress');
  return response.data;
}

/**
 * Check backend health status.
 */
export async function getHealth(): Promise<{ status: string; llm_provider?: string; model?: string }> {
  const response = await api.get<{ status: string; llm_provider?: string; model?: string }>('/health');
  return response.data;
}

/**
 * Clear all documents and indexed knowledge from the backend.
 */
export async function clearAllData(): Promise<{ success: boolean; message?: string }> {
  const response = await api.post('/system/reset');
  return response.data;
}

export default api;
