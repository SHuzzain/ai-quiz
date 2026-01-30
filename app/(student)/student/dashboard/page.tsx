"use client";

import { motion } from 'framer-motion';
import {
  BookOpen,
  Star,
  Trophy,
  Clock,
  ArrowRight,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/features/auth';
import { useUpcomingTests, useStudentAttempts } from '@/features/quiz-player';
import { Button } from '@/components/ui/button';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data: upcomingTests } = useUpcomingTests(user?.id || '');
  const { data: attempts } = useStudentAttempts(user?.id || '');

  const completedTests = attempts?.filter(a => a.status === 'completed').length || 0;
  const totalStars = 125; // Mock data

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-kid-xl mb-2">
          Hi, {user?.name?.split(' ')[0] || 'Friend'}! 👋
        </h1>
        <p className="text-kid-base text-muted-foreground">
          Ready for some fun learning today?
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="card-kid text-center"
        >
          <div className="w-12 h-12 rounded-full bg-kid-yellow/20 flex items-center justify-center mx-auto mb-3">
            <Star className="w-6 h-6 text-kid-yellow fill-kid-yellow" />
          </div>
          <p className="text-2xl font-bold text-kid-yellow">{totalStars}</p>
          <p className="text-sm text-muted-foreground">Stars Earned</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="card-kid text-center"
        >
          <div className="w-12 h-12 rounded-full bg-kid-green/20 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6 text-kid-green" />
          </div>
          <p className="text-2xl font-bold text-kid-green">{completedTests}</p>
          <p className="text-sm text-muted-foreground">Tests Done</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="card-kid text-center"
        >
          <div className="w-12 h-12 rounded-full bg-kid-purple/20 flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-6 h-6 text-kid-purple" />
          </div>
          <p className="text-2xl font-bold text-kid-purple">85%</p>
          <p className="text-sm text-muted-foreground">Avg Score</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="card-kid text-center"
        >
          <div className="w-12 h-12 rounded-full bg-kid-blue/20 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-kid-blue" />
          </div>
          <p className="text-2xl font-bold text-kid-blue">3</p>
          <p className="text-sm text-muted-foreground">Day Streak</p>
        </motion.div>
      </div>

      {/* Upcoming Tests */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-kid-lg">Ready to Play? 🎮</h2>
          <Link href="/student/tests" className="text-primary hover:underline text-sm font-medium">
            See all tests
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {upcomingTests?.slice(0, 2).map((test, index) => (
            <motion.div
              key={test.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="card-kid group hover:scale-[1.02] transition-transform"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-kid-purple to-kid-pink flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold truncate">{test.title}</h3>
                  <p className="text-muted-foreground text-sm mb-3">{test.description}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {test.questionCount} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {test.duration} min
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <Link href={`/student/test/${test.id}`}>
                  <Button className="w-full btn-kid !py-4 group-hover:scale-[1.02]">
                    Start Test
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {(!upcomingTests || upcomingTests.length === 0) && (
          <div className="text-center py-12 bg-muted/30 rounded-3xl">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No tests right now!</h3>
            <p className="text-muted-foreground">Check back later for new quizzes.</p>
          </div>
        )}
      </motion.div>

      {/* Recent Results */}
      {attempts && attempts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-kid-lg">Recent Results 🏆</h2>
            <Link href="/student/results" className="text-primary hover:underline text-sm font-medium">
              See all
            </Link>
          </div>

          <div className="space-y-3">
            {attempts.slice(0, 3).map((attempt) => (
              <div
                key={attempt.id}
                className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${(attempt.score || 0) >= 80
                      ? 'bg-success/20'
                      : (attempt.score || 0) >= 60
                        ? 'bg-warning/20'
                        : 'bg-destructive/20'
                    }`}>
                    <Trophy className={`w-6 h-6 ${(attempt.score || 0) >= 80
                        ? 'text-success'
                        : (attempt.score || 0) >= 60
                          ? 'text-warning'
                          : 'text-destructive'
                      }`} />
                  </div>
                  <div>
                    <p className="font-semibold">Number Adventure</p>
                    <p className="text-sm text-muted-foreground">
                      {attempt.correctAnswers}/{attempt.totalQuestions} correct • {attempt.hintsUsed} hints used
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{attempt.score}%</p>
                  <div className="flex items-center gap-1">
                    {[...Array(Math.floor((attempt.score || 0) / 20))].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-kid-yellow fill-kid-yellow" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
