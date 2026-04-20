/**
 * Authentication – JWT + REST API (replaces Supabase Auth)
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthState, UserRole } from '@/types';
import { getStoredToken, setStoredToken } from '@/lib/api-client';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  updateProfile: (data: { name?: string; avatarUrl?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUserProfile(): Promise<User | null> {
  const { getCurrentUser } = await import('@/services/api');
  return getCurrentUser();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    fetchUserProfile()
      .then((u) => setUser(u))
      .catch(() => {
        setStoredToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { loginUser } = await import('@/services/api');
    const u = await loginUser({ email, password });
    setUser(u);
    if (u.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/student');
    }
  };

  const signUp = async (email: string, password: string, name: string, role: UserRole) => {
    const { signUpUser } = await import('@/services/api');
    const u = await signUpUser({ email, password, name, role });
    setUser(u);
    if (u.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/student');
    }
  };

  const updateProfile = async (data: { name?: string; avatarUrl?: string }) => {
    if (!user) return;
    setUser((prev) => (prev ? { ...prev, ...data } : null));
    try {
      const { updateUser } = await import('@/services/api');
      const updatedUser = await updateUser(user.id, data);
      setUser(updatedUser);
    } catch (error) {
      const profile = await fetchUserProfile();
      setUser(profile);
      throw error;
    }
  };

  const logout = async () => {
    const { logoutUser } = await import('@/services/api');
    await logoutUser();
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
    updateProfile,
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
