import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Trash2,
  Sparkles,
  BookOpen,
  SlidersHorizontal,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  FileCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { askQuestion } from '../lib/api';
import { useDocuments } from '../hooks/useDocuments';
import { ChatMessageItem, ExplanationMode } from '../types';
import { ChatMessage } from '../components/ChatMessage';

export const Tutor: React.FC = () => {
  const { documents } = useDocuments();
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState<string>('');
  const [selectedDocId, setSelectedDocId] = useState<string>('all');
  const [mode, setMode] = useState<ExplanationMode>('intermediate');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const readyDocs = documents.filter((d) => d.status === 'ready');

  const suggestedPrompts = [
    'Summarize the core takeaways from my notes in bullet points.',
    'Explain the most challenging concept from my materials in simple terms.',
    'What are the key definitions and formulas I should memorize?',
    'Give me a tricky practice question based on these documents.',
  ];

  const handleSend = async (questionText?: string) => {
    const textToSend = (questionText || input).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toISOString(),
    };

    const loadingAiMsg: ChatMessageItem = {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text: '',
      timestamp: new Date().toISOString(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingAiMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const docIds = selectedDocId === 'all' ? undefined : [selectedDocId];
      const response = await askQuestion({
        question: textToSend,
        doc_ids: docIds,
        mode,
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingAiMsg.id
            ? {
                ...msg,
                text: response.answer,
                citations: response.citations,
                retrieved_chunks: response.retrieved_chunks,
                isLoading: false,
              }
            : msg
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to get answer from AI';
      toast.error(msg);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingAiMsg.id
            ? {
                ...m,
                text: `⚠️ **Could not generate response**: ${msg}. Please check if backend server is running and documents are ready.`,
                isLoading: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    if (messages.length === 0) return;
    setMessages([]);
    toast.success('Chat history cleared');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-57px)] md:h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top Controls Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <span>AI Study Tutor</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              RAG answers grounded in your uploaded documents
            </p>
          </div>
        </div>

        {/* Configuration Filters */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Document Scope Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs">
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="all">All Documents ({readyDocs.length})</option>
              {readyDocs.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.filename.length > 25 ? doc.filename.substring(0, 25) + '...' : doc.filename}
                </option>
              ))}
            </select>
          </div>

          {/* Explanation Mode Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-purple-500" />
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ExplanationMode)}
              className="bg-transparent text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer text-xs capitalize"
            >
              <option value="beginner">Beginner Mode</option>
              <option value="intermediate">Intermediate Mode</option>
              <option value="exam">Exam Prep Mode</option>
            </select>
          </div>

          {/* Clear Chat Button */}
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Clear conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-4">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto my-auto py-8 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/20">
              <GraduationCap className="w-8 h-8" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              How can I help you study today?
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
              Ask anything about your uploaded notes or textbooks. I will explain concepts, cite exact pages, and extract key insights.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {suggestedPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all text-xs font-medium shadow-xs flex items-start space-x-2.5 text-left group"
                >
                  <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <span className="leading-snug">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-xs">
            <textarea
              ref={textareaRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your study materials... (Press Enter to send)"
              className="w-full pt-3.5 pb-12 px-4 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none resize-none"
            />

            {/* Bottom Actions Bar inside textarea */}
            <div className="absolute left-3 right-3 bottom-2.5 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                <span className="flex items-center space-x-1">
                  <FileCheck className="w-3 h-3 text-indigo-400" />
                  <span>
                    {selectedDocId === 'all'
                      ? 'Searching all docs'
                      : readyDocs.find((d) => d.id === selectedDocId)?.filename || '1 doc'}
                  </span>
                </span>
                <span>•</span>
                <span className="capitalize">{mode}</span>
              </div>

              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-2">
            AI Study Tutor uses RAG to ground responses in your uploaded documents. Verify important answers before exams.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Tutor;
