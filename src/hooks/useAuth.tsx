/**
 * Authentication Context
 * Uses Supabase Auth with profiles and user_roles tables
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthState, UserRole } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUserProfile(userId: string): Promise<User | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!profile) return null;

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  return {
    id: userId,
    email: profile.email,
    name: profile.name,
    role: (roleData?.role as UserRole) || 'student',
    avatarUrl: profile.avatar_url ?? undefined,
    createdAt: new Date(profile.created_at),
    lastActiveAt: new Date(profile.last_active_at),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Listen first, then check session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Use setTimeout to avoid potential deadlocks with Supabase client
          setTimeout(async () => {
            const profile = await fetchUserProfile(session.user.id);
            setUser(profile);
            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        setUser(profile);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    const profile = await fetchUserProfile(data.user.id);
    setUser(profile);

    if (profile?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/student');
    }
  };

  const signUp = async (email: string, password: string, name: string, role: UserRole) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name, role },
      },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Sign up failed');

    // If email confirmation required, user won't have a session yet
    if (!data.session) {
      throw new Error('Please check your email to confirm your account before signing in.');
    }

    const profile = await fetchUserProfile(data.user.id);
    setUser(profile);

    if (profile?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/student');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    queryClient.clear();
    navigate('/');
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signUp,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
