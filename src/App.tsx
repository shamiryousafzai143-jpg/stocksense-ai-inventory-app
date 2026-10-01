import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { AppLayout } from './components/AppLayout';
import { Building2, Loader2 } from 'lucide-react';

const MainView: React.FC = () => {
  const { user, session, isLoading } = useAuth();

  // Initial loading splash while Supabase session and profile are resolved
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 animate-pulse">
          <Building2 className="w-6 h-6" />
        </div>
        <div className="text-white font-bold text-lg tracking-tight">StockSense</div>
        <div className="text-slate-400 text-xs mt-1">Nowshera Shopping Mall</div>
        <div className="mt-6 flex items-center gap-2 text-xs text-slate-400 font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
          <span>Restoring authentication session...</span>
        </div>
      </div>
    );
  }

  // Requirement 7: If no authenticated session exists, redirect to login
  if (!session || !user) {
    return <LoginPage />;
  }

  // Requirement 7: If authenticated, show the dashboard
  return <AppLayout />;
};

export default function App() {
  return (
    <AuthProvider>
      <MainView />
    </AuthProvider>
  );
}
