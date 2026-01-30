"use client";

import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Trophy,
  Clock,
  Lightbulb,
  Star,
  Home,
  RotateCcw,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAttemptResult } from '@/features/quiz-player';
import { QuestionAttempt } from '@/types';

export default function TestResultsPage() {
  const params = useParams();
  const attemptId = params.attemptId as string;
  const router = useRouter();

  const { data: result, isLoading } = useAttemptResult(attemptId);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStarCount = (score: number) => Math.min(5, Math.floor(score / 20) + 1);

  const getMessage = (score: number) => {
    if (score >= 90) return { text: "Amazing! You're a superstar!", emoji: "🏆" };
    if (score >= 70) return { text: "Great job! Keep it up!", emoji: "🎉" };
    if (score >= 50) return { text: "Good effort! Practice makes perfect!", emoji: "👍" };
    return { text: "Keep trying! You'll get better!", emoji: "🌈" };
  };

  if (isLoading) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto my-12" />
        <p>Calculating your results...</p>
      </div>
    );
  }

  if (!result) {
    return <div className="text-center">Could not find test results.</div>;
  }

  const { attempt, questionResults, test } = result;
  const score = attempt.score || 0;
  const stars = getStarCount(score);
  const message = getMessage(score);

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="text-8xl mb-4"
        >
          {message.emoji}
        </motion.div>
        <h1 className="text-kid-2xl font-bold mb-2">{message.text}</h1>
        <p className="text-muted-foreground text-lg">{test?.title || 'Test'}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="card-kid text-center mb-8"
      >
        <div className="mb-6">
          <p className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-kid-purple via-kid-pink to-kid-orange bg-clip-text text-transparent">
            {score}%
          </p>
        </div>
        <div className="flex justify-center gap-2 mb-6">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            >
              <Star
                className={`w-10 h-10 ${i < stars
                    ? 'text-kid-yellow fill-kid-yellow'
                    : 'text-muted'
                  }`}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-3 gap-4 mb-8"
      >
        <div className="card-kid text-center">
          <Trophy className="w-8 h-8 text-kid-green mx-auto mb-2" />
          <p className="text-2xl font-bold">{questionResults.filter((r: QuestionAttempt) => r.isCorrect).length}/{questionResults.length}</p>
          <p className="text-sm text-muted-foreground">Correct</p>
        </div>
        <div className="card-kid text-center">
          <Clock className="w-8 h-8 text-kid-blue mx-auto mb-2" />
          <p className="text-2xl font-bold">{formatTime(attempt.timeTakenSeconds || 0)}</p>
          <p className="text-sm text-muted-foreground">Time</p>
        </div>
        <div className="card-kid text-center">
          <Lightbulb className="w-8 h-8 text-kid-yellow mx-auto mb-2" />
          <p className="text-2xl font-bold">
            {questionResults.reduce((sum: number, r: QuestionAttempt) => sum + (r.hintsUsed || 0), 0)}
          </p>
          <p className="text-sm text-muted-foreground">Hints</p>
        </div>
      </motion.div>

      {questionResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-8"
        >
          <h3 className="text-xl font-bold mb-4">Question Breakdown</h3>
          <div className="space-y-3">
            {questionResults.map((result: QuestionAttempt, index: number) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-xl ${result.isCorrect ? 'bg-success/10' : 'bg-destructive/10'
                  }`}
              >
                <div className="flex items-center gap-3">
                  {result.isCorrect ? (
                    <CheckCircle2 className="w-6 h-6 text-success" />
                  ) : (
                    <XCircle className="w-6 h-6 text-destructive" />
                  )}
                  <span className="font-medium">Question {index + 1}</span>
                </div>
                {result.hintsUsed > 0 && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Lightbulb className="w-4 h-4" />
                    {result.hintsUsed} hints
                  </span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <Button
          onClick={() => router.push('/student/dashboard')}
          className="flex-1 py-6 text-lg"
        >
          <Home className="w-5 h-5 mr-2" />
          Go Home
        </Button>
        <Button
          onClick={() => router.push('/student/tests')}
          variant="outline"
          className="flex-1 py-6 text-lg"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          More Tests
        </Button>
      </motion.div>
    </div>
  );
}