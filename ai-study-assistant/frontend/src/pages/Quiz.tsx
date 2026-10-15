import React, { useState } from 'react';
import {
  Brain,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  HelpCircle,
  BookOpen,
  ArrowRight,
  Loader2,
  FileText,
  Award,
  TrendingDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDocuments } from '../hooks/useDocuments';
import { generateQuiz, gradeQuiz } from '../lib/api';
import { QuizResponse, QuizResult, QuestionType, QuestionResult } from '../types';
import { QuizCard } from '../components/QuizCard';
import { EmptyState } from '../components/EmptyState';

type QuizStep = 'config' | 'taking' | 'results';

export const Quiz: React.FC = () => {
  const { documents, loading: docsLoading } = useDocuments();
  const readyDocs = documents.filter((d) => d.status === 'ready');

  // Config State
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(['mcq', 'true_false']);

  // Quiz Execution State
  const [step, setStep] = useState<QuizStep>('config');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [quizData, setQuizData] = useState<QuizResponse | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  // Initialize selected docs once loaded
  React.useEffect(() => {
    if (readyDocs.length > 0 && selectedDocIds.length === 0) {
      setSelectedDocIds(readyDocs.map((d) => d.id));
    }
  }, [readyDocs.length]);

  const toggleDocSelection = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const selectAllDocs = () => {
    if (selectedDocIds.length === readyDocs.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(readyDocs.map((d) => d.id));
    }
  };

  const toggleQuestionType = (type: QuestionType) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length === 1) {
        toast.error('Select at least one question type');
        return;
      }
      setSelectedTypes((prev) => prev.filter((t) => t !== type));
    } else {
      setSelectedTypes((prev) => [...prev, type]);
    }
  };

  const handleGenerate = async () => {
    if (selectedDocIds.length === 0) {
      toast.error('Please select at least one document for the quiz');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await generateQuiz({
        doc_ids: selectedDocIds,
        num_questions: numQuestions,
        question_types: selectedTypes,
      });

      if (!response.questions || response.questions.length === 0) {
        throw new Error('No questions could be generated from the selected documents');
      }

      setQuizData(response);
      setUserAnswers({});
      setQuizResult(null);
      setStep('taking');
      toast.success(`Generated ${response.questions.length} questions! Good luck!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate quiz';
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerChange = (qIndex: number, answer: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qIndex]: answer,
    }));
  };

  const handleSubmitAll = async () => {
    if (!quizData) return;

    const answeredCount = Object.keys(userAnswers).length;
    const totalCount = quizData.questions.length;

    if (answeredCount < totalCount) {
      const confirmSubmit = window.confirm(
        `You have answered ${answeredCount} of ${totalCount} questions. Submit anyway?`
      );
      if (!confirmSubmit) return;
    }

    setIsGrading(true);
    try {
      const result = await gradeQuiz(quizData, userAnswers);
      setQuizResult(result);
      setStep('results');
      toast.success(`Quiz completed! Score: ${result.percentage}%`);
    } catch (err: unknown) {
      // Fallback local grading if backend grade endpoint has issues
      let score = 0;
      const details: QuestionResult[] = quizData.questions.map((q, idx) => {
        const uAns = (userAnswers[idx] || '').trim().toLowerCase();
        const cAns = q.correct_answer.trim().toLowerCase();
        const isMatch = uAns === cAns || (q.options && q.options[uAns.toUpperCase()]?.toLowerCase() === cAns);
        if (isMatch) score++;
        return {
          question_index: idx,
          question: q.question,
          user_answer: userAnswers[idx] || '(Not answered)',
          correct_answer: q.correct_answer,
          is_correct: isMatch,
          explanation: q.explanation,
        };
      });

      const fallbackResult: QuizResult = {
        score,
        total: quizData.questions.length,
        percentage: Math.round((score / quizData.questions.length) * 100),
        weak_topics: [],
        details,
      };

      setQuizResult(fallbackResult);
      setStep('results');
      toast.success(`Graded locally: ${fallbackResult.percentage}%`);
    } finally {
      setIsGrading(false);
    }
  };

  const handleRetake = () => {
    setUserAnswers({});
    setQuizResult(null);
    setStep('taking');
  };

  const handleNewQuiz = () => {
    setQuizData(null);
    setUserAnswers({});
    setQuizResult(null);
    setStep('config');
  };

  if (docsLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (readyDocs.length === 0) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
        <EmptyState
          icon={Brain}
          title="No Ready Documents Available"
          description="Please upload and wait for documents to finish indexing before generating quizzes."
          actionLabel="Go to Library"
          onAction={() => (window.location.href = '/library')}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* STEP 1: CONFIGURATION */}
      {step === 'config' && (
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Practice Quiz Generator
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Generate tailored multiple choice, true/false, and short answer tests from your materials.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            {/* Document Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  <span>Select Study Documents</span>
                </label>
                <button
                  type="button"
                  onClick={selectAllDocs}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  {selectedDocIds.length === readyDocs.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {readyDocs.map((doc) => {
                  const isChecked = selectedDocIds.includes(doc.id);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => toggleDocSelection(doc.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center space-x-3 transition-all ${
                        isChecked
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent div
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 pointer-events-none"
                      />
                      <span className="truncate font-medium">{doc.filename}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Question Count Selector */}
            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">
                Number of Questions
              </label>
              <div className="grid grid-cols-4 gap-3">
                {[5, 10, 15, 20].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setNumQuestions(num)}
                    className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      numQuestions === num
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {num} Questions
                  </button>
                ))}
              </div>
            </div>

            {/* Question Types Checkboxes */}
            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">
                Question Types
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'mcq', label: 'Multiple Choice', desc: 'Standard 4-option questions' },
                  { id: 'true_false', label: 'True / False', desc: 'Concept accuracy checks' },
                  { id: 'short_answer', label: 'Short Answer', desc: 'Recall key terms & formulas' },
                ].map((type) => {
                  const isChecked = selectedTypes.includes(type.id as QuestionType);
                  return (
                    <div
                      key={type.id}
                      onClick={() => toggleQuestionType(type.id as QuestionType)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 mb-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 pointer-events-none"
                        />
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {type.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 ml-6.5">
                        {type.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || selectedDocIds.length === 0}
              className="w-full flex items-center justify-center space-x-2 py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base transition-all shadow-lg shadow-indigo-600/25 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Synthesizing Quiz Questions...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Generate Quiz ({numQuestions} Questions)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: TAKING QUIZ */}
      {step === 'taking' && quizData && (
        <div className="space-y-6">
          {/* Progress Header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between sticky top-4 z-20 backdrop-blur-md">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Progress
              </span>
              <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {Object.keys(userAnswers).length} of {quizData.questions.length} Answered
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-1/3 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-300"
                style={{
                  width: `${(Object.keys(userAnswers).length / quizData.questions.length) * 100}%`,
                }}
              />
            </div>

            <button
              onClick={handleNewQuiz}
              className="text-xs text-slate-400 hover:text-rose-500 transition-colors font-medium"
            >
              Quit Quiz
            </button>
          </div>

          {/* Question Cards List */}
          <div className="space-y-5">
            {quizData.questions.map((question, idx) => (
              <QuizCard
                key={idx}
                index={idx}
                question={question}
                userAnswer={userAnswers[idx]}
                onAnswerChange={(ans) => handleAnswerChange(idx, ans)}
                isSubmitted={false}
              />
            ))}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              onClick={handleSubmitAll}
              disabled={isGrading}
              className="w-full flex items-center justify-center space-x-2 py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base transition-all shadow-xl shadow-indigo-600/25 active:scale-95 disabled:opacity-50"
            >
              {isGrading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Grading Answers & Preparing Feedback...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Submit Quiz for Grading</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: RESULTS SUMMARY */}
      {step === 'results' && quizResult && quizData && (
        <div className="space-y-8 animate-fadeIn">
          {/* Hero Score Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-md relative overflow-hidden">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full mx-auto flex items-center justify-center font-black text-3xl sm:text-4xl shadow-inner mb-4 border-4 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-500">
              {Math.round(quizResult.percentage)}%
            </div>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {quizResult.percentage >= 80
                ? 'Outstanding work! 🎉'
                : quizResult.percentage >= 60
                ? 'Good effort! Keep going! 📚'
                : 'Need more practice! Review notes 💡'}
            </h2>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              You got <span className="font-bold text-slate-800 dark:text-slate-200">{quizResult.score}</span> out of{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">{quizResult.total}</span> questions correct.
            </p>

            {/* Weak Topics If Any */}
            {quizResult.weak_topics && quizResult.weak_topics.length > 0 && (
              <div className="max-w-md mx-auto mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-left">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 mb-2">
                  <TrendingDown className="w-4 h-4 text-amber-600" />
                  <span>Recommended Topics for Review</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {quizResult.weak_topics.map((topic, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-[11px] font-semibold text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleRetake}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake This Quiz</span>
              </button>

              <button
                onClick={handleNewQuiz}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>Configure New Quiz</span>
              </button>
            </div>
          </div>

          {/* Detailed Question Review */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <Award className="w-5 h-5 text-indigo-500" />
              <span>Question-by-Question Review</span>
            </h3>

            <div className="space-y-5">
              {quizData.questions.map((question, idx) => {
                const res = quizResult.details?.[idx];
                return (
                  <QuizCard
                    key={idx}
                    index={idx}
                    question={question}
                    userAnswer={userAnswers[idx]}
                    onAnswerChange={() => {}}
                    isSubmitted={true}
                    result={res}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quiz;
