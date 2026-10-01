import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import {
  supabase,
  isSupabaseConfigured,
  fetchUserProfile,
  updateSupabaseCredentials,
  clearStoredSupabaseCredentials,
} from '../lib/supabase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  isConfigured: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  clearError: () => void;
  refreshProfile: () => Promise<void>;
  updateConfig: (url: string, anonKey: string) => boolean;
  resetConfig: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);
  const [isConfigured, setIsConfigured] = useState<boolean>(isSupabaseConfigured());
  const [error, setError] = useState<string | null>(null);

  // Load user profile from public.profiles using the authenticated user id
  const loadProfile = useCallback(async (authUser: User) => {
    setIsProfileLoading(true);
    try {
      const userProfile = await fetchUserProfile(authUser.id, authUser.email);
      setProfile(userProfile);
    } catch (err) {
      console.error('Failed to load profile from public.profiles:', err);
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  // Restore session on mount and handle auth state transitions
  useEffect(() => {
    let isMounted = true;
    const configured = isSupabaseConfigured();
    setIsConfigured(configured);

    if (!configured) {
      setIsLoading(false);
      return;
    }

    // 1. Restore existing login session on page refresh
    supabase.auth
      .getSession()
      .then(async ({ data: { session: initialSession }, error: sessionError }) => {
        if (!isMounted) return;

        if (sessionError) {
          console.warn('Session restoration error:', sessionError.message);
          setIsLoading(false);
          return;
        }

        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          await loadProfile(initialSession.user);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }

        if (isMounted) {
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching initial session:', err);
        if (isMounted) setIsLoading(false);
      });

    // 2. Real-time auth subscription for token refresh, login, logout
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (currentSession?.user) {
          await loadProfile(currentSession.user);
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setSession(null);
        setUser(null);
      }

      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const clearError = () => setError(null);

  // Authenticate using supabase.auth.signInWithPassword()
  const signIn = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);

    if (!isSupabaseConfigured()) {
      const msg = 'Supabase credentials are not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
      setError(msg);
      return { success: false, error: msg };
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        let friendlyMessage = authError.message;
        if (
          authError.message.toLowerCase().includes('invalid login credentials') ||
          authError.message.toLowerCase().includes('invalid credentials')
        ) {
          friendlyMessage = 'Invalid email or password. Please verify your credentials with Nowshera Shopping Mall administration.';
        } else if (authError.message.toLowerCase().includes('email not confirmed')) {
          friendlyMessage = 'Email address is not confirmed. Please check your email or contact the administrator.';
        }
        setError(friendlyMessage);
        return { success: false, error: friendlyMessage };
      }

      if (data?.user && data?.session) {
        setSession(data.session);
        setUser(data.user);
        // Step 4: Fetch user's profile from public.profiles using the authenticated user id
        await loadProfile(data.user);
        return { success: true };
      }

      return { success: false, error: 'Authentication returned no user record.' };
    } catch (err: any) {
      const message = err?.message || 'An unexpected error occurred during sign in.';
      setError(message);
      return { success: false, error: message };
    }
  };

  // Logout using supabase.auth.signOut()
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during signOut:', err);
    } finally {
      setUser(null);
      setProfile(null);
      setSession(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user);
    }
  };

  const updateConfig = (url: string, anonKey: string): boolean => {
    const success = updateSupabaseCredentials(url, anonKey);
    if (success) {
      setIsConfigured(true);
      setError(null);
      setIsLoading(true);
      supabase.auth.getSession().then(async ({ data: { session: newSession } }) => {
        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          await loadProfile(newSession.user);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
        setIsLoading(false);
      });
    }
    return success;
  };

  const resetConfig = () => {
    clearStoredSupabaseCredentials();
    setIsConfigured(false);
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isProfileLoading,
        isConfigured,
        error,
        signIn,
        signOut,
        clearError,
        refreshProfile,
        updateConfig,
        resetConfig,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
