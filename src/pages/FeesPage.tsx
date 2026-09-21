import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Filter,
  MessageCircle,
  RefreshCw,
  Search,
  Wallet
} from 'lucide-react';
import { AppState, FeeRecord, Student } from '../types';
import { generateMonthlyFeeRecords } from '../lib/storage';
import { getGuardianWhatsAppUrl } from '../lib/share';
import { formatPKDate, formatPKR, formatPKMonth } from '../lib/pakistanFormat';

interface FeesPageProps {
  state: AppState;
  onStateChange: () => void;
  onPayFee: (feeRecord: FeeRecord) => void;
  onSelectStudent: (studentId: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
  initialStatusFilter?: 'all' | 'unpaid' | 'paid' | 'partial' | null;
  onClearInitialStatusFilter?: () => void;
}

export const FeesPage: React.FC<FeesPageProps> = ({
  state,
  onStateChange,
  onPayFee,
  onSelectStudent,
  showToast,
  initialStatusFilter,
  onClearInitialStatusFilter,
}) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid' | 'partial'>(initialStatusFilter || 'all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'monthly' | 'readmission'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (initialStatusFilter !== undefined) {
      setStatusFilter(initialStatusFilter || 'all');
    }
  }, [initialStatusFilter]);

  const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  // Filter fee records for the chosen month or re-admissions
  const monthFeeRecords = useMemo(() => {
    return state.feeRecords.filter((f) => {
      // Type filter
      if (typeFilter !== 'all' && f.feeType !== typeFilter) return false;

      // For monthly fees, match month prefix
      if (f.feeType === 'monthly') {
        if (!f.feeMonth.startsWith(monthStr)) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && f.status !== statusFilter) return false;

      // Search query by student
      if (searchQuery.trim()) {
        const student = state.students.find((s) => s.id === f.studentId);
        if (!student) return false;
        const q = searchQuery.toLowerCase();
        return (
          student.fullName.toLowerCase().includes(q) ||
          student.guardianName.toLowerCase().includes(q) ||
          student.guardianPhone.includes(q)
        );
      }

      return true;
    });
  }, [state.feeRecords, state.students, monthStr, typeFilter, statusFilter, searchQuery]);

  // Aggregate financial metrics for this month
  const currentMonthAll = state.feeRecords.filter((f) => f.feeMonth.startsWith(monthStr) && f.feeType === 'monthly');
  const totalExpected = currentMonthAll.reduce((acc, f) => acc + f.amountDue, 0);
  const totalCollected = currentMonthAll.reduce((acc, f) => acc + f.amountPaid, 0);
  const totalPending = Math.max(0, totalExpected - totalCollected);
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  // Change month stepper
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

  // Generate fee records button for selected month
  const handleGenerateFees = () => {
    const created = generateMonthlyFeeRecords(selectedYear, selectedMonth);
    onStateChange();
    if (created > 0) {
      showToast(`Generated ${created} new fee records for ${monthName}!`, 'success');
    } else {
      showToast(`All active students already have fee records for ${monthName}.`, 'warning');
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner & Month Selector */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Wallet className="w-5 h-5 text-sky-600" />
              <span>Academy Fee Tracking</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Monthly tuition collection, partial balances, and re-admission fines.
            </p>
          </div>

          <div className="flex items-center space-x-2">
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

            {/* Generate Records Button */}
            <button
              onClick={handleGenerateFees}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/80 hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-800 dark:text-sky-200 font-bold text-xs border border-sky-200 dark:border-sky-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
              <span>Sync Fees</span>
            </button>
          </div>
        </div>

        {/* 3 Metrics Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-sky-100 dark:border-slate-800">
          <div className="p-4 rounded-xl bg-sky-50/50 dark:bg-slate-800/50 border border-sky-100 dark:border-slate-700">
            <div className="text-xs font-bold text-slate-500">Total Expected ({monthName})</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums mt-1">
              {formatPKR(totalExpected)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">{currentMonthAll.length} students billed</div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Total Collected</div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 tabular-nums mt-1">
              {formatPKR(totalCollected)}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
              {collectionRate}% collection rate
            </div>
          </div>

          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
            <div className="text-xs font-bold text-red-700 dark:text-red-300">Total Pending / Due</div>
            <div className="text-2xl font-black text-red-600 dark:text-red-400 tabular-nums mt-1">
              {formatPKR(totalPending)}
            </div>
            <div className="text-[11px] text-red-600 dark:text-red-400 font-semibold mt-1">
              {currentMonthAll.filter((f) => f.status !== 'paid').length} defaulters
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search student by name or guardian phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
          >
            <option value="all">All Payment Statuses</option>
            <option value="unpaid">Unpaid Only ⚠</option>
            <option value="partial">Partial Paid Only</option>
            <option value="paid">Fully Paid ✓</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
          >
            <option value="all">All Fee Types</option>
            <option value="monthly">Monthly Fees Only</option>
            <option value="readmission">Re-Admission Fees Only</option>
          </select>
        </div>
      </div>

      {/* Fee Records Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Student</th>
                <th className="px-4 py-3.5">Fee Type</th>
                <th className="px-4 py-3.5">Amount Due</th>
                <th className="px-4 py-3.5">Amount Paid</th>
                <th className="px-4 py-3.5">Balance</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {monthFeeRecords.map((fee) => {
                const student = state.students.find((s) => s.id === fee.studentId);
                if (!student) return null;
                const batch = state.batches.find((b) => b.id === student.batchId);
                const remaining = Math.max(0, fee.amountDue - fee.amountPaid);

                const whatsappUrl = getGuardianWhatsAppUrl(
                  student.guardianPhone,
                  student.fullName,
                  state.settings.academyName,
                  monthName,
                  0,
                  0,
                  0,
                  fee.status === 'paid' ? 'Paid' : `Pending (${formatPKR(remaining)})`
                );

                return (
                  <tr key={fee.id} className="hover:bg-sky-50/40 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Student Name */}
                    <td className="px-5 py-3.5">
                      <div
                        className="cursor-pointer group flex items-center space-x-3"
                        onClick={() => onSelectStudent(student.id)}
                      >
                        <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-slate-800 flex items-center justify-center font-bold text-sky-700 dark:text-sky-400 text-xs shrink-0 border border-sky-100 dark:border-slate-700">
                          {student.fullName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 transition-colors">
                            {student.fullName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {batch?.name || 'Class'} • Guardian: {student.guardianName || student.guardianPhone}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Fee Type */}
                    <td className="px-4 py-3.5">
                      {fee.feeType === 'readmission' ? (
                        <span className="font-bold text-red-600 bg-red-50 dark:bg-red-950 px-2 py-0.5 rounded-full border border-red-200">
                          Re-Admission
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Monthly ({fee.feeMonth.substring(0, 7)})
                        </span>
                      )}
                    </td>

                    {/* Amount Due */}
                    <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                      {formatPKR(fee.amountDue)}
                    </td>

                    {/* Amount Paid */}
                    <td className="px-4 py-3.5 font-semibold text-emerald-600 tabular-nums">
                      {formatPKR(fee.amountPaid)}
                      {fee.paidAt && (
                        <div className="text-[10px] text-slate-400 font-normal">
                          {formatPKDate(fee.paidAt, 'medium')} {fee.method ? `(${fee.method})` : ''}
                        </div>
                      )}
                    </td>

                    {/* Balance */}
                    <td className="px-4 py-3.5 font-bold tabular-nums">
                      {remaining > 0 ? (
                        <span className="text-red-600">{formatPKR(remaining)}</span>
                      ) : (
                        <span className="text-emerald-600">{formatPKR(0)}</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          fee.status === 'paid'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700'
                            : fee.status === 'partial'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700'
                            : 'bg-red-100 dark:bg-red-950 text-red-700'
                        }`}
                      >
                        {fee.status}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {fee.status !== 'paid' ? (
                          <>
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Send WhatsApp Fee Reminder"
                              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 hover:bg-emerald-100"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => onPayFee(fee)}
                              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs"
                            >
                              Mark Paid
                            </button>
                          </>
                        ) : (
                          <span className="flex items-center text-xs font-semibold text-emerald-600 gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Paid
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {monthFeeRecords.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <p className="font-semibold">No fee records match this view.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click &quot;Sync Fees&quot; above to create monthly bills for all active students.
                    </p>
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
