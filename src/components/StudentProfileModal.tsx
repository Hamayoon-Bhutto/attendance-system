import React, { useState } from 'react';
import { AttendanceRecord, Batch, FeeRecord, Holiday, Settings, Student, SuspensionRecord } from '../types';
import {
  X,
  Phone,
  MessageCircle,
  Calendar,
  AlertTriangle,
  Award,
  Wallet,
  Clock,
  History,
  CheckCircle,
  AlertCircle,
  Edit2,
  Trash2,
  CalendarOff
} from 'lucide-react';
import { formatDateKey, isWorkingDay, parseDateKey } from '../lib/attendanceMath';
import { getGuardianWhatsAppUrl } from '../lib/share';
import { getBeltMeta } from '../lib/beltUtils';
import { formatPKDate, formatPKR } from '../lib/pakistanFormat';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  batch?: Batch;
  allAttendance: AttendanceRecord[];
  allFees: FeeRecord[];
  allSuspensions: SuspensionRecord[];
  settings: Settings;
  holidays: Holiday[];
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onPayFee: (feeRecord: FeeRecord) => void;
  onReadmitStudent: (studentId: string) => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  student,
  batch,
  allAttendance,
  allFees,
  allSuspensions,
  settings,
  holidays,
  onEditStudent,
  onDeleteStudent,
  onPayFee,
  onReadmitStudent,
}) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'fees' | 'suspensions'>('attendance');

  if (!isOpen || !student) return null;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Filter student's attendance for this month
  const studentAttendanceMap = new Map<string, string>();
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let leaveCount = 0;
  let workingDaysCount = 0;

  allAttendance.forEach((rec) => {
    if (rec.studentId === student.id && rec.attendanceDate.startsWith(currentMonthStr)) {
      studentAttendanceMap.set(rec.attendanceDate, rec.status);
    }
  });

  // Calculate calendar days in month
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  daysArray.forEach((d) => {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (isWorkingDay(dateStr, settings, holidays)) {
      workingDaysCount++;
      const st = studentAttendanceMap.get(dateStr);
      if (st === 'present') presentCount++;
      else if (st === 'absent') absentCount++;
      else if (st === 'late') lateCount++;
      else if (st === 'leave') leaveCount++;
      else {
        const todayStr = formatDateKey(now);
        if (dateStr < todayStr) absentCount++;
      }
    }
  });

  const denominator = workingDaysCount - leaveCount;
  const percentage = denominator > 0 ? Math.round(((presentCount + lateCount) / denominator) * 1000) / 10 : 0;

  // Student fees
  const studentFees = allFees
    .filter((f) => f.studentId === student.id)
    .sort((a, b) => b.feeMonth.localeCompare(a.feeMonth));

  const hasUnpaidFee = studentFees.some((f) => f.status !== 'paid');

  // Student suspensions
  const studentSuspensions = allSuspensions
    .filter((s) => s.studentId === student.id)
    .sort((a, b) => b.suspendedOn.localeCompare(a.suspendedOn));

  // WhatsApp link
  const whatsappUrl = getGuardianWhatsAppUrl(
    student.guardianPhone,
    student.fullName,
    settings.academyName,
    monthName,
    presentCount,
    workingDaysCount,
    percentage,
    hasUnpaidFee ? 'Unpaid' : 'Paid'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        {/* Top Header Profile Banner */}
        <div className="relative p-5 sm:p-6 bg-linear-to-r from-sky-800 via-sky-900 to-slate-950 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center text-2xl font-black text-amber-400 overflow-hidden shadow-inner shrink-0">
                {student.photoUrl ? (
                  <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
                ) : (
                  student.fullName.substring(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold tracking-tight text-white">{student.fullName}</h2>
                  {/* Taekwondo Belt Badge */}
                  {!student.sourceImported && (() => {
                    const beltMeta = getBeltMeta(student.beltLevel || student.belt);
                    return (
                      <span className={`inline-flex items-center space-x-1.5 text-[11px] font-black px-2.5 py-0.5 rounded-full ${beltMeta.chipClass}`}>
                        <span className={`w-2.5 h-2.5 rounded-full border ${beltMeta.borderColor} ${beltMeta.bgColor}`} />
                        <span>{beltMeta.name}</span>
                      </span>
                    );
                  })()}
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      student.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : student.status === 'suspended'
                        ? 'bg-red-500/30 text-red-200 border border-red-400/40 animate-pulse'
                        : 'bg-slate-500/20 text-slate-300'
                    }`}
                  >
                    {student.sourceImported ? 'Roster' : student.status}
                  </span>
                  {hasUnpaidFee && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-500/30 text-red-200 border border-red-400/40">
                      Fee Unpaid
                    </span>
                  )}
                </div>
                <p className="text-xs text-sky-200 mt-1">
                  Batch: <span className="font-semibold text-white">{batch?.name || 'Standard'}</span> • Monthly Fee:{' '}
                  <span className="font-semibold text-amber-300">{formatPKR(student.monthlyFee)}</span>
                </p>
                <p className="text-xs text-sky-200/80 mt-0.5">
                  Guardian: {student.guardianName || 'N/A'} • Enrolled: {formatPKDate(student.admissionDate, 'medium')}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center space-x-2 shrink-0">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Send WhatsApp update to guardian"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>
              <a
                href={`tel:${student.guardianPhone}`}
                title="Call Guardian"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <Phone className="w-4 h-4" />
              </a>
              <button
                onClick={() => onEditStudent(student)}
                title="Edit Student"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Absence streak warning banner if active and >= warning threshold */}
          {student.currentAbsenceStreak >= settings.warningThreshold && student.status === 'active' && (
            <div className="mt-4 p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-between text-xs text-amber-200">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Suspension Warning:</strong> {student.currentAbsenceStreak} consecutive working-day absences.
                  Suspension triggers at {settings.suspensionThreshold} absences!
                </span>
              </div>
            </div>
          )}

          {/* Suspended Re-admit Banner */}
          {student.status === 'suspended' && (
            <div className="mt-4 p-3 rounded-xl bg-red-950/80 border border-red-500/60 flex items-center justify-between text-xs text-red-200">
              <div className="flex items-center space-x-2">
                <CalendarOff className="w-4 h-4 text-red-400 shrink-0" />
                <span>
                  <strong>Student Suspended:</strong> Exceeded {settings.suspensionThreshold} consecutive absences.
                </span>
              </div>
              <button
                onClick={() => onReadmitStudent(student.id)}
                className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-xs"
              >
                Re-Admit Student ({formatPKR(settings.readmissionFee)})
              </button>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-sky-100 dark:border-slate-800 px-6 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'attendance'
                ? 'border-sky-600 text-sky-700 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Attendance & Heatmap ({percentage}%)</span>
          </button>
          <button
            onClick={() => setActiveTab('fees')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'fees'
                ? 'border-sky-600 text-sky-700 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Fee History ({studentFees.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('suspensions')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'suspensions'
                ? 'border-sky-600 text-sky-700 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Suspension Log ({studentSuspensions.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              {/* Monthly Stats Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                  <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">{presentCount}</div>
                  <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Present Days</div>
                </div>
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60">
                  <div className="text-xl font-bold text-red-700 dark:text-red-300 tabular-nums">{absentCount}</div>
                  <div className="text-[11px] font-semibold text-red-600 dark:text-red-400">Absences</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                  <div className="text-xl font-bold text-amber-700 dark:text-amber-300 tabular-nums">{lateCount}</div>
                  <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Late Marks</div>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
                  <div className="text-xl font-bold text-blue-700 dark:text-blue-300 tabular-nums">{leaveCount}</div>
                  <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Approved Leaves</div>
                </div>
              </div>

              {/* Attendance Calendar Heatmap */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {monthName} Attendance Calendar Heatmap
                  </span>
                  <div className="flex items-center space-x-3 text-[10px] font-semibold text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Present
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-red-500" /> Absent
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" /> Late
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-blue-500" /> Leave
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 dark:bg-slate-700" /> Off
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="text-[10px] font-bold text-slate-400 uppercase py-1">
                      {d}
                    </div>
                  ))}

                  {/* Empty cells for starting weekday */}
                  {Array.from({ length: new Date(currentYear, currentMonth - 1, 1).getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-9" />
                  ))}

                  {daysArray.map((d) => {
                    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const isWorking = isWorkingDay(dateStr, settings, holidays);
                    const status = studentAttendanceMap.get(dateStr);
                    const isFuture = dateStr > formatDateKey(now);

                    let bgClass = 'bg-slate-200 dark:bg-slate-800 text-slate-400';
                    let label = `${d}`;

                    if (!isWorking) {
                      bgClass = 'bg-slate-100 dark:bg-slate-800/40 text-slate-400/60 line-through';
                    } else if (status === 'present') {
                      bgClass = 'bg-emerald-500 text-white font-bold';
                    } else if (status === 'absent') {
                      bgClass = 'bg-red-500 text-white font-bold';
                    } else if (status === 'late') {
                      bgClass = 'bg-amber-500 text-white font-bold';
                    } else if (status === 'leave') {
                      bgClass = 'bg-blue-500 text-white font-bold';
                    } else if (!isFuture) {
                      bgClass = 'bg-red-200 dark:bg-red-900/60 text-red-700 dark:text-red-300';
                    }

                    return (
                      <div
                        key={d}
                        title={`${dateStr}: ${status || (isWorking ? (isFuture ? 'Upcoming' : 'Absent (Unmarked)') : 'Non-working day')}`}
                        className={`h-9 rounded-lg flex flex-col items-center justify-center text-xs transition-transform hover:scale-105 select-none ${bgClass}`}
                      >
                        <span>{label}</span>
                        {status && (
                          <span className="text-[9px] uppercase font-black leading-none opacity-90">
                            {status === 'present' ? 'P' : status === 'absent' ? 'A' : status === 'late' ? 'L' : 'LV'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fees' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Payment Records</span>
                <span className="text-xs text-slate-500">Regular fee: {formatPKR(student.monthlyFee)} / month</span>
              </div>

              {studentFees.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed rounded-xl">
                  No fee records generated yet for this student.
                </div>
              ) : (
                <div className="space-y-2">
                  {studentFees.map((fee) => (
                    <div
                      key={fee.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span>{fee.feeType === 'readmission' ? 'Re-Admission Fee' : `Monthly Fee: ${fee.feeMonth.substring(0, 7)}`}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              fee.status === 'paid'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700'
                                : fee.status === 'partial'
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-700'
                                : 'bg-red-100 dark:bg-red-950 text-red-700'
                            }`}
                          >
                            {fee.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Amount Due: <strong>{formatPKR(fee.amountDue)}</strong> • Paid: <strong>{formatPKR(fee.amountPaid)}</strong>
                          {fee.paidAt && ` • Paid on ${formatPKDate(fee.paidAt, 'medium')}`}
                          {fee.method && ` (${fee.method})`}
                        </div>
                        {fee.note && <div className="text-[11px] text-slate-400 italic mt-0.5">{fee.note}</div>}
                      </div>

                      {fee.status !== 'paid' && (
                        <button
                          onClick={() => onPayFee(fee)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                        >
                          Mark Paid
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'suspensions' && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Suspension History</span>

              {studentSuspensions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed rounded-xl">
                  Clean disciplinary record! No suspensions logged for this student.
                </div>
              ) : (
                <div className="space-y-2">
                  {studentSuspensions.map((susp) => (
                    <div
                      key={susp.id}
                      className="p-3.5 rounded-xl border border-red-200 dark:border-red-950/60 bg-red-50/50 dark:bg-red-950/20 text-xs space-y-1"
                    >
                      <div className="flex justify-between font-bold text-red-700 dark:text-red-400">
                        <span>Suspended on {formatPKDate(susp.suspendedOn, 'medium')}</span>
                        <span>{susp.streakAtSuspension} Absences</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">{susp.reason}</p>
                      <div className="text-[11px] pt-1 text-slate-500 border-t border-red-200/60 dark:border-red-900/60">
                        Status:{' '}
                        {susp.readmittedOn ? (
                          <span className="text-emerald-600 font-semibold">
                            Re-admitted on {formatPKDate(susp.readmittedOn, 'medium')}
                          </span>
                        ) : (
                          <span className="text-red-600 font-bold">Currently Suspended</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm(`Archive ${student.fullName}? (Soft delete preserves attendance and fee logs)`)) {
                onDeleteStudent(student.id);
                onClose();
              }
            }}
            className="flex items-center space-x-1.5 text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Archive Student</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
