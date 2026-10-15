import React from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  BookOpen,
  Info,
} from 'lucide-react';
import { QuizQuestion, QuestionResult } from '../types';

interface QuizCardProps {
  index: number;
  question: QuizQuestion;
  userAnswer?: string;
  onAnswerChange: (answer: string) => void;
  isSubmitted?: boolean;
  result?: QuestionResult;
}

export const QuizCard: React.FC<QuizCardProps> = ({
  index,
  question,
  userAnswer = '',
  onAnswerChange,
  isSubmitted = false,
  result,
}) => {
  const isCorrect = result?.is_correct ?? false;

  const getTypeLabel = (type: QuizQuestion['question_type']) => {
    switch (type) {
      case 'mcq':
        return 'Multiple Choice';
      case 'true_false':
        return 'True / False';
      case 'short_answer':
        return 'Short Answer';
      default:
        return 'Question';
    }
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 border rounded-2xl p-6 transition-all duration-200 shadow-sm ${
        isSubmitted
          ? isCorrect
            ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/20 dark:bg-emerald-950/10'
            : 'border-rose-300 dark:border-rose-800/80 bg-rose-50/20 dark:bg-rose-950/10'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Header: Question Number, Type Badge, Result Icon */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <span className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-sm">
            {index + 1}
          </span>
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
            {getTypeLabel(question.question_type)}
          </span>
        </div>

        {isSubmitted && (
          <div className="flex items-center space-x-1.5 text-xs font-semibold">
            {isCorrect ? (
              <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Correct</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-rose-600 dark:text-rose-400">
                <XCircle className="w-4 h-4" />
                <span>Incorrect</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Question Text */}
      <p className="text-base font-medium text-slate-900 dark:text-slate-100 mb-5 leading-relaxed">
        {question.question}
      </p>

      {/* Answer Inputs according to question type */}
      <div className="space-y-3 mb-4">
        {/* MCQ Mode */}
        {question.question_type === 'mcq' && question.options && (
          <div className="grid grid-cols-1 gap-2.5">
            {Object.entries(question.options).map(([key, optText]) => {
              const isSelected = userAnswer.toLowerCase() === key.toLowerCase() || userAnswer === optText;
              const isCorrectOption =
                question.correct_answer.toLowerCase() === key.toLowerCase() ||
                question.correct_answer.toLowerCase() === optText.toLowerCase();

              let optionClasses =
                'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300';

              if (isSubmitted) {
                if (isCorrectOption) {
                  optionClasses =
                    'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-medium';
                } else if (isSelected && !isCorrectOption) {
                  optionClasses =
                    'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200';
                } else {
                  optionClasses =
                    'opacity-60 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-500';
                }
              } else if (isSelected) {
                optionClasses =
                  'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-medium shadow-sm ring-1 ring-indigo-500';
              }

              return (
                <button
                  key={key}
                  type="button"
                  disabled={isSubmitted}
                  onClick={() => onAnswerChange(key)}
                  className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between text-sm transition-all duration-150 ${optionClasses}`}
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs uppercase ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {key}
                    </span>
                    <span className="leading-snug">{optText}</span>
                  </div>

                  {isSubmitted && isCorrectOption && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 ml-2" />
                  )}
                  {isSubmitted && isSelected && !isCorrectOption && (
                    <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* True / False Mode */}
        {question.question_type === 'true_false' && (
          <div className="grid grid-cols-2 gap-3">
            {['True', 'False'].map((choice) => {
              const isSelected = userAnswer.toLowerCase() === choice.toLowerCase();
              const isCorrectChoice = question.correct_answer.toLowerCase() === choice.toLowerCase();

              let tfClasses =
                'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300';

              if (isSubmitted) {
                if (isCorrectChoice) {
                  tfClasses =
                    'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-medium';
                } else if (isSelected && !isCorrectChoice) {
                  tfClasses =
                    'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200';
                } else {
                  tfClasses =
                    'opacity-60 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-500';
                }
              } else if (isSelected) {
                tfClasses =
                  'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-medium ring-1 ring-indigo-500';
              }

              return (
                <button
                  key={choice}
                  type="button"
                  disabled={isSubmitted}
                  onClick={() => onAnswerChange(choice)}
                  className={`py-3 px-4 rounded-xl border font-medium text-sm flex items-center justify-center space-x-2 transition-all ${tfClasses}`}
                >
                  <span>{choice}</span>
                  {isSubmitted && isCorrectChoice && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {isSubmitted && isSelected && !isCorrectChoice && <XCircle className="w-4 h-4 text-rose-500" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Short Answer Mode */}
        {question.question_type === 'short_answer' && (
          <div>
            <textarea
              rows={2}
              disabled={isSubmitted}
              value={userAnswer}
              onChange={(e) => onAnswerChange(e.target.value)}
              placeholder="Type your answer here..."
              className={`w-full p-3.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isSubmitted
                  ? isCorrect
                    ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : 'border-rose-500 bg-rose-50/30 dark:bg-rose-950/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'
              }`}
            />
            {isSubmitted && !isCorrect && (
              <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
                <span className="font-semibold">Expected Answer: </span>
                <span>{question.correct_answer}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post-Submission Details: Explanation & Source Citation */}
      {isSubmitted && (
        <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-3 animate-fadeIn">
          {question.explanation && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-xs space-y-1">
              <div className="flex items-center space-x-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <Info className="w-3.5 h-3.5 text-indigo-500" />
                <span>Explanation</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{question.explanation}</p>
            </div>
          )}

          {question.source && (
            <div className="flex items-start space-x-2 text-[11px] text-slate-500 dark:text-slate-400 px-1">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  Source: {question.source.filename}
                </span>
                {question.source.page && <span> (Page {question.source.page})</span>}
                {question.source.text_excerpt && (
                  <p className="italic text-slate-400 mt-0.5">"{question.source.text_excerpt}"</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizCard;
