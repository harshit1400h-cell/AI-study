/**
 * TypeScript definitions for AI Study Assistant matching backend Pydantic models.
 */

export type DocumentStatus = 'processing' | 'ready' | 'error';

export interface DocumentInfo {
  id: string;
  filename: string;
  file_type: string;
  page_count: number;
  chunk_count: number;
  uploaded_at: string;
  status: DocumentStatus;
}

export interface ChunkMetadata {
  doc_id: string;
  filename: string;
  page?: number | null;
  section?: string | null;
  chunk_index: number;
}

export interface Citation {
  filename: string;
  page?: number | null;
  section?: string | null;
  text_excerpt: string;
}

export interface RetrievedChunk {
  text: string;
  metadata: ChunkMetadata;
  relevance_score: number;
}

export type ExplanationMode = 'beginner' | 'intermediate' | 'exam';

export interface QuestionRequest {
  question: string;
  doc_ids?: string[] | null;
  mode?: ExplanationMode;
}

export interface AnswerResponse {
  answer: string;
  citations: Citation[];
  retrieved_chunks: RetrievedChunk[];
}

export type QuestionType = 'mcq' | 'true_false' | 'short_answer';

export interface QuizRequest {
  doc_ids: string[];
  num_questions: number;
  question_types: QuestionType[];
}

export interface QuizQuestion {
  question: string;
  question_type: QuestionType;
  options?: Record<string, string> | null;
  correct_answer: string;
  explanation: string;
  source: Citation;
}

export interface QuizResponse {
  questions: QuizQuestion[];
}

export interface QuizSubmission {
  answers: Record<number, string>;
  quiz?: QuizResponse;
}

export interface QuestionResult {
  question_index: number;
  question: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
  topic?: string | null;
}

export interface QuizResult {
  score: number;
  total: number;
  percentage: number;
  weak_topics: string[];
  details: QuestionResult[];
}

export interface FlashcardRequest {
  doc_ids: string[];
  num_cards: number;
}

export interface Flashcard {
  front: string;
  back: string;
  source: Citation;
}

export interface FlashcardResponse {
  flashcards: Flashcard[];
}

export interface SummaryRequest {
  doc_ids: string[];
}

export interface SummaryResponse {
  summary: string;
  key_concepts: string[];
  citations: Citation[];
}

export interface UploadResponse {
  doc_id: string;
  filename: string;
  status: string;
  message: string;
}

export interface StudyProgress {
  total_documents: number;
  total_quizzes_taken: number;
  average_score: number;
  recent_sessions: Array<{
    date: string;
    quiz_score?: number;
    quiz_total?: number;
    percentage?: number;
    type?: string;
    doc_count?: number;
  }>;
}

export interface ChatMessageItem {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  citations?: Citation[];
  retrieved_chunks?: RetrievedChunk[];
  timestamp: string;
  isLoading?: boolean;
}
