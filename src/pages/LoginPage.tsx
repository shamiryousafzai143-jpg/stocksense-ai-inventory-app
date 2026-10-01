import React, { useState } from 'react';
import { Building2, Lock, Mail, Loader2, AlertCircle, Eye, EyeOff, ShieldCheck, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ConfigModal } from '../components/ConfigModal';

export const LoginPage: React.FC = () => {
  const { signIn, error, clearError, isConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!email.trim()) {
      setFormError('Please enter your email address.');
      return;
    }
    if (!password) {
      setFormError('Please enter your password.');
      return;
    }

    if (!isConfigured) {
      setShowConfigModal(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signIn(email, password);
      if (!result.success) {
        setFormError(result.error || 'Failed to sign in. Please check your credentials.');
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred during sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeError = formError || error;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background Decorative subtle geometry */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 text-emerald-400 shadow-md mb-4 border border-slate-800">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            StockSense
          </h1>
          <p className="mt-1.5 text-sm font-medium text-slate-600">
            Nowshera Shopping Mall
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise Inventory & Stock Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-slate-200 rounded-2xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Sign in to your account
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Authorized access for Mall Managers & Floor Staff
            </p>
          </div>

          {/* Connection Alert if Supabase is not configured */}
          {!isConfigured && (
            <div className="mb-6 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
              <Database className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block text-amber-900">Supabase Connection Required</span>
                <span>Configure your project URL and public anon key to connect to Nowshera Shopping Mall's database.</span>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(true)}
                  className="mt-2 block font-medium underline text-amber-900 hover:text-amber-950"
                >
                  Configure Supabase Credentials &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Invalid Login Error Banner */}
          {activeError && (
            <div
              className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in duration-150"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block text-rose-900">Authentication Failed</span>
                <span>{activeError}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Mall Email Address
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (activeError) {
                      setFormError(null);
                      clearError();
                    }
                  }}
                  placeholder="manager@nowsheramall.com"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Password
                </label>
              </div>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (activeError) {
                      setFormError(null);
                      clearError();
                    }
                  }}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50/50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-hidden"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Role Notice */}
            <div className="pt-1 text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>User profile and role permissions are loaded directly from public.profiles.</span>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>
          </form>

          {/* Supabase Config Action Link */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Supabase Source of Truth</span>
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="text-emerald-700 hover:text-emerald-800 font-medium hover:underline"
            >
              Connection Settings
            </button>
          </div>
        </div>

        {/* Mall Security & Compliance Footer Note */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Nowshera Shopping Mall Internal Inventory Portal
          <br />
          <span className="text-slate-400 text-[11px]">Strict public client key security enforcement</span>
        </p>
      </div>

      {/* Supabase Configuration Modal */}
      <ConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </div>
  );
};
