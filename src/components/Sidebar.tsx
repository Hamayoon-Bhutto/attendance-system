import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  CalendarOff,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings as SettingsIcon,
  Sun,
  Users,
  Wallet,
  X
} from 'lucide-react';
import { Settings } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  settings: Settings;
  suspendedCount: number;
  unpaidCount: number;
  warningCount: number;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  isCollapsedDesktop: boolean;
  setIsCollapsedDesktop: (collapsed: boolean) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onExportAll: () => void;
}

interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  badge?: string;
  badgeColor?: string;
}

interface SidebarNavItemProps {
  item: NavItemConfig;
  isActive: boolean;
  isCollapsedDesktop: boolean;
  onClick: () => void;
}

/**
 * Shared Navigation Item Component
 * Implements 3-column CSS Grid: 36px icon, flexible text area, and status badge pill.
 * If title cannot fit beside badge, moves badge beneath description inside text area.
 */
const SidebarNavItem: React.FC<SidebarNavItemProps> = ({
  item,
  isActive,
  isCollapsedDesktop,
  onClick,
}) => {
  const containerRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const [badgeBelow, setBadgeBelow] = useState<boolean>(false);

  const { id, label, icon: Icon, description, badge, badgeColor } = item;

  // Responsive check: if title cannot fit comfortably beside badge in 3-column layout, wrap badge below description
  useEffect(() => {
    if (!badge) {
      if (badgeBelow) setBadgeBelow(false);
      return;
    }

    const evaluatePlacement = () => {
      const container = containerRef.current;
      const titleEl = titleRef.current;
      const badgeEl = badgeRef.current;
      if (!container || !titleEl) return;

      // Container inner width (width minus 28px horizontal padding: 14px * 2)
      const containerInnerWidth = container.clientWidth - 28;
      // Icon: 36px fixed width
      // 2 gaps of 11px each = 22px
      const badgeWidth = badgeEl ? badgeEl.offsetWidth : 74;

      // Available width for title when badge is beside in column 3
      const availableTextWidth = containerInnerWidth - 36 - 22 - badgeWidth;
      const titleNaturalWidth = titleEl.scrollWidth;

      if (containerInnerWidth > 0 && titleNaturalWidth > availableTextWidth) {
        setBadgeBelow(true);
      } else {
        setBadgeBelow(false);
      }
    };

    evaluatePlacement();

    const observer = new ResizeObserver(evaluatePlacement);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [badge, label, badgeBelow]);

  return (
    <div className="w-full">
      {/* 1. Desktop Collapsed Mode (Icon-rail view) */}
      {isCollapsedDesktop && (
        <button
          id={`sidebar-nav-${id}-collapsed`}
          onClick={onClick}
          title={`${label} — ${description}${badge ? ` (${badge})` : ''}`}
          aria-label={label}
          className={`w-full min-h-[48px] hidden lg:flex items-center justify-center p-2.5 rounded-xl transition-all relative group cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
            isActive
              ? 'bg-sky-50 dark:bg-sky-950/70 text-sky-800 dark:text-sky-200 shadow-xs ring-1 ring-sky-500/20'
              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
          }`}
        >
          <div
            className={`w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              isActive
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400'
            }`}
          >
            <Icon className="w-5 h-5 shrink-0" />
          </div>

          {/* Accessible notification dot indicator when desktop rail is collapsed */}
          {badge && (
            <span
              className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-white dark:ring-slate-900 animate-pulse"
              aria-label={`Notification: ${badge}`}
            />
          )}

          {/* Active indicator bar */}
          {isActive && (
            <div className="absolute left-0 top-2 bottom-2 w-1 bg-sky-600 rounded-r-full" />
          )}
        </button>
      )}

      {/* 2. Expanded Mode (Desktop Expanded or Mobile Drawer) */}
      <button
        id={`sidebar-nav-${id}`}
        ref={containerRef}
        onClick={onClick}
        aria-label={`${label}, ${description}${badge ? `, ${badge}` : ''}`}
        style={{
          fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
          display: isCollapsedDesktop ? undefined : 'grid',
          gridTemplateColumns:
            badge && !badgeBelow
              ? '36px minmax(0, 1fr) auto'
              : '36px minmax(0, 1fr)',
          gap: '11px',
          padding: '10px 14px',
          alignItems: 'center',
        }}
        className={`w-full text-left rounded-xl transition-all relative group cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 ${
          isCollapsedDesktop ? 'grid lg:hidden' : 'grid'
        } ${
          isActive
            ? 'bg-sky-50 dark:bg-sky-950/70 text-sky-900 dark:text-sky-100 shadow-xs ring-1 ring-sky-500/20'
            : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
        }`}
      >
        {/* Column 1: Fixed 36px Icon */}
        <div
          style={{ width: '36px', height: '36px' }}
          className={`min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center shrink-0 self-start sm:self-center transition-colors ${
            isActive
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400'
          }`}
        >
          <Icon className="w-5 h-5 shrink-0" />
        </div>

        {/* Column 2: Flexible Text Area */}
        <div className="flex flex-col min-w-0">
          <span
            ref={titleRef}
            style={{ fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif' }}
            className={`text-[16px] leading-snug tracking-tight ${
              isActive
                ? 'font-bold text-sky-950 dark:text-sky-50'
                : 'font-semibold text-slate-900 dark:text-slate-100'
            }`}
          >
            {label}
          </span>
          <span
            style={{ fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif' }}
            className="text-[14px] text-slate-500 dark:text-slate-400 font-normal leading-normal mt-0.5"
          >
            {description}
          </span>

          {/* If title cannot fit beside badge, wrap badge cleanly below description */}
          {badge && badgeBelow && (
            <div className="mt-1.5 flex items-center">
              <span
                ref={badgeRef}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  padding: '2px 8px',
                  fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
                }}
                className={`text-[13px] font-semibold rounded-full border shadow-2xs ${
                  badgeColor || 'bg-slate-100 text-slate-800 border-slate-300'
                }`}
              >
                {badge}
              </span>
            </div>
          )}
        </div>

        {/* Column 3: Status Badge Pill beside text (when space permits) */}
        {badge && !badgeBelow && (
          <div className="flex items-center justify-end shrink-0 self-center">
            <span
              ref={badgeRef}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                padding: '2px 8px',
                fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
              }}
              className={`text-[13px] font-semibold rounded-full border shadow-2xs ${
                badgeColor || 'bg-slate-100 text-slate-800 border-slate-300'
              }`}
            >
              {badge}
            </span>
          </div>
        )}

        {/* Active state left indicator bar */}
        {isActive && (
          <div className="absolute left-0 top-2 bottom-2 w-1 bg-sky-600 rounded-r-full" />
        )}
      </button>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  settings,
  suspendedCount,
  unpaidCount,
  warningCount,
  isOpenMobile,
  setIsOpenMobile,
  isCollapsedDesktop,
  setIsCollapsedDesktop,
  darkMode,
  setDarkMode,
  onExportAll,
}) => {
  const drawerRef = useRef<HTMLElement>(null);

  // Lock background scroll when mobile drawer is open
  useEffect(() => {
    if (isOpenMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpenMobile]);

  // Handle Escape key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpenMobile) {
        setIsOpenMobile(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpenMobile, setIsOpenMobile]);

  // Desktop keyboard shortcut: Ctrl+B or Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const target = e.target as HTMLElement;
        if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
        e.preventDefault();
        const next = !isCollapsedDesktop;
        setIsCollapsedDesktop(next);
        localStorage.setItem('attendpro_sidebar_desktop_collapsed', String(next));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsedDesktop, setIsCollapsedDesktop]);

  const handleToggleDesktopCollapse = () => {
    const next = !isCollapsedDesktop;
    setIsCollapsedDesktop(next);
    localStorage.setItem('attendpro_sidebar_desktop_collapsed', String(next));
  };

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    if (isOpenMobile) {
      setIsOpenMobile(false);
    }
  };

  // Navigation groupings
  const navigationGroups: Array<{ group: string; items: NavItemConfig[] }> = [
    {
      group: 'Core Operations',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          description: 'Overview & metrics',
        },
        {
          id: 'attendance',
          label: 'Daily Attendance',
          icon: ClipboardCheck,
          description: 'Roll call & marking',
        },
        {
          id: 'students',
          label: 'Students Roster',
          icon: Users,
          description: 'Profiles & batches',
          badge: warningCount > 0 ? `${warningCount} Warning` : undefined,
          badgeColor:
            'bg-amber-100 text-amber-950 dark:bg-amber-950/90 dark:text-amber-300 border-amber-300/90 dark:border-amber-700/80',
        },
        {
          id: 'fees',
          label: 'Tuition & Fees',
          icon: Wallet,
          description: 'Payment status & billing',
          badge: unpaidCount > 0 ? `${unpaidCount} Due` : undefined,
          badgeColor:
            'bg-red-100 text-red-950 dark:bg-red-950/90 dark:text-red-300 border-red-300/90 dark:border-red-700/80',
        },
      ],
    },
    {
      group: 'Academics & Analytics',
      items: [
        {
          id: 'leaderboard',
          label: 'Leaderboard',
          icon: Award,
          description: 'Star of the month',
        },
        {
          id: 'reports',
          label: 'Monthly Reports',
          icon: FileText,
          description: 'PDF & Excel archives',
        },
        {
          id: 'suspended',
          label: 'Suspended Students',
          icon: CalendarOff,
          description: '10-day absence log',
          badge: suspendedCount > 0 ? `${suspendedCount}` : undefined,
          badgeColor:
            'bg-red-100 text-red-950 dark:bg-red-950/90 dark:text-red-300 border-red-300/90 dark:border-red-700/80',
        },
      ],
    },
    {
      group: 'System Settings',
      items: [
        {
          id: 'settings',
          label: 'Academy Settings',
          icon: SettingsIcon,
          description: 'Calendar, rules & batches',
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          id="sidebar-mobile-backdrop"
          className="fixed inset-0 z-40 lg:hidden bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setIsOpenMobile(false)}
          aria-hidden="true"
        />
      )}

      {/* Side Navigation Panel */}
      <aside
        id="app-side-panel"
        ref={drawerRef}
        aria-label="Main Navigation"
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800 transition-all duration-300 ease-in-out shadow-xl lg:shadow-xs ${
          // Desktop collapsed vs expanded (280–300px range)
          isCollapsedDesktop ? 'lg:w-20' : 'lg:w-[290px]'
        } ${
          // Mobile slide-over drawer: min(300px, calc(100vw - 32px))
          isOpenMobile
            ? 'translate-x-0 w-[min(300px,calc(100vw-32px))]'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header */}
        <div className="border-b border-sky-100 dark:border-slate-800/80 bg-sky-50/50 dark:bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            {/* Brand Logo & Name */}
            <div
              className="flex items-center space-x-3 cursor-pointer min-w-0"
              onClick={() => handleSelectTab('dashboard')}
            >
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 p-1 border border-sky-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-xs">
                <img src="/logo-icon.svg" alt="Sunrise Taekwondo" className="w-full h-full object-contain" />
              </div>

              {/* Show brand title when expanded or on mobile drawer */}
              <div className={`min-w-0 ${isCollapsedDesktop ? 'lg:hidden' : 'block'}`}>
                <div className="font-black text-base text-slate-900 dark:text-white leading-tight truncate">
                  Sunrise Taekwondo
                </div>
                <div className="text-xs text-sky-700 dark:text-sky-400 font-semibold tracking-wide truncate">
                  Martial Arts Centre
                </div>
              </div>
            </div>

            {/* Mobile Close Button (min 44x44px target) */}
            <button
              id="sidebar-mobile-close-btn"
              onClick={() => setIsOpenMobile(false)}
              className="lg:hidden min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close navigation drawer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Navigation Items (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navigationGroups.map((grp) => (
            <div key={grp.group} className="space-y-1.5">
              {/* Group Title - shown when expanded or on mobile */}
              <div
                style={{ fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif' }}
                className={`px-3 mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${
                  isCollapsedDesktop ? 'lg:hidden' : 'block'
                }`}
              >
                {grp.group}
              </div>

              <div className="space-y-1.5">
                {grp.items.map((item) => (
                  <SidebarNavItem
                    key={item.id}
                    item={item}
                    isActive={activeTab === item.id}
                    isCollapsedDesktop={isCollapsedDesktop}
                    onClick={() => handleSelectTab(item.id)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Quick Excel Export Card */}
          <div className="pt-2">
            <div className={`p-3.5 rounded-2xl bg-sky-50 dark:bg-slate-800/80 border border-sky-100 dark:border-slate-700/60 space-y-2.5 ${isCollapsedDesktop ? 'lg:hidden' : 'block'}`}>
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    Quick Excel Export
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Complete student & attendance backup
                  </div>
                </div>
              </div>

              <button
                onClick={onExportAll}
                className="w-full min-h-[44px] py-2 px-3 rounded-xl bg-white dark:bg-slate-700 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 text-emerald-800 dark:text-emerald-300 font-bold text-sm border border-emerald-200 dark:border-slate-600 shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Download .xlsx</span>
              </button>
            </div>

            {/* Collapsed icon for desktop */}
            {isCollapsedDesktop && (
              <div className="hidden lg:flex justify-center">
                <button
                  onClick={onExportAll}
                  className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                  title="Download complete database (.xlsx)"
                  aria-label="Download Excel backup"
                >
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Collapse / Expand Button */}
        <div className="hidden lg:block p-3 border-t border-slate-200 dark:border-slate-800/80">
          {!isCollapsedDesktop ? (
            <button
              id="sidebar-desktop-collapse-btn"
              onClick={handleToggleDesktopCollapse}
              className="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-semibold group cursor-pointer"
              title="Minimize sidebar to icon rail (Ctrl+B)"
            >
              <div className="flex items-center space-x-2.5">
                <PanelLeftClose className="w-5 h-5 text-slate-500 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors" />
                <span>Collapse Sidebar</span>
              </div>
              <span className="text-xs font-mono text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                Ctrl+B
              </span>
            </button>
          ) : (
            <div className="flex justify-center">
              <button
                id="sidebar-desktop-expand-btn"
                onClick={handleToggleDesktopCollapse}
                className="w-11 h-11 rounded-xl text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/60 border border-transparent hover:border-sky-200 dark:hover:border-sky-800/60 flex items-center justify-center transition-all group cursor-pointer"
                title="Expand sidebar (Ctrl+B)"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          )}
        </div>

        {/* Footer Area: Administrator Identity & Theme */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                  ST
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              </div>

              {/* Show admin info when expanded or on mobile */}
              <div className={`min-w-0 ${isCollapsedDesktop ? 'lg:hidden' : 'block'}`}>
                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  Master Admin
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {settings.academyName}
                </div>
              </div>
            </div>

            {/* Dark mode button */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer ${
                isCollapsedDesktop ? 'lg:hidden' : 'block'
              }`}
              title={darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-sky-600" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
