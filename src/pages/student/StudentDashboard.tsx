/**
 * Student Dashboard - Main page for students
 */

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
import { Link } from 'react-router-dom';
import { StudentLayout } from '@/components/layout';
import { useAuth } from '@/hooks/useAuth';
import { useUpcomingTests, useStudentAttempts } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';

export function StudentDashboard() {
  const { user } = useAuth();
  const { data: upcomingTests } = useUpcomingTests(user?.id || '');
  const { data: attempts } = useStudentAttempts(user?.id || '');

  // Calculate stats from real data
  const completedAttempts = attempts?.filter(a => a.status === 'completed') || [];
  const completedTests = completedAttempts.length;

  const totalStars = completedAttempts.reduce((acc, attempt) => {
    const score = attempt.score || 0;
    const stars = Math.min(5, Math.floor(score / 20) + 1);
    return acc + stars;
  }, 0);

  const avgScore = completedTests > 0
    ? Math.round(completedAttempts.reduce((acc, a) => acc + (a.score || 0), 0) / completedTests)
    : 0;

  // Calculate streak (consecutive days with at least one completed test)
  const calculateStreak = () => {
    if (!completedAttempts.length) return 0;

    const dates = completedAttempts
      .map(a => a.completedAt ? new Date(a.completedAt).toDateString() : null)
      .filter(Boolean) as string[];

    // Unique dates sorted descending
    const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (uniqueDates.length === 0) return 0;

    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    // Check if streak is active (activity today or yesterday)
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

    let streak = 1;
    let currentDate = new Date(uniqueDates[0]);

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i]);
      const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        streak++;
        currentDate = prevDate;
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak();

  return (
    <StudentLayout>
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
            <p className="text-2xl font-bold text-kid-purple">{avgScore}%</p>
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
            <p className="text-2xl font-bold text-kid-blue">{streak}</p>
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
            <Link to="/student/tests" className="text-primary hover:underline text-sm font-medium">
              See all tests
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {upcomingTests?.map((test, index) => {
              const inProgressAttempt = attempts?.find(
                (a) => a.testId === test.id && a.status === 'in_progress'
              );

              return (
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
                    <Link to={`/student/test/${test.id}`}>
                      <Button
                        className={`w-full btn-kid !py-4 group-hover:scale-[1.02] ${inProgressAttempt ? 'bg-kid-orange hover:bg-kid-orange/90' : ''
                          }`}
                      >
                        {inProgressAttempt ? (
                          <>
                            Continue Test
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </>
                        ) : (
                          <>
                            Start Test
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </>
                        )}
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
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
              <Link to="/student/results" className="text-primary hover:underline text-sm font-medium">
                See all
              </Link>
            </div>

            <div className="space-y-3">
              {attempts?.map((attempt) => (
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
    </StudentLayout>
  );
}
