import { AppState, AttendanceRecord, Batch, FeeRecord, Holiday, MonthlyReport, Settings, Student, SuspensionRecord, SourceAttendanceRecord, SourceAttendanceSession } from '../types';
import { calculateAbsenceStreak, computeMonthlyStats, formatDateKey, isWorkingDay } from './attendanceMath';

const STORAGE_KEY = 'attendpro_sunrise_taekwondo_supabase_v1';

export const INITIAL_BATCHES: Batch[] = [];
export const INITIAL_HOLIDAYS: Holiday[] = [];

export const INITIAL_SETTINGS: Settings = {
  id: 1,
  academyName: 'Sunrise Taekwondo Martial Arts Centre',
  contactPhone: '',
  timezone: 'Asia/Karachi',
  weeklyOffDays: [5],
  suspensionThreshold: 10,
  warningThreshold: 7,
  readmissionFee: 1500,
  rewardSlots: 3,
  rewardText: 'Personal training session',
  attendanceLockDays: 45,
  unlockAll: false,
  currency: 'PKR',
  currencySymbol: 'Rs.',
  updatedAt: new Date().toISOString(),
};

export function createEmptyState(): AppState {
  return {
    settings: { ...INITIAL_SETTINGS },
    batches: [],
    holidays: [],
    students: [],
    attendance: [],
    feeRecords: [],
    suspensions: [],
    monthlyReports: [],
    activityLogs: [],
    sourceSessions: [],
    sourceAttendance: [],
  };
}

type SupabaseStudent = {
  id: string;
  name: string;
  group_id: string;
  roll_no: string;
  source_note: string | null;
  review_needed: boolean;
  created_at?: string;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  belt_level?: Student['belt'];
  admission_date?: string | null;
  monthly_fee?: number | null;
  status?: Student['status'];
  photo_url?: string | null;
  is_deleted?: boolean;
  source_imported?: boolean;
  updated_at?: string;
};

type SupabaseSession = { id: string; session_key: string; session_date: string | null };
type SupabaseAttendance = {
  id: string;
  student_id: string;
  session_id: string;
  status: 'present' | 'absent' | 'late' | 'leave' | 'not_recorded';
  note?: string | null;
  attendance_sessions: SupabaseSession | SupabaseSession[] | null;
};

export function mapSupabaseState(payload: { students: SupabaseStudent[]; attendance: SupabaseAttendance[] }): AppState {
  const state = createEmptyState();
  const groups = [...new Set(payload.students.map((student) => student.group_id))].sort();
  state.batches = groups.map((groupId, index) => ({
    id: groupId,
    name: `Group ${groupId}`,
    isActive: true,
    sortOrder: index + 1,
  }));
  state.students = payload.students.map(mapSupabaseStudent);
  const sessionsByKey = new Map<string, SourceAttendanceSession>();
  const sessionById = new Map<string, SupabaseSession>();
  for (const row of payload.attendance) {
    const relation = Array.isArray(row.attendance_sessions) ? row.attendance_sessions[0] : row.attendance_sessions;
    if (!relation) continue;
    sessionById.set(row.session_id, relation);
    sessionsByKey.set(relation.session_key, {
      id: relation.id,
      sessionKey: relation.session_key,
      sessionDate: relation.session_date,
    });
  }
  state.sourceSessions = [...sessionsByKey.values()].sort((a, b) => {
    const aIndex = Number(a.sessionKey.match(/\d+$/)?.[0] ?? 0);
    const bIndex = Number(b.sessionKey.match(/\d+$/)?.[0] ?? 0);
    return aIndex - bIndex || a.sessionKey.localeCompare(b.sessionKey);
  });
  state.sourceAttendance = payload.attendance.flatMap((row): SourceAttendanceRecord[] => {
    const session = sessionById.get(row.session_id);
    if (!session) return [];
    if (session.session_date && session.session_key.startsWith('daily_') && row.status !== 'not_recorded') {
      state.attendance.push({
        id: row.id,
        studentId: row.student_id,
        attendanceDate: session.session_date,
        status: row.status as 'present' | 'absent' | 'late' | 'leave',
        note: row.note ?? undefined,
        markedAt: '',
      });
    }
    return [{
      id: row.id,
      studentId: row.student_id,
      sessionKey: session.session_key,
      status: row.status === 'late' || row.status === 'leave' ? 'present' : row.status,
    }];
  });
  return state;
}

