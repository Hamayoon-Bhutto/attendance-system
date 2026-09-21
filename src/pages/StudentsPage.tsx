import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Award,
  Calendar,
  DollarSign,
  Edit2,
  Filter,
  Layers,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
  CheckCircle2,
} from 'lucide-react';
import { AppState, Batch, Student, TaekwondoBelt } from '../types';
import { hasUnpaidFees } from '../lib/storage';
import { getGuardianWhatsAppUrl } from '../lib/share';
import { TAEKWONDO_BELTS, getBeltMeta } from '../lib/beltUtils';
import { formatPKDate, formatPKR } from '../lib/pakistanFormat';

interface StudentsPageProps {
  state: AppState;
  onOpenAddStudent: () => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onSelectStudent: (studentId: string) => void;
  initialBeltFilter?: string | null;
  initialWarningFilter?: boolean;
  onClearInitialFilters?: () => void;
}

export const StudentsPage: React.FC<StudentsPageProps> = ({
  state,
  onOpenAddStudent,
  onEditStudent,
  onDeleteStudent,
  onSelectStudent,
  initialBeltFilter,
  initialWarningFilter = false,
  onClearInitialFilters,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [batchFilter, setBatchFilter] = useState('all');
  const [beltFilter, setBeltFilter] = useState<string>(initialBeltFilter || 'all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'left' | 'archived'>('all');
  const [feeFilter, setFeeFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [warningFilter, setWarningFilter] = useState<boolean>(Boolean(initialWarningFilter));

  useEffect(() => {
    if (initialBeltFilter !== undefined) {
      setBeltFilter(initialBeltFilter || 'all');
    }
  }, [initialBeltFilter]);

  useEffect(() => {
    if (initialWarningFilter !== undefined) {
      setWarningFilter(Boolean(initialWarningFilter));
    }
  }, [initialWarningFilter]);

  // Check if any filter is actively applied
  const isFilterActive =
    searchQuery.trim() !== '' ||
    batchFilter !== 'all' ||
    beltFilter !== 'all' ||
    statusFilter !== 'all' ||
    feeFilter !== 'all' ||
    warningFilter;

  // Filter logic
  const filteredStudents = useMemo(() => {
    return state.students.filter((student) => {
      // Warning streak filter
      if (warningFilter) {
        if (student.isDeleted || student.status !== 'active') return false;
        if (student.currentAbsenceStreak < state.settings.warningThreshold) return false;
      }

      // Archive filter
      if (statusFilter === 'archived') {
        if (!student.isDeleted) return false;
      } else {
        if (student.isDeleted) return false;
        if (statusFilter !== 'all' && student.status !== statusFilter) {
          return false;
        }
      }

      // Batch filter
      if (batchFilter !== 'all' && student.batchId !== batchFilter) {
        return false;
      }

      // Taekwondo Belt filter
      if (beltFilter !== 'all' && (student.beltLevel || student.belt || 'White') !== beltFilter) {
        return false;
      }

      // Fee filter
      const isUnpaid = hasUnpaidFees(student.id, state.feeRecords);
      if (feeFilter === 'unpaid' && !isUnpaid) return false;
      if (feeFilter === 'paid' && isUnpaid) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          student.fullName.toLowerCase().includes(q) ||
          (student.guardianName && student.guardianName.toLowerCase().includes(q)) ||
          student.guardianPhone.includes(q)
        );
      }

      return true;
    });
  }, [state.students, state.feeRecords, state.settings.warningThreshold, warningFilter, batchFilter, beltFilter, statusFilter, feeFilter, searchQuery]);

  const activeStudents = useMemo(() => state.students.filter((s) => !s.isDeleted), [state.students]);
  const activeCount = state.students.filter((s) => s.status === 'active' && !s.isDeleted).length;
  const suspendedCount = state.students.filter((s) => s.status === 'suspended' && !s.isDeleted).length;

  // Taekwondo Belt distribution counts
  const beltStats = useMemo(() => {
    return TAEKWONDO_BELTS.map((belt) => {
      const count = activeStudents.filter((s) => (s.beltLevel || s.belt || 'White') === belt.id).length;
      const percentage = activeStudents.length > 0 ? Math.round((count / activeStudents.length) * 100) : 0;
      return {
        ...belt,
        count,
        percentage,
      };
    });
  }, [activeStudents]);

  // Batch summary counts (both total capacity and filtered count)
  const batchSummary = useMemo(() => {
    return state.batches.map((batch) => {
      const totalEnrolled = activeStudents.filter((s) => s.batchId === batch.id).length;
      const filteredCount = filteredStudents.filter((s) => s.batchId === batch.id).length;
      const capacityPct = totalEnrolled > 0 ? Math.round((filteredCount / totalEnrolled) * 100) : 0;
      return {
        batch,
        totalEnrolled,
        filteredCount,
        capacityPct,
      };
    });
  }, [state.batches, activeStudents, filteredStudents]);

  const warningCount = useMemo(
    () =>
      state.students.filter(
        (s) =>
          s.status === 'active' &&
          !s.isDeleted &&
          s.currentAbsenceStreak >= state.settings.warningThreshold
      ).length,
    [state.students, state.settings.warningThreshold]
  );

  const clearAllFilters = () => {
    setSearchQuery('');
    setBatchFilter('all');
    setBeltFilter('all');
    setStatusFilter('all');
    setFeeFilter('all');
    setWarningFilter(false);
    onClearInitialFilters?.();
  };

  const currencySymbol = state.settings.currencySymbol || 'Rs.';

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Add Student Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-sky-100 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
            <span>Student Management & Belts</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              {activeCount} Active • {suspendedCount} Suspended
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Taekwondo belt ranks, batch rosters, guardians, and tuition fees (PKR).
          </p>
        </div>

        <button
          id="add-student-btn"
          onClick={onOpenAddStudent}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-bold text-xs shadow-sm transition-all hover:scale-102 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Student</span>
        </button>
      </div>

      {/* Belt Analytics Strip (White, Yellow, Green, Blue, Red, Black) */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-sky-100 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Award className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Taekwondo Belt Ranks & Student Counts
            </h3>
          </div>
          {beltFilter !== 'all' && (
            <button
              onClick={() => setBeltFilter('all')}
              className="text-[11px] font-bold text-sky-600 hover:text-sky-700 flex items-center space-x-1"
            >
              <span>Reset Belt Filter</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {beltStats.map((belt) => {
            const isSelected = beltFilter === belt.id;
            return (
              <button
                key={belt.id}
                type="button"
                onClick={() => setBeltFilter(isSelected ? 'all' : belt.id)}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'border-sky-500 ring-2 ring-sky-500/40 bg-sky-50/90 dark:bg-sky-950/60 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-sky-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Belt colored ribbon stripe */}
                <div className={`h-1.5 w-full rounded-full bg-linear-to-r ${belt.ribbonGradient} mb-2`} />

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{belt.id} Belt</span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100">{belt.count}</span>
                </div>

                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                  <span className="truncate">{belt.geupRank.split(' ')[0]}</span>
                  <span className="font-semibold">{belt.percentage}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Comprehensive Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-sky-100 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by student name, guardian or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Batch Selector */}
          <select
            id="students-batch-filter-dropdown"
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Batches ({state.batches.length})</option>
            {state.batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Belt Level Dropdown Filter */}
          <select
            id="students-belt-level-filter-dropdown"
            value={beltFilter}
            onChange={(e) => setBeltFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Belt Levels</option>
            <option value="White">White Belt</option>
            <option value="Yellow">Yellow Belt</option>
            <option value="Green">Green Belt</option>
            <option value="Blue">Blue Belt</option>
            <option value="Red">Red Belt</option>
            <option value="Black">Black Belt</option>
          </select>

          {/* Status Selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
          >
            <option value="all">Status: All (Active & Suspended)</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
            <option value="left">Left / Inactive</option>
            <option value="archived">Archived (Soft Deleted)</option>
          </select>

          {/* Fee Filter */}
          <select
            value={feeFilter}
            onChange={(e) => setFeeFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
          >
            <option value="all">Fee Status: All</option>
            <option value="unpaid">Unpaid Fees Only ⚠</option>
            <option value="paid">All Fees Paid ✓</option>
          </select>

          {/* Warning Toggle Filter */}
          <button
            type="button"
            onClick={() => {
              const next = !warningFilter;
              setWarningFilter(next);
              if (!next) onClearInitialFilters?.();
            }}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center space-x-2 transition-colors cursor-pointer shrink-0 ${
              warningFilter
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-amber-400'
            }`}
          >
            <AlertTriangle className={`w-4 h-4 ${warningFilter ? 'text-white' : 'text-amber-500'}`} />
            <span>7+ Days Warnings</span>
            {warningCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${warningFilter ? 'bg-white text-amber-800' : 'bg-amber-100 text-amber-800'}`}>
                {warningCount}
              </span>
            )}
          </button>

          {isFilterActive && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors shrink-0 flex items-center space-x-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Warning Filter Notice Banner */}
      {warningFilter && (
        <div className="bg-amber-50 dark:bg-amber-950/40 p-4 sm:p-5 rounded-2xl border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm sm:text-base font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                <span>Absence Warnings Filter Active ({state.settings.warningThreshold}+ consecutive absent days)</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-black">
                  {filteredStudents.length} Students At Risk
                </span>
              </div>
              <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 mt-0.5">
                Contact guardians immediately. Active students reaching 10 consecutive absent days will be automatically suspended.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setWarningFilter(false);
              onClearInitialFilters?.();
            }}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-100 text-amber-900 dark:text-amber-100 border border-amber-300 text-xs font-bold flex items-center space-x-1.5 shrink-0 cursor-pointer shadow-xs"
          >
            <X className="w-4 h-4" />
            <span>Reset Warning Filter</span>
          </button>
        </div>
      )}

      {/* Header Summary Card Showing Count of Students Per Batch Whenever Batch Filter is Applied */}
      {batchFilter !== 'all' && (
        <div
          id="batch-student-count-summary-card"
          className="bg-sky-50 dark:bg-sky-950/40 p-4 sm:p-5 rounded-2xl border border-sky-200 dark:border-sky-800 shadow-xs space-y-3 animate-in fade-in duration-200"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-sky-200/70 dark:border-sky-800/70">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-sky-950 dark:text-sky-100 uppercase tracking-wide">
                    Batch Enrollment Summary
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-600 text-white">
                    Filter Active: {state.batches.find((b) => b.id === batchFilter)?.name || 'Selected Batch'}
                  </span>
                </div>
                <p className="text-xs text-sky-800 dark:text-sky-300 mt-0.5">
                  Displaying count of students per batch. Showing {filteredStudents.length} student{filteredStudents.length === 1 ? '' : 's'} in this filtered batch ({activeStudents.length} total enrolled across all batches).
                </p>
              </div>
            </div>

            <button
              onClick={() => setBatchFilter('all')}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-slate-700 transition-colors flex items-center space-x-1.5 shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Batch Filter</span>
            </button>
          </div>

          {/* Grid of Student Counts Per Batch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {batchSummary.map(({ batch, totalEnrolled, filteredCount }) => {
              const isSelected = batchFilter === batch.id;
              return (
                <button
                  key={batch.id}
                  type="button"
                  onClick={() => setBatchFilter(isSelected ? 'all' : batch.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-sky-600 text-white border-sky-600 ring-2 ring-sky-400 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-sky-200 dark:border-slate-800 hover:border-sky-400 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                      {batch.name}
                    </div>
                    <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      {isSelected ? 'Active Filter Selection' : 'Click to filter batch'}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`text-base font-black tabular-nums ${isSelected ? 'text-white' : 'text-sky-700 dark:text-sky-400'}`}>
                      {totalEnrolled}
                    </div>
                    <div className={`text-[9px] uppercase tracking-wider font-semibold ${isSelected ? 'text-sky-200' : 'text-slate-400'}`}>
                      Students
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Students Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map((student) => {
          const batch = state.batches.find((b) => b.id === student.batchId);
          const beltMeta = getBeltMeta(student.beltLevel || student.belt);
          const isUnpaid = hasUnpaidFees(student.id, state.feeRecords);
          const isWarning = student.currentAbsenceStreak >= state.settings.warningThreshold;
          const isSuspended = student.status === 'suspended';

          const whatsappUrl = getGuardianWhatsAppUrl(
            student.guardianPhone,
            student.fullName,
            state.settings.academyName,
            'Current Month',
            0,
            0,
            0,
            isUnpaid ? 'Unpaid' : 'Paid'
          );

          return (
            <div
              key={student.id}
              className={`rounded-2xl border bg-white dark:bg-slate-900 p-5 shadow-xs transition-all flex flex-col justify-between hover:shadow-md ${
                isSuspended
                  ? 'border-red-300 dark:border-red-900/80 bg-red-50/20'
                  : isWarning
                  ? 'border-amber-300 dark:border-amber-900/80'
                  : 'border-sky-100 dark:border-slate-800 hover:border-sky-400 dark:hover:border-slate-700'
              }`}
            >
              <div>
                {/* Card Top: Photo & Badges */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div
                    className="flex items-center space-x-3 cursor-pointer group"
                    onClick={() => onSelectStudent(student.id)}
                  >
                    <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-slate-800 flex items-center justify-center font-black text-sm text-sky-700 dark:text-sky-400 shrink-0 border border-sky-200 dark:border-slate-700 overflow-hidden group-hover:scale-105 transition-transform">
                      {student.photoUrl ? (
                        <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
                      ) : (
                        student.fullName.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                        {student.fullName}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {batch?.name || 'Class Group'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {/* Taekwondo Belt Badge */}
                    <span className={`inline-flex items-center space-x-1 text-[10px] font-black px-2 py-0.5 rounded-full ${beltMeta.chipClass}`}>
                      <span className={`w-2 h-2 rounded-full border ${beltMeta.borderColor} ${beltMeta.bgColor}`} />
                      <span>{beltMeta.name}</span>
                    </span>

                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-full ${
                        student.status === 'active'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : student.status === 'suspended'
                          ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 animate-pulse'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                      }`}
                    >
                      {student.status}
                    </span>

                    {isUnpaid && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200">
                        Fee Unpaid
                      </span>
                    )}
                  </div>
                </div>

                {/* Details list */}
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 py-2 border-t border-sky-50 dark:border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Guardian:</span>
                    <span className="font-semibold">{student.guardianName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Monthly Fee:</span>
                    <span className="font-bold text-sky-700 dark:text-sky-300">
                      {formatPKR(student.monthlyFee)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Admission Date:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {formatPKDate(student.admissionDate, 'medium')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Consecutive Absences:</span>
                    <span
                      className={`font-black ${
                        student.currentAbsenceStreak >= state.settings.suspensionThreshold
                          ? 'text-red-600'
                          : student.currentAbsenceStreak >= state.settings.warningThreshold
                          ? 'text-amber-600 flex items-center gap-1'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {student.currentAbsenceStreak >= state.settings.warningThreshold && (
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                      )}
                      {student.currentAbsenceStreak} days
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-3 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Send WhatsApp update to guardian"
                    className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                  <a
                    href={`tel:${student.guardianPhone}`}
                    title="Call Guardian"
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => onEditStudent(student)}
                    title="Edit Student Profile & Belt"
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => onSelectStudent(student.id)}
                  className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/80 hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 font-bold text-xs transition-colors"
                >
                  View Profile
                </button>
              </div>
            </div>
          );
        })}

        {filteredStudents.length === 0 && (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500 space-y-3">
            <Users className="w-10 h-10 mx-auto text-slate-400" />
            <p className="font-semibold text-sm">No students match your selected filters.</p>
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
