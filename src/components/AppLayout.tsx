import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ConfigModal } from './ConfigModal';
import { ActiveNavTab } from '../types';
import { DashboardPage } from '../pages/DashboardPage';
import { InventoryPage } from '../pages/InventoryPage';
import { StockInPage } from '../pages/StockInPage';
import { StockOutPage } from '../pages/StockOutPage';
import { HistoryPage } from '../pages/HistoryPage';
import { FinancialOverviewPage } from '../pages/FinancialOverviewPage';
import { AIAssistantPage } from '../pages/AIAssistantPage';

export const AppLayout: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<ActiveNavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentTab} />;
      case 'inventory':
        return <InventoryPage />;
      case 'stock-in':
        return <StockInPage />;
      case 'stock-out':
        return <StockOutPage />;
      case 'history':
        return <HistoryPage />;
      case 'financials':
        return <FinancialOverviewPage />;
      case 'ai-assistant':
        return <AIAssistantPage />;
      default:
        return <DashboardPage onNavigate={setCurrentTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row">
      {/* Sidebar (Desktop + Mobile Drawer) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onOpenConfig={() => setIsConfigOpen(true)}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          currentTab={currentTab}
          onOpenMobile={() => setIsMobileMenuOpen(true)}
          onOpenConfig={() => setIsConfigOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderContent()}
        </main>
      </div>

      {/* Supabase Configuration Modal */}
      <ConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />
    </div>
  );
};
