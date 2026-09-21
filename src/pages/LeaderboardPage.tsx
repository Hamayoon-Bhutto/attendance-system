import React, { useState, useEffect } from 'react';
import {
  Award,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Gift,
  Medal,
  Share2,
  Sparkles,
  Star,
  Trophy,
  Users
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppState } from '../types';
import { computeMonthlyStats } from '../lib/attendanceMath';
import { exportLeaderboardPdf } from '../lib/exportPdf';
import { sharePdfFile } from '../lib/share';
import { formatPKDate, formatPKMonth } from '../lib/pakistanFormat';

interface LeaderboardPageProps {
  state: AppState;
  onSelectStudent: (studentId: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({
  state,
  onSelectStudent,
  showToast,
}) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  // Calculate monthly stats with tie-breakers
  const stats = computeMonthlyStats(
    selectedYear,
    selectedMonth,
    state.students,
    state.attendance,
    state.settings,
    state.holidays
  );

  // Filter active students for rankings
  const ranked = stats.filter((st) => st.student.status === 'active');
  const top1 = ranked[0];
  const top2 = ranked[1];
  const top3 = ranked[2];

  // Fire celebratory confetti when viewing current leaderboard
  useEffect(() => {
    if (top1 && top1.percentage > 0) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#0284c7', '#f59e0b', '#38bdf8', '#10b981'],
      });
    }
  }, [selectedYear, selectedMonth, top1?.student.id]);

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

  // Export Leaderboard PDF
  const handleExportPdf = () => {
    if (ranked.length === 0) {
      showToast('No student attendance records to export for this month.', 'warning');
      return;
    }
    exportLeaderboardPdf(selectedYear, selectedMonth, ranked, state.settings);
    showToast(`Exported ${monthName} Leaderboard PDF!`, 'success');
  };

  // Share Leaderboard
  const handleShare = async () => {
    if (ranked.length === 0) return;
    const doc = exportLeaderboardPdf(selectedYear, selectedMonth, ranked, state.settings);
    const pdfBlob = doc.output('blob');
    const filename = `Leaderboard-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.pdf`;
    const shareText = `Check out the ${monthName} Attendance Leaderboard for ${state.settings.academyName}! Star of the Month: ${top1?.student.fullName} (${top1?.percentage}%)`;

    const res = await sharePdfFile(pdfBlob, filename, `${state.settings.academyName} Leaderboard`, shareText);
    showToast(res.message, 'success');
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header & Month Stepper */}
      <div className="bg-linear-to-r from-sky-950 via-slate-900 to-slate-950 p-6 rounded-2xl text-white shadow-md border border-sky-800/40 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase tracking-widest">
              <Sparkles className="w-4 h-4" />
              <span>Discipline & Excellence</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white mt-1">
              Monthly Attendance Leaderboard
            </h1>
            <p className="text-xs text-sky-200/80 mt-1 max-w-xl">
              Rankings computed from total working days minus approved leaves. Tie-breaks: fewer late marks, then earlier admission date.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Month Stepper */}
            <div className="flex items-center space-x-1.5 bg-white/10 backdrop-blur-xs p-1 rounded-xl border border-white/20">
              <button
                onClick={() => changeMonth(-1)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold px-2 text-white select-none">{monthName}</span>
              <button
                onClick={() => changeMonth(1)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Export PDF */}
            <button
              onClick={handleExportPdf}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Share Leaderboard PDF / WhatsApp"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Reward Slots Info Banner */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center space-x-2">
            <Gift className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Reward Rule:</strong> Top {state.settings.rewardSlots} Students this month win:{' '}
              <strong className="text-white">{state.settings.rewardText}</strong>
            </span>
          </div>
          <span className="text-[11px] text-sky-300 hidden sm:inline-block">
            {ranked.length} Active Competitors
          </span>
        </div>
      </div>

      {/* Podium Display (Top 3) */}
      {top1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4">
          {/* Rank #2 (Silver) */}
          {top2 && (
            <div
              onClick={() => onSelectStudent(top2.student.id)}
              className="order-2 md:order-1 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-300 dark:border-slate-700 p-5 text-center shadow-xs hover:scale-102 transition-all cursor-pointer relative"
            >
              <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-sm flex items-center justify-center mx-auto -mt-10 border-4 border-white dark:border-slate-900 shadow-md">
                #2
              </div>
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 mx-auto mt-3 overflow-hidden flex items-center justify-center font-bold text-slate-600 text-lg border border-slate-200 dark:border-slate-700">
                {top2.student.photoUrl ? (
                  <img src={top2.student.photoUrl} alt={top2.student.fullName} className="w-full h-full object-cover" />
                ) : (
                  top2.student.fullName.substring(0, 2).toUpperCase()
                )}
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-3 truncate">
                {top2.student.fullName}
              </h3>
              <div className="text-2xl font-black text-slate-700 dark:text-slate-300 tabular-nums mt-1">
                {top2.percentage}%
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Present: {top2.present} • Late: {top2.late} • Absent: {top2.absent}
              </div>
              <div className="mt-3 py-1 px-3 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 inline-block">
                Silver Medalist
              </div>
            </div>
          )}

          {/* Rank #1 (Gold - Star of the Month) */}
          <div
            onClick={() => onSelectStudent(top1.student.id)}
            className="order-1 md:order-2 bg-linear-to-b from-amber-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl border-2 border-amber-400 dark:border-amber-500 p-6 text-center shadow-lg hover:scale-103 transition-all cursor-pointer relative md:-translate-y-4"
          >
            <div className="w-12 h-12 rounded-full bg-amber-500 text-slate-950 font-black text-base flex items-center justify-center mx-auto -mt-12 border-4 border-white dark:border-slate-900 shadow-lg">
              <Trophy className="w-6 h-6 fill-slate-950" />
            </div>
            <div className="w-20 h-20 rounded-2xl bg-amber-100 dark:bg-amber-950/60 mx-auto mt-3 overflow-hidden flex items-center justify-center font-black text-amber-600 text-2xl border-2 border-amber-400">
              {top1.student.photoUrl ? (
                <img src={top1.student.photoUrl} alt={top1.student.fullName} className="w-full h-full object-cover" />
              ) : (
                top1.student.fullName.substring(0, 2).toUpperCase()
              )}
            </div>
            <div className="mt-2 flex items-center justify-center gap-1 text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span>Star of the Month</span>
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            </div>
            <h2 className="font-black text-base text-slate-900 dark:text-white mt-1 truncate">
              {top1.student.fullName}
            </h2>
            <div className="text-3xl font-black text-amber-600 dark:text-amber-400 tabular-nums mt-1">
              {top1.percentage}%
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Present: <strong>{top1.present}</strong> • Late: {top1.late} • Absent: {top1.absent}
            </div>
            <div className="mt-3 py-1.5 px-4 rounded-full bg-amber-500 text-slate-950 text-xs font-black inline-flex items-center gap-1 shadow-sm">
              <Gift className="w-3.5 h-3.5" />
              <span>{state.settings.rewardText}</span>
            </div>
          </div>

          {/* Rank #3 (Bronze) */}
          {top3 && (
            <div
              onClick={() => onSelectStudent(top3.student.id)}
              className="order-3 bg-white dark:bg-slate-900 rounded-2xl border-2 border-amber-700/50 dark:border-amber-800 p-5 text-center shadow-xs hover:scale-102 transition-all cursor-pointer relative"
            >
              <div className="w-10 h-10 rounded-full bg-amber-700 text-white font-black text-sm flex items-center justify-center mx-auto -mt-10 border-4 border-white dark:border-slate-900 shadow-md">
                #3
              </div>
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 mx-auto mt-3 overflow-hidden flex items-center justify-center font-bold text-amber-800 text-lg border border-slate-200 dark:border-slate-700">
                {top3.student.photoUrl ? (
                  <img src={top3.student.photoUrl} alt={top3.student.fullName} className="w-full h-full object-cover" />
                ) : (
                  top3.student.fullName.substring(0, 2).toUpperCase()
                )}
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-3 truncate">
                {top3.student.fullName}
              </h3>
              <div className="text-2xl font-black text-amber-800 dark:text-amber-500 tabular-nums mt-1">
                {top3.percentage}%
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Present: {top3.present} • Late: {top3.late} • Absent: {top3.absent}
              </div>
              <div className="mt-3 py-1 px-3 rounded-full bg-amber-50 dark:bg-amber-950/60 text-[11px] font-bold text-amber-800 dark:text-amber-400 inline-block border border-amber-300 dark:border-amber-800">
                Bronze Medalist
              </div>
            </div>
          )}
        </div>
      )}

      {/* Complete Rankings Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Medal className="w-4 h-4 text-sky-600" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
              Complete Academy Standings ({monthName})
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Working Days in Month: <strong>{ranked[0]?.workingDays || 0}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-center w-12">Rank</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-3 py-3 text-center">Working Days</th>
                <th className="px-3 py-3 text-center">Present</th>
                <th className="px-3 py-3 text-center">Late</th>
                <th className="px-3 py-3 text-center">Leave</th>
                <th className="px-3 py-3 text-center">Absent</th>
                <th className="px-4 py-3">Attendance %</th>
                <th className="px-4 py-3 text-right">Award Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {ranked.map((st, idx) => {
                const rank = st.rank || idx + 1;
                const isRewardWinner = rank <= state.settings.rewardSlots;

                return (
                  <tr
                    key={st.student.id}
                    onClick={() => onSelectStudent(st.student.id)}
                    className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer ${
                      isRewardWinner ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                    }`}
                  >
                    {/* Rank Badge */}
                    <td className="px-4 py-3.5 text-center font-black">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs ${
                          rank === 1
                            ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                            : rank === 2
                            ? 'bg-slate-300 text-slate-800 font-bold'
                            : rank === 3
                            ? 'bg-amber-700 text-white font-bold'
                            : 'text-slate-500'
                        }`}
                      >
                        #{rank}
                      </span>
                    </td>

                    {/* Student Name */}
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center space-x-2">
                        <span>{st.student.fullName}</span>
                        {rank === 1 && <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        Enrolled: {formatPKDate(st.student.admissionDate)}
                      </div>
                    </td>

                    {/* Working Days */}
                    <td className="px-3 py-3.5 text-center text-slate-600 dark:text-slate-400 font-semibold tabular-nums">
                      {st.workingDays}
                    </td>

                    {/* Present */}
                    <td className="px-3 py-3.5 text-center text-emerald-600 font-bold tabular-nums">
                      {st.present}
                    </td>

                    {/* Late */}
                    <td className="px-3 py-3.5 text-center text-amber-600 font-semibold tabular-nums">
                      {st.late}
                    </td>

                    {/* Leave */}
                    <td className="px-3 py-3.5 text-center text-blue-600 font-semibold tabular-nums">
                      {st.leave}
                    </td>

                    {/* Absent */}
                    <td className="px-3 py-3.5 text-center text-red-600 font-semibold tabular-nums">
                      {st.absent}
                    </td>

                    {/* Percentage Progress Bar */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-sm text-sky-700 dark:text-sky-400 w-12 tabular-nums">
                          {st.percentage}%
                        </span>
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              st.percentage >= 90
                                ? 'bg-emerald-500'
                                : st.percentage >= 75
                                ? 'bg-sky-600'
                                : st.percentage >= 50
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, st.percentage)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Award Tier */}
                    <td className="px-4 py-3.5 text-right">
                      {isRewardWinner ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <Gift className="w-3 h-3" />
                          Reward Winner
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Competitor</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {ranked.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    No active student attendance found for {monthName}.
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
