import * as XLSX from 'xlsx';
import { AppState } from '../types';
import { StudentMonthStats } from './attendanceMath';

export function exportMonthlyReportExcel(
  year: number,
  month: number,
  stats: StudentMonthStats[],
  academyName: string
): void {
  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  const filename = `Attendance-Report-${year}-${String(month).padStart(2, '0')}.xlsx`;

  const rows = stats.map((s, idx) => ({
    'Rank': s.rank || idx + 1,
    'Student Name': s.student.fullName,
    'Guardian Name': s.student.guardianName || '',
    'Guardian Phone': s.student.guardianPhone || '',
    'Working Days': s.workingDays,
    'Present (P)': s.present,
    'Absent (A)': s.absent,
    'Late (L)': s.late,
    'Leave (LV)': s.leave,
    'Attendance %': s.percentage,
    'Status': s.student.status,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 8 },  // Rank
    { wch: 22 }, // Student Name
    { wch: 20 }, // Guardian Name
    { wch: 18 }, // Guardian Phone
    { wch: 14 }, // Working Days
    { wch: 12 }, // Present
    { wch: 12 }, // Absent
    { wch: 10 }, // Late
    { wch: 12 }, // Leave
    { wch: 14 }, // Attendance %
    { wch: 12 }, // Status
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Report ${year}-${month}`);
  XLSX.writeFile(workbook, filename);
}

export function exportAllDataExcel(state: AppState): void {
  const today = new Date().toISOString().substring(0, 10);
  const filename = `AttendPro-FullBackup-${today}.xlsx`;
  const workbook = XLSX.utils.book_new();

  // 1. Students Sheet
  const studentsRows = state.students.map((s) => ({
    ID: s.id,
    'Full Name': s.fullName,
    'Guardian Name': s.guardianName,
    'Guardian Phone': s.guardianPhone,
    'Batch ID': s.batchId,
    'Admission Date': s.admissionDate,
    'Monthly Fee': s.monthlyFee,
    Status: s.status,
    'Absence Streak': s.currentAbsenceStreak,
    'Is Archived': s.isDeleted,
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(studentsRows), 'Students');

  // 2. Attendance Sheet
  const attRows = state.attendance.map((a) => ({
    ID: a.id,
    'Student ID': a.studentId,
    Date: a.attendanceDate,
    Status: a.status,
    Note: a.note || '',
    'Marked At': a.markedAt,
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(attRows), 'Attendance');

  // 3. Fee Records Sheet
  const feeRows = state.feeRecords.map((f) => ({
    ID: f.id,
    'Student ID': f.studentId,
    Month: f.feeMonth,
    Type: f.feeType,
    'Amount Due': f.amountDue,
    'Amount Paid': f.amountPaid,
    Status: f.status,
    Method: f.method || '',
    'Paid At': f.paidAt || '',
    Note: f.note || '',
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(feeRows), 'Fee Records');

  // 4. Suspensions Sheet
  const suspRows = state.suspensions.map((s) => ({
    ID: s.id,
    'Student ID': s.studentId,
    'Suspended On': s.suspendedOn,
    'Absence Streak': s.streakAtSuspension,
    Reason: s.reason,
    'Readmitted On': s.readmittedOn || 'Still Suspended',
    'Readmission Fee ID': s.readmissionFeeId || '',
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(suspRows), 'Suspensions');

  // 5. Batches & Settings
  const batchRows = state.batches.map((b) => ({
    ID: b.id,
    Name: b.name,
    Active: b.isActive,
    Order: b.sortOrder,
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(batchRows), 'Batches');

  const settingsRows = [
    {
      'Academy Name': state.settings.academyName,
      'Contact Phone': state.settings.contactPhone,
      Timezone: state.settings.timezone,
      'Suspension Threshold': state.settings.suspensionThreshold,
      'Warning Threshold': state.settings.warningThreshold,
      'Readmission Fee': state.settings.readmissionFee,
      'Reward Slots': state.settings.rewardSlots,
      'Reward Text': state.settings.rewardText,
    },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(settingsRows), 'Settings');

  XLSX.writeFile(workbook, filename);
}
