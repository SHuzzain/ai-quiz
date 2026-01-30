import React, { createContext, useContext, ReactNode } from 'react';
import { useUser, useClerk, useSignIn, useSignUp as useClerkSignUp } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { User, UserRole } from '@/types';
import { syncUserWithBackend } from '../services/backend-sync.service';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, name: string, role: 'admin' | 'student') => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { user: clerkUser, isLoaded, isSignedIn } = useUser();
    const { signOut } = useClerk();
    const { signIn, isLoaded: signInLoaded } = useSignIn();
    const { signUp: clerkSignUp, isLoaded: signUpLoaded } = useClerkSignUp();
    const router = useRouter();

    // Map Clerk user to app User type
    const user: User | null = clerkUser ? {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        name: clerkUser.fullName || '',
        role: (clerkUser.publicMetadata?.role as UserRole) || 'student',
        avatarUrl: clerkUser.imageUrl,
        createdAt: clerkUser.createdAt ? new Date(clerkUser.createdAt) : new Date(),
        lastActiveAt: clerkUser.updatedAt ? new Date(clerkUser.updatedAt) : new Date(),
    } : null;

    const login = async (email: string, password: string) => {
        if (!signInLoaded) return;

        await signIn.create({
            identifier: email,
            password,
        });

        // If login is successful, Clerk will handle the session
        // Redirect will happen via the middleware or in the component
    };

    const signUp = async (email: string, password: string, name: string, role: 'admin' | 'student') => {
        if (!signUpLoaded) return;

        const result = await clerkSignUp.create({
            emailAddress: email,
            password,
            firstName: name.split(' ')[0],
            lastName: name.split(' ').slice(1).join(' '),
        });

        if (result.status === 'complete') {
            // Sync with backend on signup completion
            await syncUserWithBackend(result.createdUserId!, email, name, role);

            router.push(role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
        }
    };

    const logout = async () => {
        await signOut();
        router.push('/');
    };

    const value: AuthContextType = {
        user,
        isAuthenticated: !!isSignedIn,
        isLoading: !isLoaded,
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
