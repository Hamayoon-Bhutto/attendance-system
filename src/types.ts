export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export type StudentStatus = 'active' | 'suspended' | 'left';

export type FeeStatus = 'unpaid' | 'partial' | 'paid';

export type FeeType = 'monthly' | 'readmission';

export type TaekwondoBelt = 'White' | 'Yellow' | 'Green' | 'Blue' | 'Red' | 'Black';

export interface Batch {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

export interface Holiday {
  id: string;
  holidayDate: string; // YYYY-MM-DD
  title: string;
}

export interface Student {
  id: string;
  fullName: string;
  guardianName: string;
  guardianPhone: string;
  batchId: string;
  beltLevel?: TaekwondoBelt;
  belt?: TaekwondoBelt;
  admissionDate: string; // YYYY-MM-DD
  monthlyFee: number;
  photoUrl?: string;
  status: StudentStatus;
  currentAbsenceStreak: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  /** Fields preserved from the supplied source sheet. */
  rollNo?: string;
  sourceNote?: string;
  reviewNeeded?: boolean;
  sourceImported?: boolean;
}

export interface SourceAttendanceSession {
  id: string;
  sessionKey: string;
  sessionDate: string | null;
}

export interface SourceAttendanceRecord {
  id: string;
  studentId: string;
  sessionKey: string;
  status: 'present' | 'absent' | 'not_recorded';
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  attendanceDate: string; // YYYY-MM-DD
  status: AttendanceStatus;
  note?: string;
  markedAt: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  feeMonth: string; // YYYY-MM-01
  feeType: FeeType;
  amountDue: number;
  amountPaid: number;
  status: FeeStatus;
  method?: 'cash' | 'bank' | 'online' | 'other';
  paidAt?: string;
  note?: string;
  createdAt: string;
}

export interface SuspensionRecord {
  id: string;
  studentId: string;
  suspendedOn: string; // YYYY-MM-DD
  streakAtSuspension: number;
  reason: string;
  readmittedOn?: string;
  readmissionFeeId?: string;
}

export interface MonthlyReport {
  id: string;
  reportMonth: string; // YYYY-MM-01
  studentId: string;
  workingDays: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  percentage: number;
  rank?: number;
  isStar: boolean;
  generatedAt: string;
}

export interface Settings {
  id: number;
  academyName: string;
  logoUrl?: string;
  contactPhone: string;
  timezone: string;
  weeklyOffDays: number[]; // 0=Sunday, 1=Monday... 5=Friday, 6=Saturday
  suspensionThreshold: number; // default 10
  warningThreshold: number; // default 7
  readmissionFee: number; // default 50
  rewardSlots: number; // default 3
  rewardText: string; // default "Personal training session"
  attendanceLockDays: number; // default 45
  unlockAll: boolean; // default false
  currency?: string; // default 'PKR'
  currencySymbol?: string; // default 'Rs.'
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, any>;
  createdAt: string;
}

export interface AppState {
  settings: Settings;
  batches: Batch[];
  holidays: Holiday[];
  students: Student[];
  attendance: AttendanceRecord[];
  feeRecords: FeeRecord[];
  suspensions: SuspensionRecord[];
  monthlyReports: MonthlyReport[];
  activityLogs: ActivityLog[];
  sourceSessions: SourceAttendanceSession[];
  sourceAttendance: SourceAttendanceRecord[];
}
