import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Building,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  DollarSign,
  Gift,
  GripVertical,
  Layers,
  Lock,
  Plus,
  Save,
  Shield,
  Trash2,
  Unlock,
  Sparkles,
  ArrowUpDown,
  GraduationCap
} from 'lucide-react';
import { AppState, Batch, Holiday, Settings } from '../types';
import { formatDateKey } from '../lib/attendanceMath';

interface SettingsPageProps {
  state: AppState;
  onSaveSettings: (settings: Settings) => void;
  onAddHoliday: (holiday: Omit<Holiday, 'id'>) => void;
  onDeleteHoliday: (holidayId: string) => void;
  onAddBatch: (name: string) => void;
  onDeleteBatch: (batchId: string) => void;
  onReorderBatches?: (reorderedBatches: Batch[]) => void;
  onExportAll: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning') => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  state,
  onSaveSettings,
  onAddHoliday,
  onDeleteHoliday,
  onAddBatch,
  onDeleteBatch,
  onReorderBatches,
  onExportAll,
  showToast,
}) => {
  const [settings, setSettings] = useState<Settings>({ ...state.settings });
  const [newHolidayDate, setNewHolidayDate] = useState(formatDateKey(new Date()));
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newBatchName, setNewBatchName] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'calendar' | 'rules' | 'batches' | 'data'>('general');

  // Drag-and-drop state for batches
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const weekdays = [
    { day: 0, name: 'Sunday' },
    { day: 1, name: 'Monday' },
    { day: 2, name: 'Tuesday' },
    { day: 3, name: 'Wednesday' },
    { day: 4, name: 'Thursday' },
    { day: 5, name: 'Friday' },
    { day: 6, name: 'Saturday' },
  ];

  const handleToggleOffDay = (day: number) => {
    const exists = settings.weeklyOffDays.includes(day);
    const updated = exists
      ? settings.weeklyOffDays.filter((d) => d !== day)
      : [...settings.weeklyOffDays, day].sort();
    setSettings({ ...settings, weeklyOffDays: updated });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(settings);
    showToast('Settings saved successfully!', 'success');
  };

  const handleAddHolidaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName.trim()) return;
    onAddHoliday({
      holidayDate: newHolidayDate,
      title: newHolidayName.trim(),
    });
    setNewHolidayName('');
    showToast(`Added holiday "${newHolidayName}"!`, 'success');
  };

  const handleAddBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim()) return;
    onAddBatch(newBatchName.trim());
    setNewBatchName('');
    showToast(`Added batch "${newBatchName}"!`, 'success');
  };

  // Move batch up/down manually
  const handleMoveBatch = (index: number, direction: 'up' | 'down') => {
    if (!onReorderBatches) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= state.batches.length) return;

    const newBatches = [...state.batches];
    const [removed] = newBatches.splice(index, 1);
    newBatches.splice(targetIndex, 0, removed);
    const withSortOrder = newBatches.map((b, idx) => ({ ...b, sortOrder: idx + 1 }));
    onReorderBatches(withSortOrder);
    showToast(`Batch "${removed.name}" moved ${direction} (position #${targetIndex + 1})!`, 'success');
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex || !onReorderBatches) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newBatches = [...state.batches];
    const [removed] = newBatches.splice(draggedIndex, 1);
    newBatches.splice(dropIndex, 0, removed);
    const withSortOrder = newBatches.map((b, idx) => ({ ...b, sortOrder: idx + 1 }));

    setDraggedIndex(null);
    setDragOverIndex(null);
    onReorderBatches(withSortOrder);
    showToast(`Batch "${removed.name}" moved to position #${dropIndex + 1}!`, 'success');
  };

  // Quick preset sorters
  const handleSortBySeniority = () => {
    if (!onReorderBatches) return;
    const seniorityKeywords = [
      'tiger', 'tiny', 'little', 'kid', 'child',
      'cadet', 'junior', 'novice',
      'intermediate', 'teen', 'youth',
      'senior', 'adult', 'elite', 'advanced', 'sparring', 'black', 'master'
    ];

    const sorted = [...state.batches].sort((a, b) => {
      const aLower = a.name.toLowerCase();
      const bLower = b.name.toLowerCase();
      let aRank = seniorityKeywords.findIndex((k) => aLower.includes(k));
      let bRank = seniorityKeywords.findIndex((k) => bLower.includes(k));
      if (aRank === -1) aRank = 999;
      if (bRank === -1) bRank = 999;
      if (aRank !== bRank) return aRank - bRank;
      return a.name.localeCompare(b.name);
    });

    const withSortOrder = sorted.map((b, idx) => ({ ...b, sortOrder: idx + 1 }));
    onReorderBatches(withSortOrder);
    showToast('Batches ordered by class seniority with updated sort order!', 'success');
  };

  const handleSortByTime = () => {
    if (!onReorderBatches) return;
    const parseTimeToMinutes = (str: string): number => {
      const match = str.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (!match) return 9999;
      let hours = parseInt(match[1], 10);
      const minutes = match[2] ? parseInt(match[2], 10) : 0;
      const meridiem = match[3] ? match[3].toLowerCase() : null;

      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;
      if (!meridiem && hours >= 1 && hours <= 10) hours += 12;

      return hours * 60 + minutes;
    };

    const sorted = [...state.batches].sort((a, b) => {
      return parseTimeToMinutes(a.name) - parseTimeToMinutes(b.name);
    });

    const withSortOrder = sorted.map((b, idx) => ({ ...b, sortOrder: idx + 1 }));
    onReorderBatches(withSortOrder);
    showToast('Batches ordered chronologically by class time with updated sort order!', 'success');
  };

  const handleSortByStudents = () => {
    if (!onReorderBatches) return;
    const sorted = [...state.batches].sort((a, b) => {
      const countA = state.students.filter((s) => s.batchId === a.id && !s.isDeleted).length;
      const countB = state.students.filter((s) => s.batchId === b.id && !s.isDeleted).length;
      return countB - countA;
    });

    const withSortOrder = sorted.map((b, idx) => ({ ...b, sortOrder: idx + 1 }));
    onReorderBatches(withSortOrder);
    showToast('Batches ordered by enrolled student count with updated sort order!', 'success');
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-sky-100 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Academy Configuration & Rules
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure working days, automated suspension limits, PKR tuition fees, and batch schedules.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm transition-all hover:scale-102 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

      {/* Settings Sub Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none gap-2">
        {[
          { id: 'general', label: 'Academy Info', icon: Building },
          { id: 'calendar', label: 'Working Days & Holidays', icon: Calendar },
          { id: 'rules', label: 'Suspension & Attendance Rules', icon: Shield },
          { id: 'batches', label: 'Batches / Classes', icon: Layers },
          { id: 'data', label: 'Data & Backup', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 shrink-0 transition-colors cursor-pointer ${
                isActive
                  ? 'border-sky-600 text-sky-700 dark:text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: General Info */}
      {activeSubTab === 'general' && (
        <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl border border-sky-100 dark:border-slate-800 shadow-xs space-y-5 max-w-4xl">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Academy Name *
            </label>
            <input
              type="text"
              required
              value={settings.academyName}
              onChange={(e) => setSettings({ ...settings, academyName: e.target.value })}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={settings.currencySymbol || 'Rs.'}
                onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Currency Code
              </label>
              <input
                type="text"
                value={settings.currency || 'PKR'}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Contact WhatsApp / Phone
            </label>
            <input
              type="text"
              value={settings.contactPhone}
              onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Logo Image URL (or /logo.svg)
            </label>
            <input
              type="text"
              value={settings.logoUrl || ''}
              onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Timezone
            </label>
            <input
              type="text"
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              Save Academy Info
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Calendar & Working Days */}
      {activeSubTab === 'calendar' && (
        <div className="space-y-6 max-w-4xl">
          {/* Weekly Off Days */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-sky-100 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Weekly Academy Off Days
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Check the days of the week when the academy is closed. Attendance will not count on these days.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {weekdays.map((w) => {
                const isOff = settings.weeklyOffDays.includes(w.day);
                return (
                  <button
                    type="button"
                    key={w.day}
                    onClick={() => handleToggleOffDay(w.day)}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${
                      isOff
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span>{w.name}</span>
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                        isOff ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isOff ? 'OFF' : 'OPEN'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Special Holidays */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-sky-100 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Special Academy Holidays & Closures
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Add Eid holidays, national holidays, or facility maintenance days.
              </p>
            </div>

            <form onSubmit={handleAddHolidaySubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="date"
                required
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
              <input
                type="text"
                required
                placeholder="Holiday reason (e.g. Eid-ul-Fitr Break)"
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs"
              >
                Add Holiday
              </button>
            </form>

            <div className="space-y-2 pt-2">
              {state.holidays.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-xl">
                  No holidays configured.
                </div>
              ) : (
                state.holidays.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white mr-3">{h.holidayDate}</span>
                      <span className="text-slate-600 dark:text-slate-300">{h.title}</span>
                    </div>
                    <button
                      onClick={() => onDeleteHoliday(h.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Suspension & Attendance Rules */}
      {activeSubTab === 'rules' && (
        <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-sky-100 dark:border-slate-800 shadow-xs space-y-6 max-w-4xl">
          {/* Suspension rules */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-600" />
              <span>Consecutive Absence Rules</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Automated Suspension Threshold (Working Days)
              </label>
              <input
                type="number"
                min="3"
                max="30"
                value={settings.suspensionThreshold}
                onChange={(e) => setSettings({ ...settings, suspensionThreshold: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                When a student accumulates this number of consecutive working-day absences without approved leave, they are auto-suspended.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Warning Threshold (Working Days)
              </label>
              <input
                type="number"
                min="1"
                max={settings.suspensionThreshold - 1}
                value={settings.warningThreshold}
                onChange={(e) => setSettings({ ...settings, warningThreshold: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Displays amber warning badge on attendance sheet and dashboard so instructor contacts the guardian.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Re-Admission Fee ({settings.currencySymbol || 'Rs.'})
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={settings.readmissionFee}
                onChange={(e) => setSettings({ ...settings, readmissionFee: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Billed automatically when a suspended student is re-admitted to the academy.
              </p>
            </div>
          </div>

          {/* 45-day lock */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-sky-600" />
              <span>Historical Attendance Lock</span>
            </h3>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Unlock All Past Attendance
                </div>
                <div className="text-[11px] text-slate-500">
                  Allows editing attendance records older than {settings.attendanceLockDays} days.
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.unlockAll || false}
                onChange={(e) => setSettings({ ...settings, unlockAll: e.target.checked })}
                className="w-5 h-5 rounded-md text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Leaderboard rewards */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-500" />
              <span>Leaderboard Rewards</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Number of Reward Winning Slots (e.g. Top 3)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.rewardSlots}
                onChange={(e) => setSettings({ ...settings, rewardSlots: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reward Description / Prize Text
              </label>
              <input
                type="text"
                value={settings.rewardText}
                onChange={(e) => setSettings({ ...settings, rewardText: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-colors"
          >
            Save Rules
          </button>
        </form>
      )}

      {/* Tab 4: Batches Management with Drag-and-Drop & Manual Sorting */}
      {activeSubTab === 'batches' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-sky-100 dark:border-slate-800 shadow-xs space-y-5 max-w-4xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600" />
                <span>Academy Batches & Class Groups</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Drag cards or use Up/Down arrows to order classes by seniority or time of day.
              </p>
            </div>

            {/* Quick Sort Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleSortByTime}
                title="Sort batches chronologically by time of day"
                className="px-2.5 py-1 rounded-lg border border-sky-200 dark:border-slate-700 bg-sky-50/70 dark:bg-slate-800 hover:bg-sky-100 text-sky-800 dark:text-sky-300 text-[11px] font-bold flex items-center space-x-1 transition-colors"
              >
                <Clock className="w-3 h-3 text-sky-600" />
                <span>By Time</span>
              </button>
              <button
                type="button"
                onClick={handleSortBySeniority}
                title="Sort batches by belt/age seniority progression"
                className="px-2.5 py-1 rounded-lg border border-sky-200 dark:border-slate-700 bg-sky-50/70 dark:bg-slate-800 hover:bg-sky-100 text-sky-800 dark:text-sky-300 text-[11px] font-bold flex items-center space-x-1 transition-colors"
              >
                <GraduationCap className="w-3 h-3 text-sky-600" />
                <span>By Seniority</span>
              </button>
              <button
                type="button"
                onClick={handleSortByStudents}
                title="Sort batches by enrolled student count"
                className="px-2.5 py-1 rounded-lg border border-sky-200 dark:border-slate-700 bg-sky-50/70 dark:bg-slate-800 hover:bg-sky-100 text-sky-800 dark:text-sky-300 text-[11px] font-bold flex items-center space-x-1 transition-colors"
              >
                <ArrowUpDown className="w-3 h-3 text-sky-600" />
                <span>By Size</span>
              </button>
            </div>
          </div>

          {/* Add Batch Form */}
          <form onSubmit={handleAddBatchSubmit} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="New batch name (e.g. Junior Cadets - 5:30 PM)"
              value={newBatchName}
              onChange={(e) => setNewBatchName(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shrink-0 transition-colors shadow-xs"
            >
              Add Batch
            </button>
          </form>

          {/* Draggable & Sortable Batches List */}
          <div className="space-y-2.5 pt-1">
            {state.batches.map((b, index) => {
              const enrolledCount = state.students.filter((s) => s.batchId === b.id && !s.isDeleted).length;
              const isFirst = index === 0;
              const isLast = index === state.batches.length - 1;
              const isBeingDragged = draggedIndex === index;
              const isDropTarget = dragOverIndex === index;

              return (
                <div
                  key={b.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between text-xs cursor-move select-none ${
                    isBeingDragged
                      ? 'opacity-40 border-sky-400 bg-sky-100 dark:bg-sky-950'
                      : isDropTarget
                      ? 'border-sky-500 ring-2 ring-sky-400 bg-sky-50 dark:bg-sky-900/40'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-sky-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {/* Drag Handle & Hierarchy Order Badge */}
                    <div className="flex items-center space-x-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      <GripVertical className="w-4 h-4 cursor-grab" title="Drag to reorder batch hierarchy" />
                      <span
                        title={`Hierarchy Rank #${b.sortOrder ?? index + 1}`}
                        className="w-5 h-5 rounded-md bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 text-[10px] font-black flex items-center justify-center border border-sky-200 dark:border-slate-600 shadow-2xs"
                      >
                        {b.sortOrder ?? index + 1}
                      </span>
                    </div>

                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">{b.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {enrolledCount} {enrolledCount === 1 ? 'student enrolled' : 'students enrolled'} • Hierarchy #{b.sortOrder ?? index + 1}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {/* Manual Sort Buttons */}
                    <button
                      type="button"
                      id={`batch-move-up-${b.id}`}
                      disabled={isFirst}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveBatch(index, 'up');
                      }}
                      title="Move batch up in hierarchy"
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        isFirst
                          ? 'opacity-30 border-transparent text-slate-300 cursor-not-allowed'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      id={`batch-move-down-${b.id}`}
                      disabled={isLast}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveBatch(index, 'down');
                      }}
                      title="Move batch down in hierarchy"
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        isLast
                          ? 'opacity-30 border-transparent text-slate-300 cursor-not-allowed'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {state.batches.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteBatch(b.id);
                        }}
                        title="Delete batch"
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors ml-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-400 italic">
            Tip: You can drag each batch row up or down, or use the arrow buttons to position morning, afternoon, and evening batches in exact sequence.
          </p>
        </div>
      )}

      {/* Tab 5: Data & Backup */}
      {activeSubTab === 'data' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-sky-100 dark:border-slate-800 shadow-xs space-y-6 max-w-4xl">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Database Export & Backup
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Download the student and attendance data currently available from Supabase.
            </p>
            <button
              onClick={onExportAll}
              className="mt-3 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-2 shadow-xs transition-colors cursor-pointer"
            >
              <Database className="w-4 h-4" />
              <span>Download Complete Database (.xlsx)</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            The dashboard no longer seeds or restores sample student records.
          </div>
        </div>
      )}
    </div>
  );
};
