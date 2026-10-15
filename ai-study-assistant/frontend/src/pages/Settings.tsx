import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
  Cpu,
  Database,
  Trash2,
  Info,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../hooks/useTheme';
import { getHealth, clearAllData } from '../lib/api';

export const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [serverHealth, setServerHealth] = useState<{
    status: string;
    llm_provider?: string;
    model?: string;
  } | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    async function checkHealth() {
      try {
        const data = await getHealth();
        setServerHealth(data);
      } catch {
        setServerHealth({
          status: 'offline',
          llm_provider: 'Gemini (configured via backend .env)',
          model: 'gemini-1.5-flash',
        });
      } finally {
        setHealthLoading(false);
      }
    }
    checkHealth();
  }, []);

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      await clearAllData();
      toast.success('All documents and vector indexes have been cleared');
      setShowClearModal(false);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      // Local fallback reset if backend endpoint is unavailable
      localStorage.clear();
      toast.success('Local preferences and cache cleared');
      setShowClearModal(false);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
          <SettingsIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Customize interface appearance, view LLM configuration, and manage knowledge data.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Appearance Section */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>Theme & Appearance</span>
          </h2>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            <button
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border flex items-center space-x-3 transition-all ${
                theme === 'light'
                  ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                <Sun className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block font-semibold text-sm">Light Mode</span>
                <span className="text-xs text-slate-500">Clean & crisp</span>
              </div>
            </button>

            <button
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border flex items-center space-x-3 transition-all ${
                theme === 'dark'
                  ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="p-2 rounded-lg bg-indigo-950 text-indigo-400">
                <Moon className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block font-semibold text-sm">Dark Mode</span>
                <span className="text-xs text-slate-500">Gentle on eyes</span>
              </div>
            </button>
          </div>
        </section>

        {/* AI & Backend Information */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-purple-500" />
            <span>AI & Backend Configuration</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                LLM Provider
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                {serverHealth?.llm_provider || 'Google Gemini 1.5 Flash / OpenAI'}
              </p>
              <span className="text-[11px] text-slate-500">Configured via backend .env</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Vector Database
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                ChromaDB (Local persistent)
              </p>
              <span className="text-[11px] text-slate-500">all-MiniLM-L6-v2 embeddings</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Backend Server
              </span>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  http://localhost:8000
                </span>
                <span
                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    serverHealth?.status === 'ok' || serverHealth?.status === 'ready'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                  }`}
                >
                  <Server className="w-2.5 h-2.5" />
                  <span>{serverHealth?.status || 'Active'}</span>
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Supported File Types
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                PDF, DOCX, PPTX, TXT, MD
              </p>
              <span className="text-[11px] text-slate-500">Up to 50MB per document</span>
            </div>
          </div>
        </section>

        {/* Danger Zone: Clear Data */}
        <section className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Danger Zone</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
                Clear all stored documents, extracted text chunks, vector embeddings, and quiz history. This action cannot be undone.
              </p>
            </div>

            <button
              onClick={() => setShowClearModal(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-all shadow-md active:scale-95 flex-shrink-0 ml-4"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Data</span>
            </button>
          </div>
        </section>

        {/* About & Version Info */}
        <section className="p-6 rounded-2xl bg-slate-100 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400 space-y-2">
          <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300 text-sm">
            <span>🎓 AI Study Assistant</span>
            <span className="font-mono text-xs">v1.0.0</span>
          </div>
          <p className="leading-relaxed">
            Engineered with React 18, TypeScript, Tailwind CSS, FastAPI, and ChromaDB. Designed for accelerated learning, smart retrieval-augmented generation, and automated testing.
          </p>
        </section>
      </div>

      {/* Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                Clear All Knowledge Base Data?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                This will delete all uploaded files and wipe vector search embeddings. You will need to re-upload documents to use the AI tutor and quiz generators.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={isClearing}
                className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={isClearing}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-md transition-all disabled:opacity-50"
              >
                {isClearing ? 'Clearing...' : 'Yes, Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
