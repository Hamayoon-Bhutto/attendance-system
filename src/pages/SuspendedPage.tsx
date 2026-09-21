import React from 'react';
import {
  AlertOctagon,
  Calendar,
  CalendarOff,
  CheckCircle,
  MessageCircle,
  Phone,
  RotateCcw,
  ShieldAlert,
  UserCheck,
  Users
} from 'lucide-react';
import { AppState, Student } from '../types';
import { getGuardianWhatsAppUrl } from '../lib/share';
import { formatPKDate, formatPKR } from '../lib/pakistanFormat';

interface SuspendedPageProps {
  state: AppState;
  onReadmitStudent: (studentId: string) => void;
  onSelectStudent: (studentId: string) => void;
}

export const SuspendedPage: React.FC<SuspendedPageProps> = ({
  state,
  onReadmitStudent,
  onSelectStudent,
}) => {
  const suspendedStudents = state.students.filter((s) => s.status === 'suspended' && !s.isDeleted);

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner */}
      <div className="bg-red-950/90 border border-red-800 p-6 rounded-2xl text-white shadow-md space-y-2">
        <div className="flex items-center space-x-2 text-xs font-bold text-red-300 uppercase tracking-widest">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <span>Disciplinary Action Log</span>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Suspended Students ({suspendedStudents.length})
            </h1>
            <p className="text-xs text-red-200/80 max-w-xl mt-1">
              Rule: Students with {state.settings.suspensionThreshold} consecutive working-day absences without approved leave are automatically suspended and hidden from the daily attendance roll.
            </p>
          </div>
          <div className="px-4 py-2 rounded-xl bg-red-900/60 border border-red-700/60 text-xs font-bold text-red-200 shrink-0">
            Re-Admission Fee: {formatPKR(state.settings.readmissionFee)}
          </div>
        </div>
      </div>

      {/* Suspended Students List */}
      <div className="space-y-4">
        {suspendedStudents.map((student) => {
          const batch = state.batches.find((b) => b.id === student.batchId);
          // Find most recent active suspension record
          const susp = state.suspensions
            .filter((s) => s.studentId === student.id && !s.readmittedOn)
            .sort((a, b) => b.suspendedOn.localeCompare(a.suspendedOn))[0];

          const whatsappUrl = getGuardianWhatsAppUrl(
            student.guardianPhone,
            student.fullName,
            state.settings.academyName,
            'Current Period',
            0,
            0,
            0,
            `Suspended (${susp?.streakAtSuspension || student.currentAbsenceStreak} absences)`
          );

          return (
            <div
              key={student.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-red-200 dark:border-red-950/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-red-400 dark:hover:border-red-800 transition-colors"
            >
              {/* Student Info */}
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/60 border-2 border-red-300 dark:border-red-800 flex items-center justify-center text-red-600 font-black text-lg overflow-hidden shrink-0">
                  {student.photoUrl ? (
                    <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
                  ) : (
                    student.fullName.substring(0, 2).toUpperCase()
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3
                      className="font-bold text-base text-slate-900 dark:text-white cursor-pointer hover:text-red-600 transition-colors"
                      onClick={() => onSelectStudent(student.id)}
                    >
                      {student.fullName}
                    </h3>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300">
                      Suspended
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Batch: <strong>{batch?.name || 'Standard'}</strong> • Guardian:{' '}
                    <strong>{student.guardianName || 'N/A'}</strong> ({student.guardianPhone})
                  </div>

                  <div className="text-xs text-red-600 dark:text-red-400 font-semibold mt-1 flex items-center gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5" />
                    <span>
                      Suspended on {susp?.suspendedOn ? formatPKDate(susp.suspendedOn, 'medium') : 'Recent'} after{' '}
                      <strong>{susp?.streakAtSuspension || student.currentAbsenceStreak} consecutive working-day absences</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-[44px] min-h-[44px] rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 hover:bg-emerald-100 transition-colors flex items-center justify-center cursor-pointer"
                  title="Contact Guardian on WhatsApp"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>

                <a
                  href={`tel:${student.guardianPhone}`}
                  className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors flex items-center justify-center cursor-pointer"
                  title="Call Guardian"
                >
                  <Phone className="w-5 h-5" />
                </a>

                <button
                  id={`readmit-btn-${student.id}`}
                  onClick={() => onReadmitStudent(student.id)}
                  className="min-h-[44px] flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-102 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Re-Admit Student ({formatPKR(state.settings.readmissionFee)})</span>
                </button>
              </div>
            </div>
          );
        })}

        {suspendedStudents.length === 0 && (
          <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500 space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
              No Currently Suspended Students!
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Every active student is in safe standing. The system will automatically trigger a suspension alert if any student reaches {state.settings.suspensionThreshold} consecutive absences.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
