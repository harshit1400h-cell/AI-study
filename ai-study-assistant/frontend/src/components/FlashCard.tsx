import React, { useState } from 'react';
import {
  RotateCw,
  CheckCircle2,
  RefreshCw,
  BookOpen,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { Flashcard } from '../types';

interface FlashCardProps {
  card: Flashcard;
  currentIndex: number;
  totalCards: number;
  onKnowIt: () => void;
  onReviewAgain: () => void;
}

export const FlashCard: React.FC<FlashCardProps> = ({
  card,
  currentIndex,
  totalCards,
  onKnowIt,
  onReviewAgain,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleAction = (callback: () => void) => {
    setIsFlipped(false);
    callback();
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center">
      {/* Top Counter Bar */}
      <div className="w-full flex items-center justify-between mb-4 px-2">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Card {currentIndex + 1} of {totalCards}
        </span>
        <button
          onClick={handleFlip}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center space-x-1 font-medium transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Click card to flip</span>
        </button>
      </div>

      {/* 3D Flip Card Container */}
      <div
        onClick={handleFlip}
        className="w-full h-80 sm:h-96 cursor-pointer perspective-1000 select-none group"
      >
        <div
          className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRONT OF CARD */}
          <div className="absolute inset-0 w-full h-full backface-hidden bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-8 flex flex-col justify-between shadow-sm hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
              <div className="flex items-center space-x-2">
                <HelpCircle className="w-5 h-5" />
                <span className="text-xs uppercase font-bold tracking-wider">Question</span>
              </div>
              <span className="text-xs text-slate-400 group-hover:text-indigo-500 transition-colors flex items-center space-x-1">
                <span>Tap to reveal</span>
                <RotateCw className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="my-auto py-4 text-center">
              <p className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                {card.front}
              </p>
            </div>

            <div className="text-center text-xs text-slate-400">
              <span>StudyAI Smart Card</span>
            </div>
          </div>

          {/* BACK OF CARD */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-gradient-to-b from-indigo-50/50 to-white dark:from-slate-900 dark:to-slate-950 border border-indigo-200/80 dark:border-indigo-950 rounded-3xl p-8 flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-4">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5" />
                  <span className="text-xs uppercase font-bold tracking-wider">Answer</span>
                </div>
                <span className="text-xs text-slate-400 flex items-center space-x-1">
                  <span>Tap to flip back</span>
                  <RotateCw className="w-3.5 h-3.5" />
                </span>
              </div>

              <div className="py-2 text-center overflow-y-auto max-h-48 pr-1">
                <p className="text-lg sm:text-xl font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                  {card.back}
                </p>
              </div>
            </div>

            {/* Source citation */}
            {card.source && (
              <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/80 text-left">
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <span className="truncate font-medium">
                    {card.source.filename}
                    {card.source.page ? ` (Page ${card.source.page})` : ''}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons: Review Again & Know It */}
      <div className="w-full grid grid-cols-2 gap-4 mt-6">
        <button
          onClick={() => handleAction(onReviewAgain)}
          className="flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 font-semibold text-sm transition-all shadow-sm active:scale-95"
        >
          <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Review Again</span>
        </button>

        <button
          onClick={() => handleAction(onKnowIt)}
          className="flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-sm transition-all shadow-md shadow-emerald-600/20 active:scale-95"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Know It</span>
        </button>
      </div>
    </div>
  );
};

export default FlashCard;
