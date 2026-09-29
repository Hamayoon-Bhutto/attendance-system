import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Lock,
  MessageCircle,
  Share2,
  Users
} from 'lucide-react';
import { AppState } from '../types';
import { computeMonthlyStats } from '../lib/attendanceMath';
import { exportMonthlyReportPdf } from '../lib/exportPdf';
import { exportMonthlyReportExcel } from '../lib/exportExcel';
import { sharePdfFile, getGuardianWhatsAppUrl } from '../lib/share';
import { closeMonthSnapshot } from '../lib/storage';

interface ReportsPageProps {
  state: AppState;
  onStateChange: () => void;
  onSelectStudent: (studentId: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  state,
  onStateChange,
  onSelectStudent,
  showToast,
}) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all');

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });
  const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

  // Check if month already closed
  const closedReport = state.monthlyReports.find((r) => r.reportMonth.startsWith(monthStr));

  // Calculate monthly stats
  const allStats = useMemo(() => {
    return computeMonthlyStats(
      selectedYear,
      selectedMonth,
      state.students,
      state.attendance,
      state.settings,
      state.holidays
    );
  }, [selectedYear, selectedMonth, state.students, state.attendance, state.settings, state.holidays]);

  // Filter by batch
  const filteredStats = useMemo(() => {
    if (selectedBatchId === 'all') return allStats;
    return allStats.filter((st) => st.student.batchId === selectedBatchId);
  }, [allStats, selectedBatchId]);

  // Metrics
  const workingDays = filteredStats[0]?.workingDays || 0;
  const totalPresents = filteredStats.reduce((a, s) => a + s.present, 0);
  const totalAbsents = filteredStats.reduce((a, s) => a + s.absent, 0);
  const avgAttendance = filteredStats.length > 0
    ? Math.round(
        (filteredStats.reduce((a, s) => a + s.percentage, 0) / filteredStats.length) * 10
      ) / 10
    : 0;

  const changeMonth = (delta: number) => {
    let m = selectedMonth + delta;
    let y = selectedYear;
    if (m > 12) {
      m = 1;
      y++;
    } else if (m < 1) {
      m = 12;
      y--;
    }
    setSelectedMonth(m);
    setSelectedYear(y);
  };

  // Export PDF
  const handleExportPdf = () => {
    if (filteredStats.length === 0) {
      showToast('No student attendance records to export.', 'warning');
      return;
    }
    exportMonthlyReportPdf(selectedYear, selectedMonth, filteredStats, state.settings);
    showToast(`Exported ${monthName} Attendance Report PDF!`, 'success');
  };

  // Export Excel
  const handleExportExcel = () => {
    if (filteredStats.length === 0) {
      showToast('No student records to export.', 'warning');
      return;
    }
    exportMonthlyReportExcel(selectedYear, selectedMonth, filteredStats, state.settings.academyName);
    showToast(`Downloaded ${monthName} Excel Workbook!`, 'success');
  };

  // Share via WhatsApp / Web Share
  const handleShare = async () => {
    if (filteredStats.length === 0) return;
    const doc = exportMonthlyReportPdf(selectedYear, selectedMonth, filteredStats, state.settings);
    const pdfBlob = doc.output('blob');
    const filename = `Report-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.pdf`;
    const shareText = `Monthly Attendance Summary for ${monthName} (${state.settings.academyName}). Average Attendance: ${avgAttendance}%.`;

    const res = await sharePdfFile(pdfBlob, filename, `${state.settings.academyName} Attendance Report`, shareText);
    showToast(res.message, 'success');
  };

  // Close Month snapshot
  const handleCloseMonth = () => {
    if (confirm(`Finalize and close month snapshot for ${monthName}? This archives statistics and prepares the next billing cycle.`)) {
      const rep = closeMonthSnapshot(selectedYear, selectedMonth);
      onStateChange();
      showToast(`Month ${monthName} successfully closed and archived!`, 'success');
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner & Export Actions */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-600" />
              <span>Monthly Attendance Reports</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Generate official attendance sheets, PDF certificates, and Excel spreadsheets.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Month Stepper */}
            <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => changeMonth(-1)}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold px-2 text-slate-800 dark:text-slate-200 select-none">
                {monthName}
              </span>
              <button
                onClick={() => changeMonth(1)}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Export PDF */}
            <button
              onClick={handleExportPdf}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF Report</span>
            </button>

            {/* Export Excel */}
            <button
              onClick={handleExportExcel}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel (.xlsx)</span>
            </button>

            {/* Share WhatsApp */}
            <button
              onClick={handleShare}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-colors"
              title="Share PDF via WhatsApp or Web Share"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Stat Boxes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Working Days</div>
            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
              {workingDays}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
            <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
              Total Present Marks
            </div>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 tabular-nums mt-0.5">
              {totalPresents}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
            <div className="text-[11px] font-semibold text-red-600 dark:text-red-400 uppercase">Total Absences</div>
            <div className="text-xl font-black text-red-600 dark:text-red-400 tabular-nums mt-0.5">
              {totalAbsents}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/50">
            <div className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 uppercase">Avg. Attendance</div>
            <div className="text-xl font-black text-sky-700 dark:text-sky-300 tabular-nums mt-0.5">
              {avgAttendance}%
            </div>
          </div>
        </div>

        {/* Batch Filter and Close Month Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
          {/* Batch Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedBatchId('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                selectedBatchId === 'all'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              All Batches ({allStats.length})
            </button>
            {state.batches.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBatchId(b.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                  selectedBatchId === b.id
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>

          {/* Close Month snapshot indicator/button */}
          {closedReport ? (
            <div className="flex items-center space-x-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-3 py-1.5 rounded-xl border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Month Closed on {closedReport.generatedAt.substring(0, 10)}</span>
            </div>
          ) : (
            <button
              onClick={handleCloseMonth}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Finalize & Close Month</span>
            </button>
          )}
        </div>
      </div>

      {/* Comprehensive Report Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5 text-center w-12">#</th>
                <th className="px-4 py-3.5">Student Name</th>
                <th className="px-4 py-3.5">Guardian Phone</th>
                <th className="px-3 py-3.5 text-center">Working Days</th>
                <th className="px-3 py-3.5 text-center text-emerald-600">Present (P)</th>
                <th className="px-3 py-3.5 text-center text-red-600">Absent (A)</th>
                <th className="px-3 py-3.5 text-center text-amber-600">Late (L)</th>
                <th className="px-3 py-3.5 text-center text-blue-600">Leave (LV)</th>
                <th className="px-4 py-3.5">Attendance %</th>
                <th className="px-4 py-3.5 text-right">Direct WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStats.map((st, idx) => {
                const whatsappUrl = getGuardianWhatsAppUrl(
                  st.student.guardianPhone,
                  st.student.fullName,
                  state.settings.academyName,
                  monthName,
                  st.present,
                  st.workingDays,
                  st.percentage,
                  'Active'
                );

                return (
                  <tr
                    key={st.student.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-center font-bold text-slate-400">
                      {st.rank || idx + 1}
                    </td>
                    <td className="px-4 py-3.5">
                      <div
                        className="cursor-pointer font-bold text-slate-900 dark:text-white hover:text-sky-600 transition-colors"
                        onClick={() => onSelectStudent(st.student.id)}
                      >
                        {st.student.fullName}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Guardian: {st.student.guardianName || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      {st.student.guardianPhone}
                    </td>
                    <td className="px-3 py-3.5 text-center font-semibold tabular-nums">
                      {st.workingDays}
                    </td>
                    <td className="px-3 py-3.5 text-center text-emerald-600 font-bold tabular-nums">
                      {st.present}
                    </td>
                    <td className="px-3 py-3.5 text-center text-red-600 font-bold tabular-nums">
                      {st.absent}
                    </td>
                    <td className="px-3 py-3.5 text-center text-amber-600 font-semibold tabular-nums">
                      {st.late}
                    </td>
                    <td className="px-3 py-3.5 text-center text-blue-600 font-semibold tabular-nums">
                      {st.leave}
                    </td>
                    <td className="px-4 py-3.5 font-black text-sm text-sky-700 dark:text-sky-400 tabular-nums">
                      {st.percentage}%
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] hover:bg-emerald-100 transition-colors"
                        title="Send guardian individual monthly report"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Send Slip</span>
                      </a>
                    </td>
                  </tr>
                );
              })}

              {filteredStats.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400">
                    No attendance records for the selected month and batch.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
