/**
 * Public Layout - Landing page wrapper
 */

import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Sparkles } from 'lucide-react';

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <nav className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="https://mindchamps-prod-wp.s3.ap-southeast-1.amazonaws.com/wp-content/uploads/2020/02/04104625/logo-color.png"
              alt="LearnQuest"
              className="h-10 w-auto"
            />
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/auth"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/auth?mode=signup"
              className="btn-hero !py-2 !px-5 !text-sm !rounded-xl"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Get Started
              </span>
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="pt-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img
                src="https://mindchamps-prod-wp.s3.ap-southeast-1.amazonaws.com/wp-content/uploads/2020/02/04104625/logo-color.png"
                alt="LearnQuest"
                className="h-8 w-auto grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all"
              />
            </div>

            <p className="text-muted-foreground text-sm">
              © 2024 LearnQuest. Making learning fun for everyone.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
