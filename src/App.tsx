import React, { useState, useEffect, useCallback } from 'react';
import { AppState, Batch, FeeRecord, Holiday, Settings, Student } from './types';
import {
  createEmptyState,
  loadState,
  mapSupabaseState,
  mapSupabaseStudent,
  saveState,
  readmitStudent,
  recordFeePayment,
  softDeleteStudent,
} from './lib/storage';
import { formatDateKey } from './lib/attendanceMath';
import { exportAllDataExcel } from './lib/exportExcel';
import { formatPKR } from './lib/pakistanFormat';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { AddEditStudentModal } from './components/AddEditStudentModal';
import { MarkPaidModal } from './components/MarkPaidModal';
import { StudentProfileModal } from './components/StudentProfileModal';

import { DashboardPage } from './pages/DashboardPage';
import { AttendancePage } from './pages/AttendancePage';
import { StudentsPage } from './pages/StudentsPage';
import { FeesPage } from './pages/FeesPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ReportsPage } from './pages/ReportsPage';
import { SuspendedPage } from './pages/SuspendedPage';
import { SettingsPage } from './pages/SettingsPage';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning';
}

export default function App() {
  const [state, setState] = useState<AppState>(() => createEmptyState());
  const [dataReady, setDataReady] = useState(false);
  const [dataError, setDataError] = useState('');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('attendpro_dark') === 'true';
  });
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('attendpro_sidebar_desktop_collapsed') === 'true';
  });
  const [isSidebarCollapsedMobile, setIsSidebarCollapsedMobile] = useState<boolean>(() => {
    return localStorage.getItem('attendpro_sidebar_mobile_collapsed') === 'true';
  });

  // Drill-down filters state across pages
  const [studentsBeltFilter, setStudentsBeltFilter] = useState<string | null>(null);
  const [studentsWarningFilter, setStudentsWarningFilter] = useState<boolean>(false);
  const [feesStatusFilter, setFeesStatusFilter] = useState<'all' | 'unpaid' | 'paid' | 'partial' | null>(null);
  const [attendanceDate, setAttendanceDate] = useState<string | null>(null);

  // Modals state
  const [isAddEditStudentOpen, setIsAddEditStudentOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);

  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);

  const [feeRecordToPay, setFeeRecordToPay] = useState<FeeRecord | null>(null);
  const [studentForFeePayment, setStudentForFeePayment] = useState<Student | null>(null);

  // Toast system
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/dashboard-data')
      .then(async (response) => {
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          if (response.status === 404) {
            throw new Error('The dashboard API is not deployed. Redeploy the latest Vercel project revision.');
          }
          throw new Error(`The dashboard API returned an unexpected response (${response.status}).`);
        }
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Could not load the Supabase roster.');
        if (!Array.isArray(body.students) || !Array.isArray(body.attendance)) {
          throw new Error('The dashboard API response is missing roster or attendance data.');
        }
        return body;
      })
      .then((payload) => {
        if (!active) return;
        const remoteState = mapSupabaseState(payload);
        saveState(remoteState);
        setState(remoteState);
        setDataReady(true);
      })
      .catch((error) => {
        if (!active) return;
        setDataError(error instanceof Error ? error.message : 'Could not load the Supabase roster.');
        setDataReady(true);
      });
    return () => { active = false; };
  }, []);

  const handleSelectTab = (tab: string) => {
    setActiveTab(tab);
  };

  const handleViewUnpaidFees = useCallback(() => {
    setFeesStatusFilter('unpaid');
    setActiveTab('fees');
  }, []);

  const handleInspectWarnings = useCallback(() => {
    setStudentsWarningFilter(true);
    setStudentsBeltFilter(null);
    setActiveTab('students');
  }, []);

  const handleFilterRosterByBelt = useCallback((belt: string) => {
    setStudentsBeltFilter(belt === 'all' ? null : belt);
    setStudentsWarningFilter(false);
    setActiveTab('students');
  }, []);

  const handleMarkTodayAttendance = useCallback(() => {
    setAttendanceDate(formatDateKey(new Date()));
    setActiveTab('attendance');
  }, []);

  // Reload state from storage
  const refreshState = useCallback(() => {
    setState(loadState());
  }, []);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('attendpro_dark', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('attendpro_dark', 'false');
    }
  }, [darkMode]);

  // Key metrics for badges
  const suspendedCount = state.students.filter((s) => s.status === 'suspended' && !s.isDeleted).length;
  const currentMonthPrefix = new Date().toISOString().substring(0, 7);
  const unpaidCount = state.feeRecords.filter(
    (f) => f.feeMonth.startsWith(currentMonthPrefix) && f.status !== 'paid'
  ).length;
  const warningCount = state.students.filter(
    (s) => s.status === 'active' && !s.isDeleted && s.currentAbsenceStreak >= state.settings.warningThreshold
  ).length;

  // Export full Excel database
  const handleExportAll = () => {
    exportAllDataExcel(state);
    showToast('Full academy database exported to Excel!', 'success');
  };

  // Student operations
  const handleSaveStudent = async (studentData: Partial<Student>) => {
    const currentState = loadState();
    let updatedStudents: Student[];

    if (studentData.id) {
      // Edit existing
      updatedStudents = currentState.students.map((s) =>
        s.id === studentData.id ? ({ ...s, ...studentData } as Student) : s
      );
      showToast(`Updated student profile for ${studentData.fullName}!`, 'success');
    } else {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save this student to Supabase.');
      if (!result.student) throw new Error('Supabase did not return the saved student record.');
      const newStudent = mapSupabaseStudent(result.student);
      updatedStudents = [...currentState.students, newStudent];
      showToast(`Saved ${newStudent.fullName} to Supabase!`, 'success');
    }

    const nextState = { ...currentState, students: updatedStudents };
    saveState(nextState);
    setState(nextState);
  };

  const handleDeleteStudent = (studentId: string) => {
    const updated = softDeleteStudent(studentId);
    setState(updated);
    showToast('Student archived. Historical reports preserved.', 'warning');
  };

  // Fee payment operations
  const handleOpenPayFee = (feeRecord: FeeRecord) => {
    const student = state.students.find((s) => s.id === feeRecord.studentId) || null;
    setFeeRecordToPay(feeRecord);
    setStudentForFeePayment(student);
  };

  const handleConfirmFeePayment = (
    feeRecordId: string,
    amountPaying: number,
    method: 'cash' | 'bank' | 'online' | 'other',
    note?: string
  ) => {
    const nextState = recordFeePayment(feeRecordId, amountPaying, method, note);
    setState(nextState);
    showToast(`Recorded payment of ${formatPKR(amountPaying)}!`, 'success');
  };

  // Re-admit student
  const handleReadmitStudent = (studentId: string) => {
    const stu = state.students.find((s) => s.id === studentId);
    if (!stu) return;
    const nextState = readmitStudent(studentId);
    setState(nextState);
    showToast(
      `${stu.fullName} re-admitted! Absence streak reset and ${formatPKR(nextState.settings.readmissionFee)} fee billed.`,
      'success'
    );
  };

  // Batch operations
  const handleAddBatch = (name: string) => {
    const newBatch: Batch = {
      id: `batch-${Date.now()}`,
      name,
      isActive: true,
      sortOrder: state.batches.length + 1,
    };
    const nextState = { ...state, batches: [...state.batches, newBatch] };
    saveState(nextState);
    setState(nextState);
  };

  const handleDeleteBatch = (batchId: string) => {
    const nextState = { ...state, batches: state.batches.filter((b) => b.id !== batchId) };
    saveState(nextState);
    setState(nextState);
    showToast('Batch removed.', 'warning');
  };

  const handleReorderBatches = (reorderedBatches: Batch[]) => {
    const nextBatches = reorderedBatches.map((b, idx) => ({ ...b, sortOrder: idx + 1 }));
    const nextState = { ...state, batches: nextBatches };
    saveState(nextState);
    setState(nextState);
  };

  // Holiday operations
  const handleAddHoliday = (h: Omit<Holiday, 'id'>) => {
    const newHoliday: Holiday = {
      id: `hol-${Date.now()}`,
      holidayDate: h.holidayDate,
      title: h.title,
    };
    const nextState = { ...state, holidays: [...state.holidays, newHoliday] };
    saveState(nextState);
    setState(nextState);
  };

  const handleDeleteHoliday = (holidayId: string) => {
    const nextState = { ...state, holidays: state.holidays.filter((h) => h.id !== holidayId) };
    saveState(nextState);
    setState(nextState);
    showToast('Holiday removed.', 'warning');
  };

  // Settings
  const handleSaveSettings = (newSettings: Settings) => {
    const nextState = { ...state, settings: newSettings };
    saveState(nextState);
    setState(nextState);
  };

  // Student profile select
  const handleSelectStudent = (studentId: string) => {
    const s = state.students.find((stu) => stu.id === studentId) || null;
    setSelectedStudentForProfile(s);
  };

  return (
    <div className="min-h-screen bg-sky-50/30 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans transition-colors">
      {/* Side Navigation Panel */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        settings={state.settings}
        suspendedCount={suspendedCount}
        unpaidCount={unpaidCount}
        warningCount={warningCount}
        isOpenMobile={isSidebarOpenMobile}
        setIsOpenMobile={setIsSidebarOpenMobile}
        isCollapsedDesktop={isSidebarCollapsed}
        setIsCollapsedDesktop={setIsSidebarCollapsed}
        isCollapsedMobile={isSidebarCollapsedMobile}
        setIsCollapsedMobile={setIsSidebarCollapsedMobile}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onExportAll={handleExportAll}
      />

      {/* Main Content Area beside Side Panel */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-[290px]'
        }`}
      >
        {/* Top Navigation */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={handleSelectTab}
          settings={state.settings}
          suspendedCount={suspendedCount}
          unpaidCount={unpaidCount}
          warningCount={warningCount}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onExportAll={handleExportAll}
          onOpenMobileSidebar={() => setIsSidebarOpenMobile(true)}
        />

        {/* Main Container - max-w-[1600px] to utilize wide screens without cramped narrow layout */}
        <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-12">
        {!dataReady && (
          <div className="mb-5 rounded-2xl border border-sky-200 bg-white p-4 text-sm font-semibold text-sky-800 shadow-xs">
            Connecting to Supabase and loading the original roster…
          </div>
        )}
        {dataError && (
          <div role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            {dataError} The dashboard is showing no student data until the database connection is available.
            <button className="ml-3 underline" onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}
        {activeTab === 'dashboard' && (
          <DashboardPage
            state={state}
            setActiveTab={handleSelectTab}
            onSelectStudent={handleSelectStudent}
            onExportAll={handleExportAll}
            onViewUnpaidFees={handleViewUnpaidFees}
            onInspectWarnings={handleInspectWarnings}
            onFilterRosterByBelt={handleFilterRosterByBelt}
            onMarkTodayAttendance={handleMarkTodayAttendance}
          />
        )}

        {activeTab === 'attendance' && (
          <AttendancePage
            state={state}
            onStateChange={refreshState}
            onSelectStudent={handleSelectStudent}
            showToast={showToast}
            initialSelectedDate={attendanceDate}
          />
        )}

        {activeTab === 'students' && (
          <StudentsPage
            state={state}
            onOpenAddStudent={() => {
              setStudentToEdit(null);
              setIsAddEditStudentOpen(true);
            }}
            onEditStudent={(s) => {
              setStudentToEdit(s);
              setIsAddEditStudentOpen(true);
            }}
            onDeleteStudent={handleDeleteStudent}
            onSelectStudent={handleSelectStudent}
            initialBeltFilter={studentsBeltFilter}
            initialWarningFilter={studentsWarningFilter}
            onClearInitialFilters={() => {
              setStudentsBeltFilter(null);
              setStudentsWarningFilter(false);
            }}
          />
        )}

        {activeTab === 'fees' && (
          <FeesPage
            state={state}
            onStateChange={refreshState}
            onPayFee={handleOpenPayFee}
            onSelectStudent={handleSelectStudent}
            showToast={showToast}
            initialStatusFilter={feesStatusFilter}
            onClearInitialStatusFilter={() => setFeesStatusFilter(null)}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardPage
            state={state}
            onSelectStudent={handleSelectStudent}
            showToast={showToast}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsPage
            state={state}
            onStateChange={refreshState}
            onSelectStudent={handleSelectStudent}
            showToast={showToast}
          />
        )}

        {activeTab === 'suspended' && (
          <SuspendedPage
            state={state}
            onReadmitStudent={handleReadmitStudent}
            onSelectStudent={handleSelectStudent}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            state={state}
            onSaveSettings={handleSaveSettings}
            onAddHoliday={handleAddHoliday}
            onDeleteHoliday={handleDeleteHoliday}
            onAddBatch={handleAddBatch}
            onDeleteBatch={handleDeleteBatch}
            onReorderBatches={handleReorderBatches}
            onExportAll={handleExportAll}
            showToast={showToast}
          />
        )}
        </main>
      </div>

      {/* Mobile-first Bottom Navigation with Side Panel launcher */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        unpaidCount={unpaidCount}
        suspendedCount={suspendedCount}
        warningCount={warningCount}
        onOpenSidePanel={() => setIsSidebarOpenMobile(true)}
      />

      {/* Student Profile & Attendance Heatmap Modal */}
      <StudentProfileModal
        isOpen={!!selectedStudentForProfile}
        onClose={() => setSelectedStudentForProfile(null)}
        student={selectedStudentForProfile}
        batch={state.batches.find((b) => b.id === selectedStudentForProfile?.batchId)}
        allAttendance={state.attendance}
        allFees={state.feeRecords}
        allSuspensions={state.suspensions}
        settings={state.settings}
        holidays={state.holidays}
        onEditStudent={(s) => {
          setSelectedStudentForProfile(null);
          setStudentToEdit(s);
          setIsAddEditStudentOpen(true);
        }}
        onDeleteStudent={handleDeleteStudent}
        onPayFee={(fee) => {
          setSelectedStudentForProfile(null);
          handleOpenPayFee(fee);
        }}
        onReadmitStudent={handleReadmitStudent}
      />

      {/* Add / Edit Student Dialog */}
      <AddEditStudentModal
        isOpen={isAddEditStudentOpen}
        onClose={() => {
          setIsAddEditStudentOpen(false);
          setStudentToEdit(null);
        }}
        onSave={handleSaveStudent}
        studentToEdit={studentToEdit}
        batches={state.batches}
      />

      {/* Record Fee Payment Modal */}
      <MarkPaidModal
        isOpen={!!feeRecordToPay}
        onClose={() => {
          setFeeRecordToPay(null);
          setStudentForFeePayment(null);
        }}
        onConfirm={handleConfirmFeePayment}
        feeRecord={feeRecordToPay}
        student={studentForFeePayment}
      />

      {/* Toast Notification Container */}
      <div className="fixed top-20 right-4 z-50 space-y-2 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-4 rounded-xl shadow-lg border text-xs font-semibold pointer-events-auto transition-all animate-in slide-in-from-top-2 ${
              t.type === 'success'
                ? 'bg-sky-900 text-white border-sky-700'
                : t.type === 'warning'
                ? 'bg-amber-900 text-amber-100 border-amber-700'
                : 'bg-red-900 text-white border-red-700'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
