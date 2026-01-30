"use client";

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Users,
  FileText,
  BarChart3,
  GraduationCap,
  Menu,
  X,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/admin/dashboard', icon: BarChart3, label: 'Dashboard', exact: true },
  { path: '/admin/users', icon: Users, label: 'Users' },
  { path: '/admin/tests', icon: FileText, label: 'Tests' },
  { path: '/admin/lessons', icon: GraduationCap, label: 'Lessons' },
  { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string, exact = false) => {
    if (exact) return pathname === path;
    return pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-border">
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-sidebar-primary-foreground" />
              </div>
              <span className="font-bold text-sidebar-foreground">LearnQuest</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-sidebar-foreground/70 hover:text-sidebar-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "sidebar-item",
                  isActive(item.path, item.exact) && "active"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
                {isActive(item.path, item.exact) && (
                  <ChevronRight className="w-4 h-4 ml-auto" />
                )}
              </Link>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 mb-4">
              <Image
                width={40}
                height={40}
                src={user?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'}
                alt={user?.name || "Admin Avatar"}
                className="w-10 h-10 rounded-full bg-sidebar-accent"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.name || 'Admin'}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {user?.email || 'admin@example.com'}
                </p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden h-16 flex items-center justify-between px-4 border-b border-border bg-background">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-foreground hover:bg-muted rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold">LearnQuest Admin</span>
          <div className="w-9" /> {/* Spacer */}
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
