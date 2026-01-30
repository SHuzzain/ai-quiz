/**
 * Student Dashboard Layout
 * Fun, colorful, kid-friendly design
 */

import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Home,
  Trophy,
  Star,
  Menu,
  X,
  LogOut,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface StudentLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/student', icon: Home, label: 'My Dashboard', exact: true },
  { path: '/student/tests', icon: BookOpen, label: 'My Tests' },
  { path: '/student/results', icon: Trophy, label: 'My Results' },
];

export function StudentLayout({ children }: StudentLayoutProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string, exact = false) => {
    if (exact) return pathname === path;
    return pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/50">
      {/* Fun decorative elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-20 h-20 bg-kid-purple/10 rounded-full animate-float" />
        <div className="absolute top-40 right-20 w-16 h-16 bg-kid-pink/10 rounded-full animate-float-delayed" />
        <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-kid-blue/10 rounded-full animate-float" />
        <div className="absolute bottom-40 right-1/3 w-12 h-12 bg-kid-yellow/10 rounded-full animate-float-delayed" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="h-16 flex items-center justify-between">
            {/* Logo */}
            <Link href="/student" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--gradient-kid)' }}>
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-kid-purple to-kid-pink bg-clip-text text-transparent">
                LearnQuest
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all",
                    isActive(item.path, item.exact)
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* User & Mobile Menu */}
            <div className="flex items-center gap-3">
              {/* Stars/Points display */}
              <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-kid-yellow/20 rounded-full">
                <Star className="w-4 h-4 text-kid-yellow fill-kid-yellow" />
                <span className="font-bold text-kid-yellow">125</span>
              </div>

              {/* User avatar */}
              <div className="flex items-center gap-2">
                <img
                  src={user?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=student'}
                  alt={user?.name}
                  className="w-10 h-10 rounded-full ring-2 ring-kid-purple/30"
                />
                <span className="hidden sm:block font-medium text-foreground">
                  {user?.name?.split(' ')[0] || 'Student'}
                </span>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2 hover:bg-muted rounded-xl"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-border bg-background"
          >
            <nav className="container mx-auto px-4 py-4 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all",
                    isActive(item.path, item.exact)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              ))}
              <button
                onClick={() => logout()}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 relative z-10">
        {children}
      </main>
    </div>
  );
}
