import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Copy,
  Check,
  AlertTriangle,
  Award,
  Send,
  RefreshCw,
  MessageCircle,
  Lightbulb,
  ShieldCheck,
} from 'lucide-react';
import { AppState, Student } from '../types';

interface AiCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  selectedStudent?: Student | null;
  initialMode?: 'general' | 'retention' | 'star';
}

export const AiCoachModal: React.FC<AiCoachModalProps> = ({
  isOpen,
  onClose,
  state,
  selectedStudent,
  initialMode = 'general',
}) => {
  const [activeMode, setActiveMode] = useState<'general' | 'retention' | 'star'>(initialMode);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleGenerate = async (mode: 'general' | 'retention' | 'star') => {
    setActiveMode(mode);
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      let payload: any = {};

      if (mode === 'retention') {
        const atRiskStudents = state.students
          .filter((s) => !s.isDeleted && (s.currentAbsenceStreak >= state.settings.warningThreshold || s.status === 'suspended'))
          .map((s) => ({
            name: s.fullName,
            guardian: s.guardianName,
            phone: s.guardianPhone,
            absenceStreak: s.currentAbsenceStreak,
            status: s.status,
            batch: state.batches.find((b) => b.id === s.batchId)?.name || 'General',
          }));

        payload = {
          warningThreshold: state.settings.warningThreshold,
          suspensionThreshold: state.settings.suspensionThreshold,
          students: atRiskStudents,
        };
      } else if (mode === 'star') {
        const targetStudent = selectedStudent || state.students[0];
        payload = {
          studentName: targetStudent.fullName,
          guardian: targetStudent.guardianName,
          batch: state.batches.find((b) => b.id === targetStudent.batchId)?.name || 'General',
          monthlyFee: targetStudent.monthlyFee,
          academy: state.settings.academyName,
        };
      } else {
        // General attendance insights
        const activeStudents = state.students.filter((s) => !s.isDeleted);
        const presentCount = state.attendance.filter((a) => a.status === 'present').length;
        const absentCount = state.attendance.filter((a) => a.status === 'absent').length;

        payload = {
          academyName: state.settings.academyName,
          totalStudents: activeStudents.length,
          totalMarkedRecords: state.attendance.length,
          presentCount,
          absentCount,
          batches: state.batches.map((b) => ({
            name: b.name,
            studentCount: activeStudents.filter((s) => s.batchId === b.id).length,
          })),
        };
      }

      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: mode === 'retention' ? 'retention_risk' : mode === 'star' ? 'star_citation' : 'attendance_insights',
          payload,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate AI insights');
      }

      setResult(data.analysis);
    } catch (err: any) {
      console.error('Gemini error:', err);
      setError(err?.message || 'Failed to connect to the Gemini AI server.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-sky-100 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-sky-100 dark:border-slate-800 bg-gradient-to-r from-sky-50/80 via-white to-sky-50/40 dark:from-slate-900 dark:to-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Gemini Coach AI Advisor
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  Powered by Gemini
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Martial arts attendance analysis, retention alerts, and parent notices
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Tabs */}
        <div className="px-6 pt-4 pb-2 flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 overflow-x-auto">
          <button
            onClick={() => handleGenerate('general')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeMode === 'general'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Attendance Health</span>
          </button>

          <button
            onClick={() => handleGenerate('retention')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeMode === 'retention'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Retention & Parent Notice</span>
          </button>

          <button
            onClick={() => handleGenerate('star')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 ${
              activeMode === 'star'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-700/60 border border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Star Award Citation</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <div className="font-bold">Gemini API Advisory</div>
                <div>{error}</div>
                <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
                  Ensure GEMINI_API_KEY is configured in your project environment.
                </div>
              </div>
            </div>
          )}

          {!result && !loading && !error && (
            <div className="py-12 px-4 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-800/80">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Generate AI Martial Arts Insights
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select an analysis mode above to evaluate student attendance trends, draft parent WhatsApp notifications, or compose Belt Award honors using Gemini.
                </p>
              </div>
              <button
                onClick={() => handleGenerate(activeMode)}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm shadow-sky-600/20 inline-flex items-center space-x-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Run Gemini Analysis</span>
              </button>
            </div>
          )}

          {loading && (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-sky-600 dark:text-sky-400 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Analyzing attendance metrics with Gemini 3.8 Flash...
              </p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-600" />
                  <span>Coach Recommendation & Notes</span>
                </span>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-sans select-text">
                {result}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Model: <span className="font-semibold text-slate-700 dark:text-slate-300">gemini-3.8-flash</span>
          </div>
          <div className="flex items-center space-x-2">
            {result && (
              <button
                onClick={() => handleGenerate(activeMode)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Regenerate</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
