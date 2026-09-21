import { AppState, AttendanceRecord, Batch, FeeRecord, Holiday, MonthlyReport, Settings, Student, SuspensionRecord } from '../types';
import { calculateAbsenceStreak, computeMonthlyStats, formatDateKey, isWorkingDay } from './attendanceMath';

const STORAGE_KEY = 'attendpro_sunrise_taekwondo_pk_v4';

export const INITIAL_BATCHES: Batch[] = [
  { id: 'batch-tigers', name: 'Little Tigers (Beginners) - 4:00 PM', isActive: true, sortOrder: 1 },
  { id: 'batch-cadets', name: 'Cadet Warriors (Intermediate) - 5:15 PM', isActive: true, sortOrder: 2 },
  { id: 'batch-juniors', name: 'Junior & Senior Belts - 6:30 PM', isActive: true, sortOrder: 3 },
  { id: 'batch-elite', name: 'Elite Sparring & Black Belts - 7:45 PM', isActive: true, sortOrder: 4 },
];

export const INITIAL_SETTINGS: Settings = {
  id: 1,
  academyName: 'Sunrise Taekwondo Martial Arts Centre',
  logoUrl: '/logo.svg',
  contactPhone: '+92 300 8472910',
  timezone: 'Asia/Karachi',
  weeklyOffDays: [5], // Friday is standard academy off day
  suspensionThreshold: 10,
  warningThreshold: 7,
  readmissionFee: 1500,
  rewardSlots: 3,
  rewardText: 'Master Black Belt 1-on-1 Sparring Session & Gold Medal',
  attendanceLockDays: 45,
  unlockAll: false,
  currency: 'PKR',
  currencySymbol: 'Rs.',
  updatedAt: new Date().toISOString(),
};

export const INITIAL_HOLIDAYS: Holiday[] = [
  { id: 'hol-1', holidayDate: '2026-03-23', title: 'Pakistan Resolution Day' },
  { id: 'hol-2', holidayDate: '2026-08-14', title: 'Independence Day Academy Tournament' },
  { id: 'hol-3', holidayDate: '2026-09-06', title: 'Defence Day Martial Arts Showcase' },
];

