import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Sparkles,
  User,
  Quote,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ChatMessageItem, Citation, RetrievedChunk } from '../types';

interface ChatMessageProps {
  message: ChatMessageItem;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const isUser = message.sender === 'user';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    toast.success('Response copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const hasSources =
    (message.citations && message.citations.length > 0) ||
    (message.retrieved_chunks && message.retrieved_chunks.length > 0);

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[90%] md:max-w-[80%] space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className="flex-shrink-0 mt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-sm">
              <User className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
              <Sparkles className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Message Bubble */}
        <div className="flex flex-col space-y-1 overflow-hidden">
          <div
            className={`rounded-2xl px-4 py-3.5 shadow-sm text-sm ${
              isUser
                ? 'bg-indigo-600 text-white rounded-tr-none'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
            }`}
          >
            {message.isLoading ? (
              <div className="flex items-center space-x-2 py-1 px-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"></span>
                <span className="text-xs text-slate-400 ml-2 font-medium">Reviewing study notes...</span>
              </div>
            ) : isUser ? (
              <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
            ) : (
              <div className="markdown-body prose dark:prose-invert max-w-none text-sm leading-relaxed space-y-2">
                <ReactMarkdown>{message.text}</ReactMarkdown>
              </div>
            )}
          </div>

          {/* AI message footer actions: Copy & Citations */}
          {!isUser && !message.isLoading && (
            <div className="flex flex-col space-y-2 pt-1">
              <div className="flex items-center space-x-2">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Copy response"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                {hasSources && (
                  <button
                    onClick={() => setSourcesOpen(!sourcesOpen)}
                    className="flex items-center space-x-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 py-1 px-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors font-medium"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>
                      {message.citations?.length || 0} Citation{(message.citations?.length ?? 0) !== 1 ? 's' : ''}
                    </span>
                    {sourcesOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* Expandable Sources Accordion */}
              {hasSources && sourcesOpen && (
                <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3 text-xs animate-fadeIn">
                  {message.citations && message.citations.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-1.5 font-semibold text-slate-700 dark:text-slate-300">
                        <Quote className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Source References</span>
                      </div>
                      <div className="space-y-1.5">
                        {message.citations.map((c: Citation, idx: number) => (
                          <div
                            key={idx}
                            className="bg-white dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-700/60"
                          >
                            <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 font-medium mb-1">
                              <span className="truncate max-w-[200px]">{c.filename}</span>
                              <span className="text-[11px] text-slate-400">
                                {c.page ? `Page ${c.page}` : c.section ? c.section : ''}
                              </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 italic text-[11px] line-clamp-3">
                              "{c.text_excerpt}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {message.retrieved_chunks && message.retrieved_chunks.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                      <div className="flex items-center space-x-1.5 font-semibold text-slate-700 dark:text-slate-300">
                        <Layers className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Retrieved Context Chunks</span>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {message.retrieved_chunks.map((chunk: RetrievedChunk, idx: number) => (
                          <div
                            key={idx}
                            className="bg-white dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/50 dark:border-slate-700/40 text-[11px]"
                          >
                            <div className="flex items-center justify-between text-slate-500 mb-1">
                              <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                                {chunk.metadata.filename}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono">
                                {Math.round(chunk.relevance_score * 100)}% match
                              </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 line-clamp-2">{chunk.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
