import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Brain,
  Award,
  Layers,
  Upload,
  MessageSquare,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useDocuments } from '../hooks/useDocuments';
import { getProgress } from '../lib/api';
import { StudyProgress } from '../types';
import { DocumentCard } from '../components/DocumentCard';
import { EmptyState } from '../components/EmptyState';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { documents, loading: docsLoading, removeDocument } = useDocuments();
  const [progress, setProgress] = useState<StudyProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState(true);

  useEffect(() => {
    async function loadProgress() {
      try {
        const data = await getProgress();
        setProgress(data);
      } catch {
        // Fallback or default stats if server has no session record yet
        setProgress({
          total_documents: documents.length,
          total_quizzes_taken: 0,
          average_score: 0,
          recent_sessions: [],
        });
      } finally {
        setProgressLoading(false);
      }
    }
    loadProgress();
  }, [documents.length]);

  const stats = [
    {
      title: 'Total Documents',
      value: documents.length || progress?.total_documents || 0,
      icon: BookOpen,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/60',
      borderColor: 'border-indigo-100 dark:border-indigo-900/50',
    },
    {
      title: 'Quizzes Taken',
      value: progress?.total_quizzes_taken ?? 0,
      icon: Brain,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/60',
      borderColor: 'border-purple-100 dark:border-purple-900/50',
    },
    {
      title: 'Average Score',
      value: progress?.average_score ? `${Math.round(progress.average_score)}%` : '0%',
      icon: Award,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/60',
      borderColor: 'border-emerald-100 dark:border-emerald-900/50',
    },
    {
      title: 'Study Sessions',
      value: progress?.recent_sessions?.length ?? 0,
      icon: Layers,
      color: 'text-sky-600 dark:text-sky-400',
      bgColor: 'bg-sky-50 dark:bg-sky-950/60',
      borderColor: 'border-sky-100 dark:border-sky-900/50',
    },
  ];

  const quickActions = [
    {
      title: 'Upload Documents',
      desc: 'Add PDFs, DOCX, or slides to knowledge base',
      icon: Upload,
      path: '/library?upload=true',
      color: 'from-blue-600 to-indigo-600',
    },
    {
      title: 'Ask AI Tutor',
      desc: 'Chat with your notes and clarify concepts',
      icon: MessageSquare,
      path: '/tutor',
      color: 'from-indigo-600 to-purple-600',
    },
    {
      title: 'Take a Quiz',
      desc: 'Test your knowledge with custom MCQs',
      icon: Brain,
      path: '/quiz',
      color: 'from-purple-600 to-pink-600',
    },
    {
      title: 'Generate Flashcards',
      desc: 'Review key terms with smart 3D flipcards',
      icon: Layers,
      path: '/flashcards',
      color: 'from-emerald-600 to-teal-600',
    },
  ];

  const recentDocuments = documents.slice(0, 4);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
          <Sparkles className="w-96 h-96 -mr-20 text-white" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium text-indigo-200 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Study Partner</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
            Welcome back! Ready to study? 📚
          </h1>
          <p className="text-indigo-100 text-sm sm:text-base leading-relaxed mb-6">
            Upload textbooks, lecture notes, or slides. Generate instant practice tests,
            interactive flashcards, and chat directly with your curriculum.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/library?upload=true')}
              className="px-5 py-2.5 rounded-xl bg-white text-indigo-900 font-semibold text-sm hover:bg-indigo-50 transition-all shadow-md active:scale-95 flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Upload New Notes</span>
            </button>
            <button
              onClick={() => navigate('/tutor')}
              className="px-5 py-2.5 rounded-xl bg-indigo-700/80 hover:bg-indigo-700 text-white font-semibold text-sm transition-all border border-indigo-400/30 flex items-center space-x-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Ask AI Tutor</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              className={`bg-white dark:bg-slate-900 border ${s.borderColor} rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {s.title}
                </span>
                <div className={`p-2 rounded-xl ${s.bgColor}`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                {progressLoading ? (
                  <span className="inline-block w-12 h-7 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
                ) : (
                  s.value
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Quick Actions</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                onClick={() => navigate(action.path)}
                className="group text-left p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-600 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${action.color} flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                    {action.desc}
                  </p>
                </div>

                <div className="flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                  <span>Start Now</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Documents Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Recent Documents</span>
          </h2>

          {documents.length > 0 && (
            <button
              onClick={() => navigate('/library')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center space-x-1"
            >
              <span>View All ({documents.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {docsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-44 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : recentDocuments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentDocuments.map((doc) => (
              <DocumentCard key={doc.id} document={doc} onDelete={removeDocument} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
            <EmptyState
              icon={BookOpen}
              title="No documents yet"
              description="Upload your study materials (PDF, DOCX, PPTX, or TXT) to start asking questions, generating quizzes, and building flashcards."
              actionLabel="Upload Documents"
              onAction={() => navigate('/library?upload=true')}
              actionIcon={Upload}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
