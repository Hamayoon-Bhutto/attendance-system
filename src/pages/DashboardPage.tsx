import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Layers,
  Shield,
  Star,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { AppState } from '../types';
import {
  computeMonthlyStats,
  formatDateKey,
  getNonWorkingReason,
  isWorkingDay,
} from '../lib/attendanceMath';
import { TAEKWONDO_BELTS } from '../lib/beltUtils';
import { formatPKDate, formatPKR } from '../lib/pakistanFormat';

interface DashboardPageProps {
  state: AppState;
  setActiveTab: (tab: string) => void;
  onSelectStudent: (studentId: string) => void;
  onExportAll: () => void;
  onViewUnpaidFees?: () => void;
  onInspectWarnings?: () => void;
  onFilterRosterByBelt?: (belt: string) => void;
  onMarkTodayAttendance?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  state,
  setActiveTab,
  onSelectStudent,
  onExportAll,
  onViewUnpaidFees,
  onInspectWarnings,
  onFilterRosterByBelt,
  onMarkTodayAttendance,
}) => {
  const today = new Date();
  const todayStr = formatDateKey(today);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const isTodayWorking = isWorkingDay(todayStr, state.settings, state.holidays);

  const activeStudents = useMemo(
    () => state.students.filter((s) => s.status === 'active' && !s.isDeleted),
    [state.students]
  );
  const suspendedStudents = useMemo(
    () => state.students.filter((s) => s.status === 'suspended' && !s.isDeleted),
    [state.students]
  );

  // Today's attendance progress & turnout (consistent across card, pill, and chart)
  const todayAttendance = state.attendance.filter((a) => a.attendanceDate === todayStr);
  const todayPresentCount = todayAttendance.filter((a) => a.status === 'present').length;
  const todayLateCount = todayAttendance.filter((a) => a.status === 'late').length;
  const todayAbsentCount = todayAttendance.filter((a) => a.status === 'absent').length;
  const todayLeaveCount = todayAttendance.filter((a) => a.status === 'leave').length;
  const todayAttendedCount = todayPresentCount + todayLateCount;

  const markedTodayCount = activeStudents.filter((s) =>
    todayAttendance.some((a) => a.studentId === s.id)
  ).length;

  const attendanceProgress = activeStudents.length > 0
    ? Math.round((markedTodayCount / activeStudents.length) * 100)
    : 0;

  const todayAttendedPercentage = activeStudents.length > 0
    ? Math.round((todayAttendedCount / activeStudents.length) * 100)
    : 0;

  // Fee calculation for current month
  const currentMonthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const currentMonthFees = state.feeRecords.filter((f) => f.feeMonth.startsWith(currentMonthPrefix));
  const unpaidFees = currentMonthFees.filter((f) => f.status !== 'paid');
  const unpaidTotalAmount = unpaidFees.reduce((acc, f) => acc + (f.amountDue - f.amountPaid), 0);

  // Belt Level Statistics (White, Yellow, Green, Blue, Red, Black)
  const beltLevelStats = useMemo(() => {
    const STANDARD_BELTS: ('White' | 'Yellow' | 'Green' | 'Blue' | 'Red' | 'Black')[] = [
      'White',
      'Yellow',
      'Green',
      'Blue',
      'Red',
      'Black',
    ];

    return STANDARD_BELTS.map((level) => {
      // Query student list to count active students by their beltLevel
      const count = activeStudents.filter((s) => {
        const studentBelt = s.beltLevel || s.belt || 'White';
        return studentBelt === level;
      }).length;

      const meta = TAEKWONDO_BELTS.find((b) => b.id === level);
      const percentage = activeStudents.length > 0 ? Math.round((count / activeStudents.length) * 100) : 0;

      return {
        beltLevel: level,
        name: `${level} Belt`,
        count,
        percentage,
        geupRank: meta?.geupRank || '',
        bgColor: meta?.bgColor || 'bg-white',
        borderColor: meta?.borderColor || 'border-slate-300',
        ribbonGradient: meta?.ribbonGradient || 'from-sky-400 to-sky-600',
      };
    });
  }, [activeStudents]);

  // Students at warning (streak >= warningThreshold)
  const warningStudents = activeStudents.filter(
    (s) => s.currentAbsenceStreak >= state.settings.warningThreshold
  );

  // Batch filter for Weekly Attendance Trends chart
  const [weeklyBatchFilter, setWeeklyBatchFilter] = useState<string>('all');

  // Calculate current week Monday to Sunday
  const monday = useMemo(() => {
    const d = new Date(today);
    const day = d.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [today]);

  const sunday = useMemo(() => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + 6);
    return d;
  }, [monday]);

  const weekRangeText = useMemo(() => {
    const startDay = monday.getDate();
    const startMonth = monday.toLocaleDateString('en-US', { month: 'short' });
    const endDay = sunday.getDate();
    const endMonth = sunday.toLocaleDateString('en-US', { month: 'short' });
    const year = sunday.getFullYear();
    if (startMonth === endMonth) {
      return `${startDay}–${endDay} ${startMonth} ${year}`;
    }
    return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${year}`;
  }, [monday, sunday]);

  // Generate weekly attendance trends data
  const weeklyTrends = useMemo(() => {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const fullDayNames = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];

    return Array.from({ length: 7 }).map((_, i) => {
      const currentDayDate = new Date(monday);
      currentDayDate.setDate(monday.getDate() + i);
      const dateStr = formatDateKey(currentDayDate);
      const isToday = dateStr === todayStr;
      const isFuture = dateStr > todayStr;
      const isWorking = isWorkingDay(dateStr, state.settings, state.holidays);
      const nonWorkingReason = getNonWorkingReason(dateStr, state.settings, state.holidays);

      let dayAttendance = state.attendance.filter((a) => a.attendanceDate === dateStr);

      if (weeklyBatchFilter !== 'all') {
        const batchStudentIds = new Set(
          activeStudents.filter((s) => s.batchId === weeklyBatchFilter).map((s) => s.id)
        );
        dayAttendance = dayAttendance.filter((a) => batchStudentIds.has(a.studentId));
      }

      const presentCount = dayAttendance.filter((a) => a.status === 'present').length;
      const lateCount = dayAttendance.filter((a) => a.status === 'late').length;
      const absentCount = dayAttendance.filter((a) => a.status === 'absent').length;
      const leaveCount = dayAttendance.filter((a) => a.status === 'leave').length;
      const totalAttended = presentCount + lateCount;

      const dayNum = currentDayDate.getDate();
      const monthShort = currentDayDate.toLocaleDateString('en-US', { month: 'short' });

      return {
        dateStr,
        dayLabel: dayNames[i],
        fullDayName: fullDayNames[i],
        formattedDate: `${dayNum} ${monthShort}`,
        totalAttended,
        presentCount,
        lateCount,
        absentCount,
        leaveCount,
        isToday,
        isFuture,
        isWorking,
        nonWorkingReason,
      };
    });
  }, [monday, todayStr, state.attendance, state.settings, state.holidays, weeklyBatchFilter, activeStudents]);

  const weeklyStats = useMemo(() => {
    const activeDaysSoFar = weeklyTrends.filter((d) => !d.isFuture && d.isWorking);
    const totalAttendedThisWeek = activeDaysSoFar.reduce((acc, d) => acc + d.totalAttended, 0);
    const avgDailyAttendance =
      activeDaysSoFar.length > 0 ? Math.round(totalAttendedThisWeek / activeDaysSoFar.length) : 0;

    const sortedByAttendance = [...weeklyTrends]
      .filter((d) => d.totalAttended > 0)
      .sort((a, b) => b.totalAttended - a.totalAttended);
    const peakDay = sortedByAttendance[0] || null;

    return {
      totalAttendedThisWeek,
      avgDailyAttendance,
      peakDay,
    };
  }, [weeklyTrends]);

  // Top 3 Leaderboard for current month
  const monthStats = computeMonthlyStats(
    currentYear,
    currentMonth,
    state.students,
    state.attendance,
    state.settings,
    state.holidays
  );
  const activeRanked = monthStats.filter((st) => st.student.status === 'active');
  const top3 = activeRanked.slice(0, 3);
  const starOfMonth = top3[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome & Today Status Header */}
      <div className="bg-gradient-to-r from-sky-600 via-sky-700 to-sky-900 rounded-2xl p-5 sm:p-6 text-white shadow-md border border-sky-500/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-semibold text-sky-200 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatPKDate(today, 'long')}</span>
              <span className="text-sky-300/50">•</span>
              <span className={isTodayWorking ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold'}>
                {isTodayWorking ? 'Official Working Day' : 'Academy Off Day'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Sunrise Taekwondo Martial Arts Centre
            </h1>
            <p className="text-xs text-sky-100/90 max-w-xl">
              Daily martial arts attendance, automated suspension alerts, and monthly student rankings.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              id="dashboard-mark-attendance-btn"
              onClick={onMarkTodayAttendance || (() => setActiveTab('attendance'))}
              className="min-h-[44px] flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-white hover:bg-sky-50 font-black text-sm text-sky-900 shadow-md transition-all hover:scale-102 cursor-pointer"
            >
              <ClipboardCheck className="w-5 h-5 text-sky-600" />
              <span>Mark Today's Attendance</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core Stat Metric Cards (Responsive Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* 1. Today's Attendance Progress & Turnout */}
        <div
          onClick={onMarkTodayAttendance || (() => setActiveTab('attendance'))}
          className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 shadow-xs hover:border-sky-500 cursor-pointer transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base font-bold text-slate-600 dark:text-slate-300">
                Today's Attendance
              </span>
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2 flex-wrap gap-y-1">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tabular-nums">
                {todayAttendedCount}
              </span>
              <span className="text-sm font-bold text-sky-600 dark:text-sky-400">
                attended ({todayAttendedPercentage}%)
              </span>
            </div>
            <div className="mt-2 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              {todayPresentCount} Present • {todayLateCount} Late • {todayAbsentCount} Absent
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            {/* Progress bar */}
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
              <span>Roll Call: {markedTodayCount}/{activeStudents.length} Marked</span>
              <span className="font-bold text-sky-600 dark:text-sky-400">{attendanceProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-600 transition-all duration-500 rounded-full"
                style={{ width: `${attendanceProgress}%` }}
              />
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span>{activeStudents.length - markedTodayCount} unrecorded</span>
              <span className="text-sky-600 font-bold group-hover:translate-x-0.5 transition-transform inline-flex items-center">
                Open <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </span>
            </div>
          </div>
        </div>

        {/* 2. Unpaid Fees Count & Total */}
        <div
          onClick={onViewUnpaidFees || (() => setActiveTab('fees'))}
          className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 shadow-xs hover:border-red-400 cursor-pointer transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base font-bold text-slate-600 dark:text-slate-300">
                Unpaid Fees (This Month)
              </span>
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl sm:text-4xl font-black text-red-600 dark:text-red-400 tabular-nums">
                {unpaidFees.length}
              </span>
              <span className="text-sm font-semibold text-slate-500">students unpaid</span>
            </div>
            <div className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200">
              Total Pending: <span className="text-red-600 tabular-nums font-black">{formatPKR(unpaidTotalAmount)}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Tuition Defaulters</span>
            <span className="text-red-600 font-bold group-hover:translate-x-0.5 transition-transform inline-flex items-center">
              View <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>
        </div>

        {/* 3. Students at Warning (7+ days absence) */}
        <div
          onClick={onInspectWarnings || (() => setActiveTab('students'))}
          className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 shadow-xs hover:border-amber-500 cursor-pointer transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base font-bold text-slate-600 dark:text-slate-300">
                Absence Warnings (7+ Days)
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                {warningStudents.length}
              </span>
              {warningStudents.length > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              )}
            </div>
            <div className="mt-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
              {warningStudents.length > 0
                ? 'Contact guardians before 10-day auto suspension'
                : 'All active students in safe attendance range'}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Threshold: {state.settings.warningThreshold} days</span>
            <span className="text-amber-600 font-bold group-hover:translate-x-0.5 transition-transform inline-flex items-center">
              Inspect <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>
        </div>

        {/* 4. Star of the Month */}
        <div
          onClick={() => setActiveTab('leaderboard')}
          className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 shadow-xs hover:border-amber-400 cursor-pointer transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base font-bold text-slate-600 dark:text-slate-300">
                Star of the Month
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-500 flex items-center justify-center">
                <Star className="w-5 h-5 fill-amber-500" />
              </div>
            </div>
            <div className="mt-3 truncate">
              {starOfMonth ? (
                <>
                  <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">
                    {starOfMonth.student.fullName}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-sky-600 dark:text-sky-400 mt-1">
                    {starOfMonth.percentage}% Attendance • Rank #1
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-400">No records yet</div>
              )}
            </div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 truncate">
              Prize: {state.settings.rewardText}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Monthly Leaderboard</span>
            <span className="text-amber-600 font-bold group-hover:translate-x-0.5 transition-transform inline-flex items-center">
              Podium <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
          </div>
        </div>
      </div>

      {/* WEEKLY ATTENDANCE TRENDS VISUAL (BAR CHART) */}
      <div
        id="weekly-attendance-trends-section"
        className="bg-white dark:bg-slate-900 rounded-2xl border border-sky-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5"
      >
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-sky-100 dark:border-slate-800">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0 shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Weekly Attendance Trends</span>
                  <BarChart3 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  {weekRangeText}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Total class attendance counts across each day of the current week (Monday through Sunday).
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0 self-start lg:self-center">
            {/* Batch Filter Selector */}
            <div className="flex items-center space-x-2">
              <label
                htmlFor="weekly-batch-filter-select"
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1"
              >
                <Layers className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span className="hidden sm:inline">Batch:</span>
              </label>
              <select
                id="weekly-batch-filter-select"
                value={weeklyBatchFilter}
                onChange={(e) => setWeeklyBatchFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-sky-200 dark:border-slate-700 bg-sky-50/50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Batches (Academy Wide)</option>
                {state.batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              id="weekly-trends-open-attendance-btn"
              onClick={() => setActiveTab('attendance')}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <span>Attendance Sheet</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Summary Stat Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Total Week Attendees
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
              {weeklyStats.totalAttendedThisWeek}
            </div>
            <div className="text-[10px] text-sky-600 dark:text-sky-400 font-medium mt-0.5">
              Cumulative turnouts this week
            </div>
          </div>

          <div className="p-3 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Daily Class Average
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
              {weeklyStats.avgDailyAttendance}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Students / active day
            </div>
          </div>

          <div className="p-3 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Peak Turnout Day
            </div>
            <div className="text-sm font-black text-sky-700 dark:text-sky-300 truncate mt-1">
              {weeklyStats.peakDay
                ? `${weeklyStats.peakDay.fullDayName} (${weeklyStats.peakDay.totalAttended})`
                : 'None yet'}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Highest single day attendance
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40">
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Today's Attendance
            </div>
            <div className="text-2xl font-black text-sky-600 dark:text-sky-400 tabular-nums mt-0.5">
              {todayAttendedCount}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
              {markedTodayCount} of {activeStudents.length} marked ({attendanceProgress}%)
            </div>
          </div>
        </div>

        {/* Bar Chart Container */}
        <div className="pt-2">
          <div className="w-full h-72 sm:h-80 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyTrends}
                margin={{ top: 22, right: 12, left: -16, bottom: 25 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                  className="dark:stroke-slate-800"
                />
                <XAxis
                  dataKey="dayLabel"
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={(props: any) => {
                    const { x, y, payload } = props;
                    const item = weeklyTrends.find((d) => d.dayLabel === payload.value);
                    if (!item) return null;
                    const isToday = item.isToday;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={0}
                          y={0}
                          dy={14}
                          textAnchor="middle"
                          fill={isToday ? '#0284c7' : '#64748b'}
                          fontSize={12}
                          fontWeight={isToday ? 800 : 600}
                        >
                          {item.dayLabel}
                        </text>
                        <text
                          x={0}
                          y={0}
                          dy={28}
                          textAnchor="middle"
                          fill={isToday ? '#0369a1' : '#94a3b8'}
                          fontSize={10}
                          fontWeight={isToday ? 700 : 500}
                        >
                          {item.formattedDate}
                        </text>
                      </g>
                    );
                  }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(2, 132, 199, 0.06)' }}
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as (typeof weeklyTrends)[0];
                      return (
                        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-sky-200 dark:border-slate-700 shadow-xl text-xs space-y-2.5 min-w-[200px]">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white text-sm">
                                {item.fullDayName}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {item.formattedDate}
                              </div>
                            </div>
                            {item.isToday && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border border-sky-300">
                                Today
                              </span>
                            )}
                            {item.isFuture && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                Upcoming
                              </span>
                            )}
                          </div>

                          <div>
                            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              Total Class Attendance
                            </div>
                            <div className="text-xl font-black text-sky-600 dark:text-sky-400 tabular-nums">
                              {item.totalAttended}{' '}
                              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                attendee{item.totalAttended === 1 ? '' : 's'}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                            <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              <span>Present: <strong>{item.presentCount}</strong></span>
                            </div>
                            <div className="flex items-center space-x-1.5 text-amber-600 dark:text-amber-400">
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                              <span>Late: <strong>{item.lateCount}</strong></span>
                            </div>
                            <div className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400">
                              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                              <span>Absent: <strong>{item.absentCount}</strong></span>
                            </div>
                            <div className="flex items-center space-x-1.5 text-sky-600 dark:text-sky-400">
                              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                              <span>Leave: <strong>{item.leaveCount}</strong></span>
                            </div>
                          </div>

                          {!item.isWorking && (
                            <div className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 p-1.5 rounded-md border border-amber-200 dark:border-amber-900 font-medium">
                              {item.nonWorkingReason || 'Academy Off Day'}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="totalAttended"
                  radius={[6, 6, 0, 0]}
                  name="Class Attendees"
                  label={(props: any) => {
                    const { x, y, width, value, index } = props;
                    const item = weeklyTrends[index];
                    if (!item || item.isFuture) return null;
                    if (!item.isWorking && value === 0) {
                      return (
                        <text
                          x={x + width / 2}
                          y={y - 6}
                          fill="#94a3b8"
                          textAnchor="middle"
                          fontSize={10}
                          fontWeight="600"
                        >
                          Off
                        </text>
                      );
                    }
                    return (
                      <text
                        x={x + width / 2}
                        y={y - 6}
                        fill={item.isToday ? '#0284c7' : '#64748b'}
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight="bold"
                      >
                        {value}
                      </text>
                    );
                  }}
                >
                  {weeklyTrends.map((entry) => {
                    let fill = '#38bdf8'; // Sky-400 default for attended class days
                    if (entry.isToday) {
                      fill = '#0284c7'; // Sky-600 bold for today
                    } else if (!entry.isWorking) {
                      fill = '#cbd5e1'; // Slate-300 for off days
                    } else if (entry.isFuture) {
                      fill = '#e2e8f0'; // Very light for upcoming future days
                    }
                    return <Cell key={entry.dateStr} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Legend & Context Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-sky-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm bg-sky-400"></span>
              <span>Past Class Days</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm bg-sky-600"></span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Today's Class</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-sm bg-slate-300 dark:bg-slate-700"></span>
              <span>Off Day / Holiday</span>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Attendance count combines all <strong className="text-slate-700 dark:text-slate-200">Present</strong> & <strong className="text-slate-700 dark:text-slate-200">Late</strong> students.
          </div>
        </div>
      </div>

      {/* BELT LEVEL STATISTICS SECTION */}
      <div
        id="belt-level-statistics-section"
        className="bg-white dark:bg-slate-900 rounded-2xl border border-sky-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-sky-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span>Belt Level Statistics</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  {activeStudents.length} Active Students
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Live distribution of students by belt rank (White, Yellow, Green, Blue, Red, Black). Click any belt to filter roster.
              </p>
            </div>
          </div>

          <button
            onClick={() => onFilterRosterByBelt ? onFilterRosterByBelt('all') : setActiveTab('students')}
            className="text-xs sm:text-sm font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 flex items-center space-x-1 shrink-0 self-start sm:self-center cursor-pointer"
          >
            <span>Filter Roster by Belt</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 6 Belt Level Cards Grid (White, Yellow, Green, Blue, Red, Black) in light-blue themed cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {beltLevelStats.map((item) => (
            <div
              key={item.beltLevel}
              onClick={() => onFilterRosterByBelt ? onFilterRosterByBelt(item.beltLevel) : setActiveTab('students')}
              className="p-4 rounded-xl border border-sky-200 dark:border-sky-800/80 bg-sky-50/70 dark:bg-sky-950/30 hover:bg-sky-100/70 dark:hover:bg-sky-900/40 hover:border-sky-400 transition-all cursor-pointer flex flex-col justify-between group shadow-2xs"
            >
              {/* Belt gradient ribbon */}
              <div className={`h-2 w-full rounded-full bg-linear-to-r ${item.ribbonGradient} mb-3 shadow-2xs`} />

              <div className="flex items-center space-x-2 mb-1">
                <span className={`w-4 h-4 rounded-full shrink-0 border ${item.borderColor} ${item.bgColor} shadow-xs`} />
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {item.beltLevel}
                </span>
              </div>

              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-sky-950 dark:text-sky-100 tabular-nums group-hover:text-sky-600 transition-colors">
                  {item.count}
                </span>
                <span className="text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/50 px-2 py-0.5 rounded-md">
                  {item.percentage}%
                </span>
              </div>

              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 truncate font-semibold">
                {item.geupRank}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Warning Notice Banner if students are at risk */}
      {warningStudents.length > 0 && (
        <div className="p-4 sm:p-5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-amber-900 dark:text-amber-200">
                Action Needed: {warningStudents.length} Student{warningStudents.length > 1 ? 's' : ''} at 7-Day Warning Threshold
              </h4>
              <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300">
                {warningStudents.map((s) => `${s.fullName} (${s.currentAbsenceStreak} days)`).join(', ')}. Contact guardians before auto suspension!
              </p>
            </div>
          </div>
          <button
            onClick={onInspectWarnings || (() => setActiveTab('students'))}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold shrink-0 shadow-xs cursor-pointer transition-colors"
          >
            Review Students
          </button>
        </div>
      )}

      {/* Two Column Section: Top 3 Leaderboard & Quick Module Jump */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 3 Current Leaders */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-sky-100 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-sky-50 dark:border-slate-800 mb-4">
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Current Attendance Leaders (Top 3)
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className="text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 flex items-center"
            >
              Full Leaderboard <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>

          <div className="space-y-3">
            {top3.map((st, idx) => {
              const rankColor =
                idx === 0
                  ? 'bg-amber-500 text-white shadow-amber-500/20'
                  : idx === 1
                  ? 'bg-slate-400 text-white'
                  : 'bg-amber-700 text-white';

              return (
                <div
                  key={st.student.id}
                  onClick={() => onSelectStudent(st.student.id)}
                  className="p-3.5 rounded-xl border border-sky-100 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-600 bg-sky-50/20 dark:bg-slate-800/40 flex items-center justify-between cursor-pointer transition-all hover:translate-x-1"
                >
                  <div className="flex items-center space-x-3.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-xs ${rankColor}`}
                    >
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{st.student.fullName}</span>
                        {idx === 0 && <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Present: <strong>{st.present}</strong> days • Late: {st.late} • Absences: {st.absent}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-black text-sky-700 dark:text-sky-400 tabular-nums">
                      {st.percentage}%
                    </div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Attendance</div>
                  </div>
                </div>
              );
            })}

            {top3.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                No attendance recorded yet this month.
              </div>
            )}
          </div>
        </div>

        {/* Quick Operations Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-sky-100 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 pb-3 border-b border-sky-50 dark:border-slate-800 mb-4">
              Quick Academy Shortcuts
            </h3>
            <div className="space-y-2.5">
              <button
                onClick={() => setActiveTab('attendance')}
                className="w-full p-3 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/80 text-sky-800 dark:text-sky-200 font-bold text-xs flex items-center justify-between transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <ClipboardCheck className="w-4 h-4 text-sky-600" />
                  <span>Mark Daily Attendance</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setActiveTab('students')}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-between transition-colors text-left"
              >
                <div className="flex items-center space-x-2.5">
                  <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span>Manage Student Profiles ({state.students.filter((s) => !s.isDeleted).length})</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setActiveTab('reports')}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-between transition-colors text-left"
              >
                <div className="flex items-center space-x-2.5">
                  <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span>Export Monthly PDF & Excel</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={onExportAll}
                className="w-full p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-semibold text-xs flex items-center justify-between transition-colors text-left"
              >
                <div className="flex items-center space-x-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Backup Full Database (Excel)</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-sky-50 dark:border-slate-800 mt-4 text-[11px] text-slate-400">
            Total Enrolled: <strong>{activeStudents.length}</strong> Active •{' '}
            <strong>{suspendedStudents.length}</strong> Suspended
          </div>
        </div>
      </div>
    </div>
  );
};