export function mapSupabaseStudent(student: SupabaseStudent): Student {
  const profilePrefix = '@attendpro-profile:';
  const hasProfileNote = Boolean(student.source_note?.startsWith(profilePrefix));
  let fallback: Record<string, unknown> = {};
  if (student.source_note && hasProfileNote) {
    try {
      fallback = JSON.parse(student.source_note.slice(profilePrefix.length)) as Record<string, unknown>;
    } catch {
      fallback = {};
    }
  }
  return {
    id: student.id,
    fullName: student.name,
    // Profile columns default to '' / 0 after the migration, so fall back to the
    // legacy note whenever the column is still empty.
    guardianName: student.guardian_name || String(fallback.guardianName ?? ''),
    guardianPhone: student.guardian_phone || String(fallback.guardianPhone ?? ''),
    batchId: student.group_id,
    belt: student.belt_level ?? fallback.beltLevel as Student['belt'],
    beltLevel: student.belt_level ?? fallback.beltLevel as Student['belt'],
    admissionDate: student.admission_date ?? String(fallback.admissionDate ?? ''),
    monthlyFee: Number(student.monthly_fee) || Number(fallback.monthlyFee) || 0,
    status: student.status ?? fallback.status as Student['status'] ?? 'active',
    currentAbsenceStreak: 0,
    isDeleted: student.is_deleted ?? false,
    createdAt: student.created_at ?? '',
    updatedAt: student.updated_at ?? student.created_at ?? '',
    rollNo: student.roll_no,
    sourceNote: hasProfileNote ? undefined : student.source_note ?? undefined,
    reviewNeeded: student.review_needed,
    photoUrl: student.photo_url ?? (String(fallback.photoUrl ?? '') || undefined),
    sourceImported: hasProfileNote ? false : student.source_imported ?? true,
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed?.students && parsed?.settings) return parsed;
    }
  } catch (error) {
    console.error('Failed to load cached Supabase state:', error);
  }
  return createEmptyState();
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to cache Supabase state:', error);
  }
}
export function markAttendance(
  attendanceDate: string,
  records: { studentId: string; status: 'present' | 'absent' | 'late' | 'leave'; note?: string }[]
): { updatedCount: number; suspendedStudents: Student[]; warningStudents: Student[] } {
  const state = loadState();
  const existingMap = new Map<string, AttendanceRecord>();

  state.attendance.forEach((r) => {
    existingMap.set(`${r.studentId}_${r.attendanceDate}`, r);
  });

  const affectedStudentIds = new Set<string>();

  records.forEach((rec) => {
    const key = `${rec.studentId}_${attendanceDate}`;
    const existing = existingMap.get(key);

    if (existing) {
      existing.status = rec.status;
      if (rec.note !== undefined) existing.note = rec.note;
      existing.markedAt = new Date().toISOString();
    } else {
      const newRec: AttendanceRecord = {
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        studentId: rec.studentId,
        attendanceDate,
        status: rec.status,
        note: rec.note,
        markedAt: new Date().toISOString(),
      };
      state.attendance.push(newRec);
      existingMap.set(key, newRec);
    }

    affectedStudentIds.add(rec.studentId);
  });

  const suspendedStudents: Student[] = [];
  const warningStudents: Student[] = [];

  // Recalculate streak for all active students (or affected)
  state.students.forEach((student) => {
    if (!student.isDeleted) {
      const streak = calculateAbsenceStreak(
        student.id,
        attendanceDate,
        state.attendance,
        state.settings,
        state.holidays
      );
      student.currentAbsenceStreak = streak;
      student.updatedAt = new Date().toISOString();

      // Warning threshold
      if (streak >= state.settings.warningThreshold && streak < state.settings.suspensionThreshold && student.status === 'active') {
        warningStudents.push(student);
      }

      // Suspension threshold rule: 10 consecutive working days absent
      if (streak >= state.settings.suspensionThreshold && student.status === 'active') {
        student.status = 'suspended';
        suspendedStudents.push(student);

        // Add suspension log
        state.suspensions.push({
          id: `susp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          studentId: student.id,
          suspendedOn: attendanceDate,
          streakAtSuspension: streak,
          reason: `Automated: ${streak} consecutive working-day absences without approved leave`,
        });

        state.activityLogs.unshift({
          id: `log_${Date.now()}`,
          action: 'student_suspended',
          entity: 'student',
          entityId: student.id,
          details: { studentName: student.fullName, streak },
          createdAt: new Date().toISOString(),
        });
      }
    }
  });

  saveState(state);
  return { updatedCount: records.length, suspendedStudents, warningStudents };
}

/**
 * Re-admit a suspended student: sets status to active, resets streak to 0, and creates readmission fee record
 */
export function readmitStudent(studentId: string): AppState {
  const state = loadState();
  const student = state.students.find((s) => s.id === studentId);
  if (!student) return state;

  const today = formatDateKey(new Date());
  const feeMonth = `${today.substring(0, 7)}-01`;

  // Create re-admission fee record
  const feeId = `fee_readmit_${Date.now()}`;
  const feeRecord: FeeRecord = {
    id: feeId,
    studentId: student.id,
    feeMonth,
    feeType: 'readmission',
    amountDue: state.settings.readmissionFee,
    amountPaid: 0,
    status: 'unpaid',
    note: `Re-admission fee charged on ${today}`,
    createdAt: new Date().toISOString(),
  };
  state.feeRecords.push(feeRecord);

  // Update suspension log
  const openSuspension = state.suspensions
    .filter((s) => s.studentId === studentId && !s.readmittedOn)
    .sort((a, b) => b.suspendedOn.localeCompare(a.suspendedOn))[0];

  if (openSuspension) {
    openSuspension.readmittedOn = today;
    openSuspension.readmissionFeeId = feeId;
  }

  // Set student status to active and reset streak
  student.status = 'active';
  student.currentAbsenceStreak = 0;
  student.updatedAt = new Date().toISOString();

  state.activityLogs.unshift({
    id: `log_${Date.now()}`,
    action: 'student_readmitted',
    entity: 'student',
    entityId: student.id,
    details: { studentName: student.fullName, feeAmount: state.settings.readmissionFee },
    createdAt: new Date().toISOString(),
  });

  saveState(state);
  return state;
}

/**
 * Mark fee record as paid or partial
 */
export function recordFeePayment(
  feeRecordId: string,
  amountPaying: number,
  method: 'cash' | 'bank' | 'online' | 'other',
  note?: string
): AppState {
  const state = loadState();
  const record = state.feeRecords.find((r) => r.id === feeRecordId);
  if (!record) return state;

  record.amountPaid = Math.min(record.amountDue, record.amountPaid + amountPaying);
  if (record.amountPaid >= record.amountDue) {
    record.status = 'paid';
  } else if (record.amountPaid > 0) {
    record.status = 'partial';
  } else {
    record.status = 'unpaid';
  }

  record.method = method;
  record.paidAt = new Date().toISOString();
  if (note) record.note = note;

  saveState(state);
  return state;
}

/**
 * Soft-delete / archive a student while preserving historical attendance and fee records
 */
export function softDeleteStudent(studentId: string): AppState {
  const state = loadState();
  const student = state.students.find((s) => s.id === studentId);
  if (student) {
    student.isDeleted = true;
    student.updatedAt = new Date().toISOString();
    state.activityLogs.unshift({
      id: `log_${Date.now()}`,
      action: 'student_archived',
      entity: 'student',
      entityId: student.id,
      details: { studentName: student.fullName },
      createdAt: new Date().toISOString(),
    });
    saveState(state);
  }
  return state;
}

/**
 * Generate monthly fee records for all active students missing one for target month
 */
export function generateMonthlyFeeRecords(yearOrDateStr: number | string, monthNum?: number): number {
  const state = loadState();
  let feeMonth = '';
  if (typeof yearOrDateStr === 'number') {
    const m = monthNum || 1;
    feeMonth = `${yearOrDateStr}-${String(m).padStart(2, '0')}-01`;
  } else {
    feeMonth = `${yearOrDateStr.substring(0, 7)}-01`;
  }
  let createdCount = 0;

  state.students.forEach((student) => {
    if (student.status === 'active' && !student.isDeleted && !student.sourceImported) {
      const exists = state.feeRecords.some(
        (f) => f.studentId === student.id && f.feeMonth === feeMonth && f.feeType === 'monthly'
      );
      if (!exists) {
        state.feeRecords.push({
          id: `fee_${student.id}_${feeMonth}`,
          studentId: student.id,
          feeMonth,
          feeType: 'monthly',
          amountDue: student.monthlyFee,
          amountPaid: 0,
          status: 'unpaid',
          createdAt: new Date().toISOString(),
        });
        createdCount++;
      }
    }
  });

  saveState(state);
  return createdCount;
}

/**
 * Close month: generates monthly_reports, assigns Star of the Month, and generates next month's fee records
 */
export function closeMonth(year: number, month: number): { reportsGenerated: number; starStudentName?: string } {
  const state = loadState();
  const monthStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const stats = computeMonthlyStats(year, month, state.students, state.attendance, state.settings, state.holidays);

  // Remove previous reports for this month
  state.monthlyReports = state.monthlyReports.filter((r) => r.reportMonth !== monthStr);

  let starStudentName: string | undefined;

  stats.forEach((st) => {
    const isStar = st.rank === 1;
    if (isStar) {
      starStudentName = st.student.fullName;
    }

    state.monthlyReports.push({
      id: `rep_${st.student.id}_${monthStr}`,
      reportMonth: monthStr,
      studentId: st.student.id,
      workingDays: st.workingDays,
      present: st.present,
      absent: st.absent,
      late: st.late,
      leave: st.leave,
      percentage: st.percentage,
      rank: st.rank,
      isStar,
      generatedAt: new Date().toISOString(),
    });
  });

  // Calculate next month
  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }
  const nextMonthStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  // Auto-create fee records for next month
  state.students.forEach((student) => {
    if (student.status === 'active' && !student.isDeleted && !student.sourceImported) {
      const hasFee = state.feeRecords.some(
        (f) => f.studentId === student.id && f.feeMonth === nextMonthStr && f.feeType === 'monthly'
      );
      if (!hasFee) {
        state.feeRecords.push({
          id: `fee_${student.id}_${nextMonthStr}`,
          studentId: student.id,
          feeMonth: nextMonthStr,
          feeType: 'monthly',
          amountDue: student.monthlyFee,
          amountPaid: 0,
          status: 'unpaid',
          createdAt: new Date().toISOString(),
        });
      }
    }
  });

  state.activityLogs.unshift({
    id: `log_${Date.now()}`,
    action: 'month_closed',
    entity: 'report',
    details: { month: monthStr, starStudent: starStudentName },
    createdAt: new Date().toISOString(),
  });

  saveState(state);
  return { reportsGenerated: stats.length, starStudentName };
}

export const closeMonthSnapshot = closeMonth;

/**
 * Check if a student currently has unpaid fees
 */
export function hasUnpaidFees(studentId: string, feeRecords: FeeRecord[]): boolean {
  return feeRecords.some((f) => f.studentId === studentId && f.status !== 'paid');
}
