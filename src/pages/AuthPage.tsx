/**
 * Authentication Page
 * Login and Sign Up for both admin and student roles
 */

import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Mail, Lock, User, Sparkles, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const { login, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signUp(email, password, name, role);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      if (message.includes('check your email')) {
        setSuccess(message);
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/50 flex">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{ background: 'var(--gradient-kid)' }}
        />
        <div className="absolute inset-0 bg-black/20" />
        
        {/* Floating shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-20 h-20 bg-white/10 rounded-full animate-float" />
          <div className="absolute top-40 right-32 w-16 h-16 bg-white/10 rounded-full animate-float-delayed" />
          <div className="absolute bottom-32 left-32 w-24 h-24 bg-white/10 rounded-full animate-float" />
          <div className="absolute bottom-20 right-20 w-14 h-14 bg-white/10 rounded-full animate-float-delayed" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold">LearnQuest</span>
          </div>
          
          <h1 className="text-4xl font-bold mb-4">
            {mode === 'login' ? 'Welcome Back!' : 'Join the Adventure!'}
          </h1>
          <p className="text-white/80 text-lg max-w-md">
            {mode === 'login' 
              ? 'Continue your learning journey with fun quizzes and smart hints.'
              : 'Create an account and start learning with AI-powered quizzes.'}
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Back link */}
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-kid)' }}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">LearnQuest</span>
          </div>

          <h2 className="text-2xl font-bold mb-2">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <p className="text-muted-foreground mb-8">
            {mode === 'login' 
              ? 'Enter your credentials to access your account' 
              : 'Fill in your details to get started'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 text-sm">
                {success}
              </div>
            )}

            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Role selection */}
                <div className="space-y-2">
                  <Label>I am a...</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all",
                        role === 'student' 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className="text-2xl mb-1 block">🎓</span>
                      <span className="font-medium">Student</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all",
                        role === 'admin' 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className="text-2xl mb-1 block">👩‍🏫</span>
                      <span className="font-medium">Teacher/Admin</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full py-6 text-lg rounded-xl"
              disabled={isLoading}
            >
              {isLoading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <p className="text-center mt-6 text-muted-foreground">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setSuccess(null); }}
              className="text-primary font-medium hover:underline"
            >
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
