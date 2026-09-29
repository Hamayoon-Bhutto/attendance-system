import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  Search,
  Unlock,
  UserCheck,
  Users,
  X
} from 'lucide-react';
import { AppState, AttendanceStatus, Batch, Student } from '../types';
import {
  formatDateKey,
  getNonWorkingReason,
  isWorkingDay,
  parseDateKey
} from '../lib/attendanceMath';
import { hasUnpaidFees, markAttendance } from '../lib/storage';

interface AttendancePageProps {
  state: AppState;
  onStateChange: () => void;
  onSelectStudent: (studentId: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
  initialSelectedDate?: string | null;
}

export const AttendancePage: React.FC<AttendancePageProps> = ({
  state,
  onStateChange,
  onSelectStudent,
  showToast,
  initialSelectedDate,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(initialSelectedDate || formatDateKey(new Date()));
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [overrideNonWorkingDay, setOverrideNonWorkingDay] = useState(false);

  useEffect(() => {
    if (initialSelectedDate) {
      setSelectedDate(initialSelectedDate);
    }
  }, [initialSelectedDate]);

  // Local draft marks: studentId -> status
  const [draftMarks, setDraftMarks] = useState<Record<string, AttendanceStatus>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Only active students appear on daily attendance sheet
  const activeStudents = useMemo(() => {
    return state.students.filter((s) => s.status === 'active' && !s.isDeleted);
  }, [state.students]);

  // Check if date is locked (> 45 days old)
  const isLocked = useMemo(() => {
    if (state.settings.unlockAll) return false;
    const target = parseDateKey(selectedDate).getTime();
    const today = new Date().getTime();
    const diffDays = Math.floor((today - target) / (1000 * 60 * 60 * 24));
    return diffDays > state.settings.attendanceLockDays;
  }, [selectedDate, state.settings.attendanceLockDays, state.settings.unlockAll]);

  // Non-working day reason
  const nonWorkingReason = useMemo(() => {
    return getNonWorkingReason(selectedDate, state.settings, state.holidays);
  }, [selectedDate, state.settings, state.holidays]);

  const isBlocked = !!nonWorkingReason && !overrideNonWorkingDay;

  // Load existing records for the selected date
  useEffect(() => {
    const existing = state.attendance.filter((a) => a.attendanceDate === selectedDate);
    const marks: Record<string, AttendanceStatus> = {};

    activeStudents.forEach((student) => {
      const found = existing.find((a) => a.studentId === student.id);
      if (found) {
        marks[student.id] = found.status;
      } else {
        // Default is absent until marked, per rule 1
        marks[student.id] = 'absent';
      }
    });

    setDraftMarks(marks);
    setHasUnsavedChanges(false);
  }, [selectedDate, activeStudents, state.attendance]);

  // Stepper buttons for date
  const changeDateBy = (days: number) => {
    const d = parseDateKey(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(formatDateKey(d));
    setOverrideNonWorkingDay(false);
  };

  // Filter students by batch and search
  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return activeStudents.filter((student) => {
      if (selectedBatchId !== 'all' && student.batchId !== selectedBatchId) {
        return false;
      }
      if (query) {
        const q = query;
        return (
          student.fullName.toLowerCase().includes(q) ||
          student.guardianName.toLowerCase().includes(q) ||
          student.guardianPhone.includes(q)
        );
      }
      return true;
    }).sort((a, b) => {
      const query = searchQuery.trim().toLocaleLowerCase();
      if (!query) return 0;
      const rank = (student: Student) => {
        const name = student.fullName.toLocaleLowerCase();
        return name === query ? 0 : name.startsWith(query) ? 1 : name.includes(query) ? 2 : 3;
      };
      return rank(a) - rank(b) || a.fullName.localeCompare(b.fullName);
    });
  }, [activeStudents, selectedBatchId, searchQuery]);

  // Toggle mark for single student
  const setStatus = (studentId: string, status: AttendanceStatus) => {
    if (isLocked || isBlocked) return;
    setDraftMarks((prev) => ({
      ...prev,
      [studentId]: status,
    }));
    setHasUnsavedChanges(true);
  };

  // Mark all present button
  const handleMarkAllPresent = () => {
    if (isLocked || isBlocked) return;
    const updated = { ...draftMarks };
    filteredStudents.forEach((s) => {
      updated[s.id] = 'present';
    });
    setDraftMarks(updated);
    setHasUnsavedChanges(true);
    showToast(`Marked ${filteredStudents.length} students as Present! Tap any exceptions.`, 'success');
  };

  // Save attendance to persistent storage
  const handleSaveAttendance = () => {
    if (isLocked || isBlocked) return;

    const recordsToSave = Object.entries(draftMarks).map(([studentId, status]) => ({
      studentId,
      status: status as AttendanceStatus,
    }));

    const result = markAttendance(selectedDate, recordsToSave);
    onStateChange();
    setHasUnsavedChanges(false);

    if (result.suspendedStudents.length > 0) {
      const names = result.suspendedStudents.map((s) => s.fullName).join(', ');
      showToast(
        `Attendance Saved! AUTO-SUSPENDED: ${names} reached ${state.settings.suspensionThreshold} consecutive absences.`,
        'warning'
      );
    } else if (result.warningStudents.length > 0) {
      showToast(`Attendance saved! Notice: ${result.warningStudents.length} student(s) at 7-day warning.`, 'warning');
    } else {
      showToast(`Attendance recorded for ${result.updatedCount} students on ${selectedDate}!`, 'success');
    }
  };

  const markedCount = Object.values(draftMarks).filter((s) => s === 'present' || s === 'late' || s === 'leave').length;

  return (
    <div className="space-y-5 pb-24">
      {/* Top Date Selection & Actions Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Date Selector with Previous/Next Stepper */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => changeDateBy(-1)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setOverrideNonWorkingDay(false);
                }}
                className="px-3 py-2 pl-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
              />
              <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>

            <button
              onClick={() => changeDateBy(1)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {selectedDate !== formatDateKey(new Date()) && (
              <button
                onClick={() => {
                  setSelectedDate(formatDateKey(new Date()));
                  setOverrideNonWorkingDay(false);
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-sky-700 bg-sky-50 dark:bg-sky-950/80 hover:bg-sky-100 dark:hover:bg-sky-900 border border-sky-200 dark:border-sky-800"
              >
                Today
              </button>
            )}
          </div>

          {/* Quick Action: Mark All Present */}
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              id="mark-all-present-btn"
              disabled={isLocked || isBlocked}
              onClick={handleMarkAllPresent}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/80 hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-800 font-bold text-xs transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4 text-sky-600" />
              <span>Mark All Present</span>
            </button>

            <button
              id="save-attendance-top-btn"
              disabled={isLocked || isBlocked}
              onClick={handleSaveAttendance}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl font-bold text-xs text-white shadow-xs transition-all ${
                hasUnsavedChanges
                  ? 'bg-orange-600 hover:bg-orange-500 scale-102'
                  : 'bg-sky-600 hover:bg-sky-700'
              } disabled:opacity-50`}
            >
              <Check className="w-4 h-4" />
              <span>{hasUnsavedChanges ? 'Save Changes' : 'Saved'}</span>
            </button>
          </div>
        </div>

        {/* Lock Warning if older than 45 days */}
        {isLocked && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/80 flex items-center space-x-3 text-xs text-amber-800 dark:text-amber-200">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Read-Only Lock:</strong> This date is older than {state.settings.attendanceLockDays} days. To
              edit historical records, enable &quot;Unlock All Past Attendance&quot; in Settings.
            </span>
          </div>
        )}

        {/* Non-working day blocker notice with Override button */}
        {nonWorkingReason && !overrideNonWorkingDay && (
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                <strong>Off Day:</strong> {nonWorkingReason}. Attendance is not officially required on this day.
              </span>
            </div>
            <button
              onClick={() => setOverrideNonWorkingDay(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Mark for Today Anyway</span>
            </button>
          </div>
        )}

        {/* Batch Filter & Search Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {/* Batch Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedBatchId('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                selectedBatchId === 'all'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              All Batches ({activeStudents.length})
            </button>
            {state.batches.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBatchId(b.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                  selectedBatchId === b.id
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search student or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Student Attendance List */}
      <div className="space-y-2.5">
        {filteredStudents.map((student) => {
          const status = draftMarks[student.id] || 'absent';
          const batch = state.batches.find((b) => b.id === student.batchId);
          const isUnpaid = hasUnpaidFees(student.id, state.feeRecords);
          const isWarning = student.currentAbsenceStreak >= state.settings.warningThreshold;

          return (
            <div
              key={student.id}
              className={`p-3.5 rounded-2xl bg-white dark:bg-slate-900 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                status === 'present'
                  ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/10'
                  : status === 'late'
                  ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/10'
                  : status === 'leave'
                  ? 'border-blue-200 dark:border-blue-900/60 bg-blue-50/10'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Student Details & Status Badges */}
              <div
                className="flex items-center space-x-3 cursor-pointer group"
                onClick={() => onSelectStudent(student.id)}
              >
                <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-slate-800 flex items-center justify-center font-black text-sm text-sky-700 dark:text-sky-400 shrink-0 border border-sky-100 dark:border-slate-700 overflow-hidden">
                  {student.photoUrl ? (
                    <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
                  ) : (
                    student.fullName.substring(0, 2).toUpperCase()
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                      {student.fullName}
                    </span>

                    {/* Unpaid Fee Red Dot */}
                    {isUnpaid && (
                      <span
                        title="Unpaid Monthly Fee!"
                        className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 flex items-center gap-0.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                        Fee Unpaid
                      </span>
                    )}

                    {/* 7-Day Warning Badge */}
                    {isWarning && (
                      <span
                        title={`${student.currentAbsenceStreak} consecutive absences`}
                        className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1"
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        {student.currentAbsenceStreak}d Warning
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {batch?.name || 'Class Group'} • Guardian: {student.guardianName || student.guardianPhone}
                  </div>
                </div>
              </div>

              {/* 4-Segment Toggle: Present / Absent / Late / Leave */}
              <div className="grid grid-cols-4 gap-1 sm:w-88 shrink-0 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                {/* Present (P) */}
                <button
                  type="button"
                  disabled={isLocked || isBlocked}
                  onClick={() => setStatus(student.id, 'present')}
                  className={`min-h-[44px] py-2 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                    status === 'present'
                      ? 'bg-emerald-600 text-white shadow-xs scale-102 font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Present</span>
                </button>

                {/* Absent (A) */}
                <button
                  type="button"
                  disabled={isLocked || isBlocked}
                  onClick={() => setStatus(student.id, 'absent')}
                  className={`min-h-[44px] py-2 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                    status === 'absent'
                      ? 'bg-red-600 text-white shadow-xs scale-102 font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Absent</span>
                </button>

                {/* Late (L) */}
                <button
                  type="button"
                  disabled={isLocked || isBlocked}
                  onClick={() => setStatus(student.id, 'late')}
                  className={`min-h-[44px] py-2 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                    status === 'late'
                      ? 'bg-amber-500 text-white shadow-xs scale-102 font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Late</span>
                </button>

                {/* Leave (LV) */}
                <button
                  type="button"
                  disabled={isLocked || isBlocked}
                  onClick={() => setStatus(student.id, 'leave')}
                  className={`min-h-[44px] py-2 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                    status === 'leave'
                      ? 'bg-blue-600 text-white shadow-xs scale-102 font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <span>Leave</span>
                </button>
              </div>
            </div>
          );
        })}

        {filteredStudents.length === 0 && (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500 space-y-2">
            <Users className="w-8 h-8 mx-auto text-slate-400" />
            <p className="font-semibold text-sm">No active students match this filter.</p>
          </div>
        )}
      </div>

      {/* Sticky Bottom Save Bar */}
      <div className="fixed bottom-14 lg:bottom-4 left-4 right-4 max-w-xl mx-auto z-30 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between">
        <div className="text-xs">
          <span className="font-bold text-emerald-400">
            {markedCount} Marked
          </span>{' '}
          of {filteredStudents.length} Active
          {hasUnsavedChanges && <span className="text-amber-400 ml-2 font-bold">• Unsaved Changes</span>}
        </div>

        <button
          id="save-attendance-bottom-btn"
          disabled={isLocked || isBlocked}
          onClick={handleSaveAttendance}
          className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 font-bold text-xs text-white shadow-md transition-all hover:scale-103 disabled:opacity-50"
        >
          Save Attendance
        </button>
      </div>
    </div>
  );
};
