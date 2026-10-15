import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  BookOpen,
  Award,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDocuments } from '../hooks/useDocuments';
import { generateFlashcards } from '../lib/api';
import { Flashcard } from '../types';
import { FlashCard } from '../components/FlashCard';
import { EmptyState } from '../components/EmptyState';

type FlashcardStep = 'config' | 'study' | 'complete';

export const Flashcards: React.FC = () => {
  const { documents, loading: docsLoading } = useDocuments();
  const readyDocs = documents.filter((d) => d.status === 'ready');

  // Config State
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [numCards, setNumCards] = useState<number>(10);
  const [isGenerating, setIsGenerating] = useState(false);

  // Active Session State
  const [step, setStep] = useState<FlashcardStep>('config');
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [knownSet, setKnownSet] = useState<Set<number>>(new Set());
  const [reviewSet, setReviewSet] = useState<Set<number>>(new Set());

  // Auto select all ready docs on load
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

  const handleGenerate = async () => {
    if (selectedDocIds.length === 0) {
      toast.error('Select at least one document to generate flashcards');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await generateFlashcards({
        doc_ids: selectedDocIds,
        num_cards: numCards,
      });

      if (!response.flashcards || response.flashcards.length === 0) {
        throw new Error('No flashcards could be generated from the selected documents');
      }

      setDeck(response.flashcards);
      setCurrentIndex(0);
      setKnownSet(new Set());
      setReviewSet(new Set());
      setStep('study');
      toast.success(`Generated ${response.flashcards.length} smart flashcards!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate flashcards';
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKnowIt = () => {
    setKnownSet((prev) => new Set(prev).add(currentIndex));
    setReviewSet((prev) => {
      const updated = new Set(prev);
      updated.delete(currentIndex);
      return updated;
    });

    advanceNext();
  };

  const handleReviewAgain = () => {
    setReviewSet((prev) => new Set(prev).add(currentIndex));
    setKnownSet((prev) => {
      const updated = new Set(prev);
      updated.delete(currentIndex);
      return updated;
    });

    advanceNext();
  };

  const advanceNext = () => {
    if (currentIndex + 1 < deck.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Reached the end of deck
      setStep('complete');
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < deck.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setStep('complete');
    }
  };

  const handleShuffle = () => {
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
    setKnownSet(new Set());
    setReviewSet(new Set());
    toast.success('Deck shuffled!');
  };

  const handleReviewDifficultOnly = () => {
    const difficultCards = deck.filter((_, idx) => reviewSet.has(idx));
    if (difficultCards.length === 0) {
      toast.success('No cards marked for review! Great job!');
      return;
    }
    setDeck(difficultCards);
    setCurrentIndex(0);
    setKnownSet(new Set());
    setReviewSet(new Set());
    setStep('study');
  };

  const handleRestartFullDeck = () => {
    setCurrentIndex(0);
    setKnownSet(new Set());
    setReviewSet(new Set());
    setStep('study');
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
          icon={Layers}
          title="No Ready Documents Available"
          description="Please upload documents in your library first before generating study flashcards."
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
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                AI Flashcards
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Memorize definitions, key concepts, and exam essentials with spaced review.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            {/* Document Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-emerald-500" />
                  <span>Select Source Documents</span>
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
                          ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 pointer-events-none"
                      />
                      <span className="truncate font-medium">{doc.filename}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Deck Size Selector */}
            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">
                Number of Flashcards
              </label>
              <div className="grid grid-cols-4 gap-3">
                {[5, 10, 15, 20].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setNumCards(num)}
                    className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      numCards === num
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {num} Cards
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || selectedDocIds.length === 0}
              className="w-full flex items-center justify-center space-x-2 py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base transition-all shadow-lg shadow-emerald-600/25 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Synthesizing Flashcard Deck...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Generate Flashcards ({numCards} Cards)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: ACTIVE STUDY SESSION */}
      {step === 'study' && deck.length > 0 && (
        <div className="space-y-6">
          {/* Top Progress & Metrics Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              {/* Counters */}
              <div className="flex items-center space-x-4 text-xs font-semibold">
                <span className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{knownSet.size} Mastered</span>
                </span>
                <span className="flex items-center space-x-1.5 text-amber-600 dark:text-amber-400">
                  <RotateCcw className="w-4 h-4" />
                  <span>{reviewSet.size} Reviewing</span>
                </span>
                <span className="text-slate-400">
                  {deck.length - knownSet.size - reviewSet.size} Remaining
                </span>
              </div>

              {/* Utility Actions */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleShuffle}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Shuffle deck"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setStep('config')}
                  className="text-xs text-slate-400 hover:text-rose-500 font-medium"
                >
                  Exit Deck
                </button>
              </div>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 transition-all duration-300"
                style={{ width: `${(knownSet.size / deck.length) * 100}%` }}
              />
              <div
                className="bg-amber-500 transition-all duration-300"
                style={{ width: `${(reviewSet.size / deck.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Flashcard Component */}
          <FlashCard
            card={deck[currentIndex]}
            currentIndex={currentIndex}
            totalCards={deck.length}
            onKnowIt={handleKnowIt}
            onReviewAgain={handleReviewAgain}
          />

          {/* Bottom Navigation controls */}
          <div className="flex items-center justify-between max-w-xl mx-auto px-2 pt-2">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="flex items-center space-x-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="text-xs text-slate-400">
              Use Know It / Review Again to advance
            </span>

            <button
              onClick={handleNext}
              className="flex items-center space-x-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <span>{currentIndex + 1 === deck.length ? 'Finish' : 'Next'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: SESSION COMPLETED */}
      {step === 'complete' && (
        <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-lg animate-fadeIn space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner border-2 border-emerald-500">
            <Award className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">
              Deck Completed! 🎉
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Great job reviewing your study deck. Here is your session breakdown:
            </p>
          </div>

          {/* Stats Breakdown */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
              <span className="block text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {knownSet.size}
              </span>
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                Cards Mastered
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
              <span className="block text-2xl font-bold text-amber-700 dark:text-amber-400">
                {reviewSet.size}
              </span>
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                Needs Review
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            {reviewSet.size > 0 && (
              <button
                onClick={handleReviewDifficultOnly}
                className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition-all shadow-md active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Review {reviewSet.size} Difficult Cards</span>
              </button>
            )}

            <button
              onClick={handleRestartFullDeck}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              <span>Restart Full Deck</span>
            </button>

            <button
              onClick={() => setStep('config')}
              className="w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 pt-2"
            >
              Configure New Deck
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Flashcards;
