import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Calendar,
  ChevronRight,
  Clock,
  FileSpreadsheet,
  Menu,
  Moon,
  Search,
  Settings as SettingsIcon,
  Sun,
  User,
  Users,
  Wallet,
  X
} from 'lucide-react';
import { Settings } from '../types';
import { formatPKLiveClock } from '../lib/pakistanFormat';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  settings: Settings;
  suspendedCount: number;
  unpaidCount: number;
  warningCount: number;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onExportAll: () => void;
  onOpenMobileSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  settings,
  suspendedCount,
  unpaidCount,
  warningCount,
  darkMode,
  setDarkMode,
  onExportAll,
  onOpenMobileSidebar,
}) => {
  // Live ticking date and time state (exact to the second)
  const [now, setNow] = useState<Date>(new Date());
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  // Map active tab to human readable header info
  const tabTitles: Record<string, { title: string; subtitle: string; category: string }> = {
    dashboard: {
      title: 'Academy Dashboard',
      subtitle: 'Real-time attendance & operational performance',
      category: 'Overview',
    },
    attendance: {
      title: 'Daily Attendance Marking',
      subtitle: 'Working-day roll call, streaks & multi-batch attendance',
      category: 'Operations',
    },
    students: {
      title: 'Student Directory & Belts',
      subtitle: 'Enrolled martial arts students, batches & guardians',
      category: 'Management',
    },
    fees: {
      title: 'Tuition & Fee Ledger',
      subtitle: 'Monthly fees, re-admission charges & billing history (PKR)',
      category: 'Finance',
    },
    leaderboard: {
      title: 'Attendance Leaderboard',
      subtitle: 'Monthly rankings, tie-breakers & Star of the Month',
      category: 'Recognition',
    },
    reports: {
      title: 'Attendance Reports & Exports',
      subtitle: 'Official monthly certificates, PDF sheets & Excel workbooks',
      category: 'Analytics',
    },
    suspended: {
      title: 'Suspended Students Registry',
      subtitle: '10-consecutive absence disciplinary log & 1-click re-admission',
      category: 'Discipline',
    },
    settings: {
      title: 'Academy Settings & Rules',
      subtitle: 'Working days, holiday schedules, fees & batch configuration',
      category: 'System',
    },
  };

  const currentTabInfo = tabTitles[activeTab] || {
    title: 'Admin Control Panel',
    subtitle: 'Sunrise Taekwondo Martial Arts Centre',
    category: 'Admin',
  };

  const { dateFormatted, timeFormatted } = formatPKLiveClock(now);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-sky-100 dark:border-slate-800 shadow-xs transition-colors">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20">
          {/* Left: Mobile Menu Toggle & Breadcrumbs */}
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
            {/* Mobile Hamburger Side Panel Button */}
            <button
              id="mobile-sidebar-toggle-btn"
              onClick={onOpenMobileSidebar}
              className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 lg:hidden transition-colors flex items-center justify-center cursor-pointer"
              aria-label="Open side navigation drawer"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Mobile Brand Logo Icon */}
            <div
              className="lg:hidden flex items-center space-x-2 cursor-pointer shrink-0"
              onClick={() => setActiveTab('dashboard')}
            >
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 p-1 border border-sky-200 dark:border-slate-700 flex items-center justify-center shadow-xs">
                <img src="/logo-icon.svg" alt="Sunrise Taekwondo" className="w-full h-full object-contain" />
              </div>
            </div>

            {/* Breadcrumb & Section Title */}
            <div className="min-w-0">
              <div className="hidden sm:flex items-center space-x-2 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <span className="text-sky-800 dark:text-sky-300 font-bold">Sunrise Taekwondo</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span className="text-sky-600 dark:text-sky-400 font-bold">{currentTabInfo.category}</span>
              </div>
              <h1 className="text-base sm:text-xl lg:text-2xl font-black text-slate-900 dark:text-white truncate tracking-tight">
                {currentTabInfo.title}
              </h1>
            </div>
          </div>

          {/* Right: Actions, Live Date & Time & Profile Menu */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Exact Live Date & Time Badge (Pakistan Standard Time) */}
            <div
              id="header-live-clock"
              className="flex items-center space-x-2 px-3 sm:px-3.5 py-2 rounded-xl bg-sky-50 dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 border border-sky-200/70 dark:border-slate-700 shadow-2xs"
              title="Live Synchronized Pakistan Date and Time (PKT / UTC+5)"
            >
              <div className="flex items-center space-x-1.5 text-sky-700 dark:text-sky-400 font-bold">
                <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="hidden md:inline">{dateFormatted}</span>
              </div>
              <span className="hidden md:inline text-sky-300 dark:text-slate-600">•</span>
              <div className="flex items-center space-x-1.5 font-mono text-slate-800 dark:text-slate-100 font-bold text-xs sm:text-sm">
                <Clock className="w-4 h-4 text-sky-500 animate-pulse" />
                <span>{timeFormatted}</span>
                <span className="text-xs text-sky-600 dark:text-sky-400 font-bold">PKT</span>
              </div>
            </div>

            {/* Quick Export Excel */}
            <button
              id="header-export-data-btn"
              onClick={onExportAll}
              title="Export complete database to Excel workbook (.xlsx)"
              className="hidden md:flex min-h-[44px] items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/80 transition-colors shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export .xlsx</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              id="header-dark-toggle"
              onClick={() => setDarkMode(!darkMode)}
              className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors border border-slate-200/80 dark:border-slate-700 flex items-center justify-center cursor-pointer"
              title={darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-sky-600" />}
            </button>

            {/* Admin Profile Dropdown Container */}
            <div className="relative" ref={profileMenuRef}>
              <button
                id="header-profile-menu-button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="min-w-[44px] min-h-[44px] p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
                aria-haspopup="true"
                aria-expanded={isProfileMenuOpen}
                title="Master Administrator Menu"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center font-bold text-sm shadow-xs transition-colors ring-2 ring-sky-300 dark:ring-sky-800">
                  ST
                </div>
              </button>

              {/* Profile Menu Dropdown */}
              {isProfileMenuOpen && (
                <div
                  id="header-profile-dropdown"
                  className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  role="menu"
                >
                  {/* User identity header */}
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-xl bg-sky-600 text-white flex items-center justify-center font-black text-base shrink-0 shadow-sm">
                        ST
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-bold text-slate-900 dark:text-white truncate">
                          Master Administrator
                        </div>
                        <div className="text-xs text-sky-600 dark:text-sky-400 font-semibold truncate">
                          {settings.academyName}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate">
                          {settings.contactPhone}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => {
                        setActiveTab('settings');
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      role="menuitem"
                    >
                      <SettingsIcon className="w-4 h-4 text-sky-600" />
                      <span>Academy Settings & Rules</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('students');
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      role="menuitem"
                    >
                      <Users className="w-4 h-4 text-sky-600" />
                      <span>Students & Belt Roster</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('fees');
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      role="menuitem"
                    >
                      <Wallet className="w-4 h-4 text-sky-600" />
                      <span>Tuition & Fee Ledger</span>
                    </button>

                    <button
                      onClick={() => {
                        onExportAll();
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                      role="menuitem"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Download Excel Backup (.xlsx)</span>
                    </button>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

