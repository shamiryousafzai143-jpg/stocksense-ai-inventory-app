import React from 'react';
import { Menu, LogOut, Shield, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ActiveNavTab } from '../types';

interface TopBarProps {
  currentTab: ActiveNavTab;
  onOpenMobile: () => void;
  onOpenConfig?: () => void;
}

const tabTitles: Record<ActiveNavTab, string> = {
  dashboard: 'Dashboard Overview',
  inventory: 'Product Inventory',
  'stock-in': 'Stock In Operations',
  'stock-out': 'Stock Out Operations',
  history: 'Activity & Audit Log',
  financials: 'Financial & Valuation Overview',
  'ai-assistant': 'StockSense Intelligence',
};

export const TopBar: React.FC<TopBarProps> = ({ currentTab, onOpenMobile, onOpenConfig }) => {
  const { profile, user, isProfileLoading, signOut, isConfigured } = useAuth();

  // Requirement 8: Display user's full_name and role in the application header
  const displayName = profile?.full_name || (user?.email ? user.email.split('@')[0] : 'User');
  const role = profile?.role || (isProfileLoading ? 'Loading...' : 'User');

  return (
    <header className="h-16 px-4 sm:px-6 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
      {/* Zone 1: Contextual Title & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-slate-900 truncate">
            {tabTitles[currentTab] || 'StockSense'}
          </span>
          <span className="hidden sm:inline text-slate-300">/</span>
          <span className="hidden sm:inline text-xs text-slate-500 font-normal">
            Nowshera Shopping Mall
          </span>
        </div>
      </div>

      {/* Zone 2: System Status / Context */}
      <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isConfigured ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
            aria-hidden="true"
          />
          <span className="text-slate-600 font-medium">
            {isConfigured ? 'Connected to Supabase' : 'Config Required'}
          </span>
        </div>
        <span aria-hidden="true" className="text-slate-300">·</span>
        <span className="text-slate-500">
          Profile Source: <span className="font-mono text-slate-700">public.profiles</span>
        </span>
      </div>

      {/* Zone 3: User Profile & Actions (Requirement 8) */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* User Role Badge */}
        <div className="flex items-center gap-2 pl-2">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-900 truncate max-w-[160px]">
              {displayName}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
              <span className="text-slate-400">Role:</span>
              <span className="font-semibold text-slate-800 capitalize">
                {role}
              </span>
            </div>
          </div>

          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-slate-900 text-white border border-slate-700"
            title={`${displayName} (Role: ${role})`}
          >
            {displayName.slice(0, 2).toUpperCase()}
          </div>
        </div>

        {/* Quick Sign Out Action (Requirement 9) */}
        <button
          onClick={() => signOut()}
          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          title="Sign out of StockSense"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
