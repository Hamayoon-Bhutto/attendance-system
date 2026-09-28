import { AttendanceRecord, Holiday, Settings, Student } from '../types';

/**
 * Format a Date object to YYYY-MM-DD in local time
 */
export function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string into a local Date object
 */
export function parseDateKey(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Check if a specific date is a working day (skipping weekly off days & holidays)
 */
export function isWorkingDay(dateStr: string, settings: Settings, holidays: Holiday[]): boolean {
  const d = parseDateKey(dateStr);
  const dayOfWeek = d.getDay(); // 0=Sunday, 5=Friday, 6=Saturday

  // Check weekly off days
  if (settings.weeklyOffDays.includes(dayOfWeek)) {
    return false;
  }

  // Check holiday list
  const isHoliday = holidays.some((h) => h.holidayDate === dateStr);
  if (isHoliday) {
    return false;
  }

  return true;
}

/**
 * Get reason why a date is non-working, if any
 */
export function getNonWorkingReason(dateStr: string, settings: Settings, holidays: Holiday[]): string | null {
  const d = parseDateKey(dateStr);
  const dayOfWeek = d.getDay();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (settings.weeklyOffDays.includes(dayOfWeek)) {
    return `${dayNames[dayOfWeek]} is a weekly off day`;
  }

  const hol = holidays.find((h) => h.holidayDate === dateStr);
  if (hol) {
    return `Official Holiday: ${hol.title}`;
  }

  return null;
}

/**
 * Get all working days for a given year and month (month is 1-12)
 */
export function getWorkingDaysInMonth(year: number, month: number, settings: Settings, holidays: Holiday[]): string[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const workingDays: string[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (isWorkingDay(dayStr, settings, holidays)) {
      workingDays.push(dayStr);
    }
  }

  return workingDays;
}

/**
 * Calculate consecutive absence streak for a student walking backwards from referenceDate.
 * Counted over working days only.
 * Reset to 0 on any Present, Late, or Leave.
 * Non-working days (weekends/holidays) are skipped completely.
 */
export function calculateAbsenceStreak(
  studentId: string,
  referenceDateStr: string,
  allAttendance: AttendanceRecord[],
  settings: Settings,
  holidays: Holiday[]
): number {
  let curr = parseDateKey(referenceDateStr);
  let streak = 0;
  const attendanceMap = new Map<string, string>();

  // Filter student records
  allAttendance.forEach((rec) => {
    if (rec.studentId === studentId) {
      attendanceMap.set(rec.attendanceDate, rec.status);
    }
  });

  // Walk backwards up to 90 calendar days
  for (let i = 0; i < 90; i++) {
    const dateStr = formatDateKey(curr);

    // Only inspect working days
    if (isWorkingDay(dateStr, settings, holidays)) {
      const status = attendanceMap.get(dateStr);

      if (!status) {
        // If it's a past working day with no record, and not today:
        if (i > 0) {
          // Unmarked past day ends the walk
          break;
        }
      } else if (status === 'absent') {
        streak += 1;
      } else if (status === 'present' || status === 'late' || status === 'leave') {
        // Present, Late, or Leave resets the streak!
        break;
      }
    }

    // Step back 1 day
    curr.setDate(curr.getDate() - 1);
  }

  return streak;
}

export interface StudentMonthStats {
  student: Student;
  workingDays: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  percentage: number;
  rank?: number;
  isStar?: boolean;
}

/**
 * Calculate monthly attendance breakdown for all students in a given month (YYYY-MM)
 */
export function computeMonthlyStats(
  year: number,
  month: number,
  students: Student[],
  allAttendance: AttendanceRecord[],
  settings: Settings,
  holidays: Holiday[]
): StudentMonthStats[] {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const workingDays = getWorkingDaysInMonth(year, month, settings, holidays);
  const workingDaysCount = workingDays.length;

  const monthAttendance = allAttendance.filter((a) => a.attendanceDate.startsWith(monthStr));

  // Build map: studentId -> date -> status
  const studentRecordsMap = new Map<string, Map<string, string>>();
  monthAttendance.forEach((rec) => {
    if (!studentRecordsMap.has(rec.studentId)) {
      studentRecordsMap.set(rec.studentId, new Map());
    }
    studentRecordsMap.get(rec.studentId)!.set(rec.attendanceDate, rec.status);
  });

  // Calculate stats for each non-deleted student admitted on or before the month end
  const monthEndDate = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
  // Imported source-sheet students have session marks but no dates, so they
  // must not receive fabricated daily absences or monthly rankings.
  const eligibleStudents = students.filter(
    (s) => !s.isDeleted && !s.sourceImported && s.admissionDate <= monthEndDate
  );

  const stats: StudentMonthStats[] = eligibleStudents.map((student) => {
    const studentMap = studentRecordsMap.get(student.id) || new Map();
    let present = 0;
    let absent = 0;
    let late = 0;
    let leave = 0;

    workingDays.forEach((dateStr) => {
      const status = studentMap.get(dateStr);
      if (status === 'present') present++;
      else if (status === 'absent') absent++;
      else if (status === 'late') late++;
      else if (status === 'leave') leave++;
      else {
        // If not marked on past working days, consider absent according to business rules
        const todayStr = formatDateKey(new Date());
        if (dateStr < todayStr) {
          absent++;
        }
      }
    });

    // Rule: Attendance % = (Present + Late) / (working days - Leave) * 100
    const denominator = workingDaysCount - leave;
    const percentage = denominator > 0 ? Math.round(((present + late) / denominator) * 1000) / 10 : 0;

    return {
      student,
      workingDays: workingDaysCount,
      present,
      absent,
      late,
      leave,
      percentage,
    };
  });

  // Tie-break ranking:
  // 1. Percentage (descending)
  // 2. Fewer Late marks (ascending)
  // 3. Earlier admission date (ascending)
  // Note: Only 'active' students qualify for ranking and rewards; suspended students are excluded from rankings
  const activeStats = stats.filter((s) => s.student.status === 'active');
  const otherStats = stats.filter((s) => s.student.status !== 'active');

  activeStats.sort((a, b) => {
    if (b.percentage !== a.percentage) {
      return b.percentage - a.percentage;
    }
    if (a.late !== b.late) {
      return a.late - b.late; // Fewer late marks wins tie-break
    }
    return a.student.admissionDate.localeCompare(b.student.admissionDate);
  });

  activeStats.forEach((st, idx) => {
    st.rank = idx + 1;
    st.isStar = idx === 0;
  });

  return [...activeStats, ...otherStats];
}
