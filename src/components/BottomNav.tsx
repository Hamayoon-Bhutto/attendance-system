import React from 'react';
import {
  ClipboardCheck,
  LayoutDashboard,
  Menu,
  Users,
  Wallet
} from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unpaidCount: number;
  suspendedCount: number;
  warningCount: number;
  onOpenSidePanel: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  unpaidCount,
  suspendedCount,
  warningCount,
  onOpenSidePanel,
}) => {
  const quickTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
    { id: 'students', label: 'Students', icon: Users, badge: warningCount > 0 ? '!' : undefined },
    { id: 'fees', label: 'Fees', icon: Wallet, badge: unpaidCount > 0 ? String(unpaidCount) : undefined },
  ];

  const isOtherActive = ['leaderboard', 'reports', 'suspended', 'settings'].includes(activeTab);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-lg px-2 py-1.5 safe-area-inset-bottom">
      <div className="grid grid-cols-5 gap-1">
        {quickTabs.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`mobile-quick-tab-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative cursor-pointer ${
                isActive
                  ? 'text-sky-800 dark:text-sky-200 font-bold bg-sky-50/60 dark:bg-sky-950/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px] scale-110 text-sky-600 dark:text-sky-400' : 'stroke-[1.75px]'}`} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2.5 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-red-600 text-white min-w-[16px] text-center shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1 tracking-tight truncate max-w-[64px] font-semibold">{item.label}</span>
              {isActive && <div className="w-2 h-1 rounded-full bg-sky-600 dark:bg-sky-400 mt-0.5" />}
            </button>
          );
        })}

        {/* 5th Button: Open Full Drawer Menu */}
        <button
          id="mobile-open-sidepanel-btn"
          onClick={onOpenSidePanel}
          className={`min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative cursor-pointer ${
            isOtherActive
              ? 'text-sky-800 dark:text-sky-200 font-bold bg-sky-50/60 dark:bg-sky-950/40'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          title="Open complete navigation drawer"
          aria-label="Open complete navigation drawer"
        >
          <div className="relative">
            <Menu className={`w-5 h-5 ${isOtherActive ? 'stroke-[2.5px] text-sky-600 dark:text-sky-400' : 'stroke-[1.75px]'}`} />
            {suspendedCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
            )}
          </div>
          <span className="text-xs mt-1 tracking-tight font-semibold">More Menu</span>
          {isOtherActive && <div className="w-2 h-1 rounded-full bg-sky-600 dark:bg-sky-400 mt-0.5" />}
        </button>
      </div>
    </nav>
  );
};