// Helper to generate seed dates for current month
function generateInitialData(): AppState {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const currentMonthStr = `${year}-${String(month).padStart(2, '0')}-01`;

  const students: Student[] = [
    {
      id: 'stud-1',
      fullName: 'Hamza Malik',
      guardianName: 'Tariq Malik',
      guardianPhone: '+92 300 5551122',
      batchId: 'batch-elite',
      belt: 'Black',
      admissionDate: `${year}-01-10`,
      monthlyFee: 5000,
      status: 'active',
      currentAbsenceStreak: 0,
      isDeleted: false,
      createdAt: `${year}-01-10T10:00:00Z`,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'stud-2',
      fullName: 'Ayan Ahmed',
      guardianName: 'Ahmed Raza',
      guardianPhone: '+92 321 4443322',
      batchId: 'batch-juniors',
      belt: 'Red',
      admissionDate: `${year}-02-15`,
      monthlyFee: 4500,
      status: 'active',
      currentAbsenceStreak: 0,
      isDeleted: false,
      createdAt: `${year}-02-15T10:00:00Z`,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'stud-3',
      fullName: 'Fatima Zahra',
      guardianName: 'Zahid Hussain',
      guardianPhone: '+92 333 7778899',
      batchId: 'batch-cadets',
      belt: 'Blue',
      admissionDate: `${year}-02-20`,
      monthlyFee: 4000,
      status: 'active',
      currentAbsenceStreak: 0,
      isDeleted: false,
      createdAt: `${year}-02-20T10:00:00Z`,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'stud-4',
      fullName: 'Bilal Khan',
      guardianName: 'Nasir Khan',
      guardianPhone: '+92 302 9991144',
      batchId: 'batch-tigers',
      belt: 'Yellow',
      admissionDate: `${year}-03-01`,
      monthlyFee: 3500,
      status: 'active',
      currentAbsenceStreak: 1,
      isDeleted: false,
      createdAt: `${year}-03-01T10:00:00Z`,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'stud-5',
      fullName: 'Mustafa Shoukat',
      guardianName: 'Shoukat Ali',
      guardianPhone: '+92 345 2226677',
      batchId: 'batch-cadets',
      belt: 'Green',
      admissionDate: `${year}-03-12`,
      monthlyFee: 4000,
      status: 'active',
      currentAbsenceStreak: 7, // Reached Warning Threshold (7 days!)
      isDeleted: false,
      createdAt: `${year}-03-12T10:00:00Z`,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'stud-6',
      fullName: 'Omar Farooq',
      guardianName: 'Farooq Javed',
      guardianPhone: '+92 311 8883344',
      batchId: 'batch-juniors',
      belt: 'Blue',
      admissionDate: `${year}-01-05`,
      monthlyFee: 4500,
      status: 'suspended', // Suspended student with 10 absences
      currentAbsenceStreak: 10,
      isDeleted: false,
      createdAt: `${year}-01-05T10:00:00Z`,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'stud-7',
      fullName: 'Emaan Tariq',
      guardianName: 'Tariq Mehmood',
      guardianPhone: '+92 300 1114455',
      batchId: 'batch-tigers',
      belt: 'White',
      admissionDate: `${year}-04-01`,
      monthlyFee: 3500,
      status: 'active',
      currentAbsenceStreak: 0,
      isDeleted: false,
      createdAt: `${year}-04-01T10:00:00Z`,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'stud-8',
      fullName: 'Zainab Hussain',
      guardianName: 'Altaf Hussain',
      guardianPhone: '+92 322 3338877',
      batchId: 'batch-elite',
      belt: 'Black',
      admissionDate: `${year}-01-22`,
      monthlyFee: 5000,
      status: 'active',
      currentAbsenceStreak: 0,
      isDeleted: false,
      createdAt: `${year}-01-22T10:00:00Z`,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'stud-9',
      fullName: 'Usman Javed',
      guardianName: 'Javed Iqbal',
      guardianPhone: '+92 303 6665544',
      batchId: 'batch-cadets',
      belt: 'Green',
      admissionDate: `${year}-03-25`,
      monthlyFee: 4000,
      status: 'active',
      currentAbsenceStreak: 0,
      isDeleted: false,
      createdAt: `${year}-03-25T10:00:00Z`,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'stud-10',
      fullName: 'Hassan Raza',
      guardianName: 'Raza Ali',
      guardianPhone: '+92 334 7772211',
      batchId: 'batch-juniors',
      belt: 'Blue',
      admissionDate: `${year}-02-18`,
      monthlyFee: 4500,
      status: 'active',
      currentAbsenceStreak: 0,
      isDeleted: false,
      createdAt: `${year}-02-18T10:00:00Z`,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'stud-11',
      fullName: 'Maryam Noor',
      guardianName: 'Noor Alam',
      guardianPhone: '+92 300 4448899',
      batchId: 'batch-tigers',
      belt: 'White',
      admissionDate: `${year}-04-05`,
      monthlyFee: 3500,
      status: 'active',
      currentAbsenceStreak: 0,
      isDeleted: false,
      createdAt: `${year}-04-05T10:00:00Z`,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'stud-12',
      fullName: 'Saad Qureshi',
      guardianName: 'Asim Qureshi',
      guardianPhone: '+92 321 9992233',
      batchId: 'batch-elite',
      belt: 'Red',
      admissionDate: `${year}-01-14`,
      monthlyFee: 5000,
      status: 'active',
      currentAbsenceStreak: 0,
      isDeleted: false,
      createdAt: `${year}-01-14T10:00:00Z`,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'stud-13',
      fullName: 'Ibrahim Shah',
      guardianName: 'Waqar Shah',
      guardianPhone: '+92 346 5554433',
      batchId: 'batch-cadets',
      belt: 'Yellow',
      admissionDate: `${year}-03-08`,
      monthlyFee: 4000,
      status: 'active',
      currentAbsenceStreak: 0,
      isDeleted: false,
      createdAt: `${year}-03-08T10:00:00Z`,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'stud-14',
      fullName: 'Ayesha Siddiqui',
      guardianName: 'Adnan Siddiqui',
      guardianPhone: '+92 333 1119922',
      batchId: 'batch-juniors',
      belt: 'Yellow',
      admissionDate: `${year}-02-11`,
      monthlyFee: 4500,
      status: 'active',
      currentAbsenceStreak: 0,
      isDeleted: false,
      createdAt: `${year}-02-11T10:00:00Z`,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'stud-15',
      fullName: 'Daniyal Baig',
      guardianName: 'Kamran Baig',
      guardianPhone: '+92 301 8887766',
      batchId: 'batch-cadets',
      belt: 'White',
      admissionDate: `${year}-03-19`,
      monthlyFee: 4000,
      status: 'active',
      currentAbsenceStreak: 8, // Exceeded 7-day warning
      isDeleted: false,
      createdAt: `${year}-03-19T10:00:00Z`,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'stud-16',
      fullName: 'Rayyan Butt',
      guardianName: 'Zubair Butt',
      guardianPhone: '+92 312 4445566',
      batchId: 'batch-tigers',
      belt: 'White',
      admissionDate: `${year}-04-12`,
      monthlyFee: 3500,
      status: 'active',
      currentAbsenceStreak: 0,
      isDeleted: false,
      createdAt: `${year}-04-12T10:00:00Z`,
      updatedAt: new Date().toISOString(),
    },
  ];

  // Generate attendance records for past working days of this month
  const attendance: AttendanceRecord[] = [];
  const currentDay = now.getDate();

  for (let d = 1; d <= currentDay; d++) {
    const dayDate = new Date(year, month - 1, d);
    const dateStr = formatDateKey(dayDate);
    const dayOfWeek = dayDate.getDay();

    // Skip weekly off days and holidays dynamically based on academy settings
    if (!isWorkingDay(dateStr, INITIAL_SETTINGS, INITIAL_HOLIDAYS)) {
      continue;
    }

    students.forEach((student) => {
      let status: 'present' | 'absent' | 'late' | 'leave' = 'present';

      if (student.id === 'stud-1') {
        status = 'present'; // 100% Star candidate
      } else if (student.id === 'stud-2') {
        status = d === 4 ? 'late' : 'present';
      } else if (student.id === 'stud-3') {
        status = d === 8 ? 'leave' : 'present';
      } else if (student.id === 'stud-4') {
        status = d === currentDay ? 'absent' : d % 6 === 0 ? 'late' : 'present';
      } else if (student.id === 'stud-5') {
        // Bilal Mustafa: absent for recent working days to yield streak 7
        status = 'absent';
      } else if (student.id === 'stud-6') {
        // Omar Khalid: continuously absent
        status = 'absent';
      } else {
        status = (student.id.charCodeAt(5) + d) % 9 === 0 ? 'absent' : 'present';
      }

      attendance.push({
        id: `att-${student.id}-${dateStr}`,
        studentId: student.id,
        attendanceDate: dateStr,
        status,
        markedAt: `${dateStr}T16:00:00Z`,
      });
    });
  }

  const feeRecords: FeeRecord[] = [
    {
      id: 'fee-1',
      studentId: 'stud-1',
      feeMonth: currentMonthStr,
      feeType: 'monthly',
      amountDue: 5000,
      amountPaid: 5000,
      status: 'paid',
      method: 'bank',
      paidAt: `${year}-${String(month).padStart(2, '0')}-02T09:00:00Z`,
      note: 'Transferred via Meezan Bank',
      createdAt: currentMonthStr,
    },
    {
      id: 'fee-2',
      studentId: 'stud-2',
      feeMonth: currentMonthStr,
      feeType: 'monthly',
      amountDue: 4500,
      amountPaid: 4500,
      status: 'paid',
      method: 'cash',
      paidAt: `${year}-${String(month).padStart(2, '0')}-03T17:30:00Z`,
      note: 'Paid cash at academy counter',
      createdAt: currentMonthStr,
    },
    {
      id: 'fee-3',
      studentId: 'stud-3',
      feeMonth: currentMonthStr,
      feeType: 'monthly',
      amountDue: 4000,
      amountPaid: 2500,
      status: 'partial',
      method: 'cash',
      paidAt: `${year}-${String(month).padStart(2, '0')}-05T18:00:00Z`,
      note: 'Remaining balance Rs. 1,500 due next week',
      createdAt: currentMonthStr,
    },
    {
      id: 'fee-4',
      studentId: 'stud-4',
      feeMonth: currentMonthStr,
      feeType: 'monthly',
      amountDue: 3500,
      amountPaid: 0,
      status: 'unpaid', // Defaulter flag
      createdAt: currentMonthStr,
    },
    {
      id: 'fee-5',
      studentId: 'stud-5',
      feeMonth: currentMonthStr,
      feeType: 'monthly',
      amountDue: 4000,
      amountPaid: 0,
      status: 'unpaid',
      createdAt: currentMonthStr,
    },
    {
      id: 'fee-7',
      studentId: 'stud-7',
      feeMonth: currentMonthStr,
      feeType: 'monthly',
      amountDue: 3500,
      amountPaid: 3500,
      status: 'paid',
      method: 'online',
      paidAt: `${year}-${String(month).padStart(2, '0')}-04T12:00:00Z`,
      note: 'JazzCash payment receipt #88129',
      createdAt: currentMonthStr,
    },
    {
      id: 'fee-8',
      studentId: 'stud-8',
      feeMonth: currentMonthStr,
      feeType: 'monthly',
      amountDue: 5000,
      amountPaid: 5000,
      status: 'paid',
      method: 'cash',
      paidAt: `${year}-${String(month).padStart(2, '0')}-01T15:00:00Z`,
      createdAt: currentMonthStr,
    },
    {
      id: 'fee-9',
      studentId: 'stud-9',
      feeMonth: currentMonthStr,
      feeType: 'monthly',
      amountDue: 4000,
      amountPaid: 0,
      status: 'unpaid',
      createdAt: currentMonthStr,
    },
    {
      id: 'fee-11',
      studentId: 'stud-11',
      feeMonth: currentMonthStr,
      feeType: 'monthly',
      amountDue: 3500,
      amountPaid: 3500,
      status: 'paid',
      method: 'cash',
      paidAt: `${year}-${String(month).padStart(2, '0')}-02T16:00:00Z`,
      createdAt: currentMonthStr,
    },
    {
      id: 'fee-12',
      studentId: 'stud-12',
      feeMonth: currentMonthStr,
      feeType: 'monthly',
      amountDue: 5000,
      amountPaid: 2500,
      status: 'partial',
      method: 'bank',
      paidAt: `${year}-${String(month).padStart(2, '0')}-05T11:00:00Z`,
      note: 'Partial installment, 2nd half due on 20th',
      createdAt: currentMonthStr,
    },
    {
      id: 'fee-13',
      studentId: 'stud-13',
      feeMonth: currentMonthStr,
      feeType: 'monthly',
      amountDue: 4000,
      amountPaid: 4000,
      status: 'paid',
      method: 'online',
      paidAt: `${year}-${String(month).padStart(2, '0')}-01T14:30:00Z`,
      createdAt: currentMonthStr,
    },
    {
      id: 'fee-14',
      studentId: 'stud-14',
      feeMonth: currentMonthStr,
      feeType: 'monthly',
      amountDue: 4500,
      amountPaid: 0,
      status: 'unpaid',
      createdAt: currentMonthStr,
    },
    {
      id: 'fee-15',
      studentId: 'stud-15',
      feeMonth: currentMonthStr,
      feeType: 'monthly',
      amountDue: 4000,
      amountPaid: 0,
      status: 'unpaid',
      createdAt: currentMonthStr,
    },
    {
      id: 'fee-16',
      studentId: 'stud-16',
      feeMonth: currentMonthStr,
      feeType: 'monthly',
      amountDue: 3500,
      amountPaid: 3500,
      status: 'paid',
      method: 'cash',
      paidAt: `${year}-${String(month).padStart(2, '0')}-03T18:00:00Z`,
      createdAt: currentMonthStr,
    },
  ];

  const suspensions: SuspensionRecord[] = [
    {
      id: 'susp-1',
      studentId: 'stud-6',
      suspendedOn: `${year}-${String(month).padStart(2, '0')}-12`,
      streakAtSuspension: 10,
      reason: 'Automated: 10 consecutive working-day absences without approved leave',
    },
  ];

  const monthlyReports: MonthlyReport[] = [];

  const activityLogs = [
    {
      id: 'log-1',
      action: 'system_initialized',
      entity: 'system',
      details: { academy: 'Sunrise Taekwondo Martial Arts Centre' },
      createdAt: new Date().toISOString(),
    },
  ];

  return {
    settings: INITIAL_SETTINGS,
    batches: INITIAL_BATCHES,
    holidays: INITIAL_HOLIDAYS,
    students,
    attendance,
    feeRecords,
    suspensions,
    monthlyReports,
    activityLogs,
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: AppState = JSON.parse(raw);
      if (parsed && parsed.students && parsed.settings) {
        // Ensure belt rank exists on every student
        const defaultBelts = ['White', 'Yellow', 'Green', 'Blue', 'Red', 'Black'] as const;
        parsed.students = parsed.students.map((s, idx) => ({
          ...s,
          belt: s.belt || defaultBelts[idx % defaultBelts.length],
        }));

        // Ensure batches have sortOrder
        if (parsed.batches) {
          parsed.batches = parsed.batches.map((b, idx) => ({
            ...b,
            sortOrder: b.sortOrder !== undefined ? b.sortOrder : idx + 1,
          }));
        }

        // Ensure Pakistan currency
        if (!parsed.settings.currency) {
          parsed.settings.currency = 'PKR';
          parsed.settings.currencySymbol = 'Rs.';
        }

        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load state from localStorage:', e);
  }

  const initial = generateInitialData();
  saveState(initial);
  return initial;
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state to localStorage:', e);
  }
}

export function resetToRichDemoData(): AppState {
  const fresh = generateInitialData();
  saveState(fresh);
  return fresh;
}

export function resetToInitialData(): AppState {
  const initial = generateInitialData();
  saveState(initial);
  return initial;
}

/**
 * Upsert attendance marks for a date and update student absence streaks automatically
 */
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
    if (student.status === 'active' && !student.isDeleted) {
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
    if (student.status === 'active' && !student.isDeleted) {
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
