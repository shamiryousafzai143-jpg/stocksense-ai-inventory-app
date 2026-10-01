import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getActiveSupabaseConfig } from '../lib/supabase';
import { Database, ShieldCheck, X, AlertCircle } from 'lucide-react';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose }) => {
  const { updateConfig, isConfigured } = useAuth();
  const current = getActiveSupabaseConfig();

  const [url, setUrl] = useState(current.url || '');
  const [anonKey, setAnonKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!url.trim().startsWith('http')) {
      setError('Please provide a valid Supabase project URL (must start with https://)');
      return;
    }

    if (anonKey.trim().length < 20) {
      setError('Please provide a valid Supabase anon/public key.');
      return;
    }

    const saved = updateConfig(url.trim(), anonKey.trim());
    if (saved) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setError('Failed to initialize Supabase client with these parameters.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Supabase Connection Settings</h3>
              <p className="text-xs text-slate-500">Nowshera Shopping Mall Backend</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5 flex items-start gap-2.5 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800">Security Rule: </span>
              Only use the public <code className="bg-slate-200/70 px-1 py-0.5 rounded text-slate-800">anon</code> key in client applications.
              Never paste the confidential <code className="bg-rose-50 text-rose-700 px-1 py-0.5 rounded">service_role</code> key.
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Supabase credentials applied successfully. Connecting...</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Supabase Project URL (VITE_SUPABASE_URL)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              required
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Supabase Anon / Public Key (VITE_SUPABASE_ANON_KEY)
            </label>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              required
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Found in your Supabase project dashboard under Settings &gt; API.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
            >
              {isConfigured ? 'Update Configuration' : 'Save & Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
