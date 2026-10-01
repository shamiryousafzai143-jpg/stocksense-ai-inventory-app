import React from 'react';
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  Sparkles,
  LogOut,
  Building2,
  X,
  Settings,
  Shield,
  Loader2,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ActiveNavTab } from '../types';

interface SidebarProps {
  currentTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenConfig?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  onOpenConfig,
}) => {
  const { profile, user, isProfileLoading, signOut } = useAuth();
  const isManager = profile?.role?.toLowerCase() === 'manager';

  const navItems = [
    {
      id: 'dashboard' as ActiveNavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Overview & stock metrics',
    },
    {
      id: 'inventory' as ActiveNavTab,
      label: 'Inventory',
      icon: Package,
      description: 'Products catalog & stock levels',
    },
    {
      id: 'stock-in' as ActiveNavTab,
      label: 'Stock In',
      icon: ArrowDownToLine,
      description: 'Receiving & replenishment',
    },
    {
      id: 'stock-out' as ActiveNavTab,
      label: 'Stock Out',
      icon: ArrowUpFromLine,
      description: 'Dispatch & customer sales',
    },
    {
      id: 'history' as ActiveNavTab,
      label: 'History',
      icon: History,
      description: 'Audit log & movements',
    },
    ...(isManager
      ? [
          {
            id: 'financials' as ActiveNavTab,
            label: 'Financial Overview',
            icon: DollarSign,
            description: 'Valuation & margins (Manager)',
          },
        ]
      : []),
    {
      id: 'ai-assistant' as ActiveNavTab,
      label: 'AI Assistant',
      icon: Sparkles,
      description: 'Inventory intelligence',
    },
  ];

  const handleTabClick = (tab: ActiveNavTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const handleSignOut = async () => {
    onCloseMobile();
    await signOut();
  };

  // Requirement 8: Display the user's full_name and role from public.profiles
  const displayName = profile?.full_name || (user?.email ? user.email.split('@')[0] : 'User');
  const roleName = profile?.role || (isProfileLoading ? 'Loading role...' : 'User');

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 select-none">
      {/* Brand Zone */}
      <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">StockSense</span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 truncate">Nowshera Shopping Mall</p>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Main Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-left transition-colors text-sm font-medium ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
              {item.id === 'ai-assistant' && (
                <span className="ml-auto text-[10px] tracking-wide text-emerald-300/80 uppercase">
                  Upcoming
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* User Profile Card & Role Display (Directly from public.profiles) */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/90">
        <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-200 text-xs font-semibold shrink-0">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate" title={displayName}>
                {displayName}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                <Shield className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="font-medium text-slate-200 truncate capitalize">
                  {roleName}
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400 text-[10px] truncate">
                  public.profiles
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between gap-2">
            {onOpenConfig && (
              <button
                onClick={onOpenConfig}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                title="Supabase Settings"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Config</span>
              </button>
            )}

            <button
              onClick={handleSignOut}
              className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-rose-300 hover:text-rose-200 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-64 h-screen shrink-0 border-r border-slate-800 sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer Canvas */}
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
