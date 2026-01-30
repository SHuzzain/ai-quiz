"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Lightbulb,
  BookOpen,
  X,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { useTestWithQuestions, useStartAttempt, useSubmitAnswer, useHint, useMicroLearning } from '@/features/quiz-player';
import { Button } from '@/components/ui/button';
import { TestAttempt } from '@/types';

export default function TestTakingPage() {
  const params = useParams();
  const testId = params.testId as string;
  const router = useRouter();
  const { user } = useAuth();

  const { data: testData, isLoading } = useTestWithQuestions(testId || '');
  const startAttempt = useStartAttempt();
  const submitAnswer = useSubmitAnswer();
  const getHint = useHint();
  const getMicroLearning = useMicroLearning();

  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [hintsUsed, setHintsUsed] = useState<string[]>([]);
  const [showWrongModal, setShowWrongModal] = useState(false);
  const [showMicroLearning, setShowMicroLearning] = useState(false);
  const [microLearningContent, setMicroLearningContent] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [results, setResults] = useState<{ questionId: string; correct: boolean; hintsUsed: number }[]>([]);
  const [startTime] = useState(() => Date.now());

  const questions = testData?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const totalHintsAvailable = 3;

  useEffect(() => {
    if (testId && user?.id && !attempt) {
      startAttempt.mutateAsync({ testId, studentId: user.id })
        .then(setAttempt)
        .catch(console.error);
    }
  }, [testId, user?.id, startAttempt, attempt]);

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !attempt) return;

    const result = await submitAnswer.mutateAsync({
      attemptId: attempt.id,
      questionId: currentQuestion.id,
      answer: answer.trim(),
    });

    if (result.isCorrect) {
      setIsCorrect(true);
      setResults(prev => [...prev, {
        questionId: currentQuestion.id,
        correct: true,
        hintsUsed: hintsUsed.length
      }]);

      setTimeout(() => {
        goToNextQuestion();
      }, 1500);
    } else {
      setAttemptCount(prev => prev + 1);
      setIsCorrect(false);
      setShowWrongModal(true);
    }
  };

  const handleGetHint = async () => {
    if (!currentQuestion || !attempt || hintsUsed.length >= totalHintsAvailable) return;

    const hint = await getHint.mutateAsync({
      attemptId: attempt.id,
      questionId: currentQuestion.id,
      hintIndex: hintsUsed.length,
    });

    setHintsUsed(prev => [...prev, hint]);
    setShowWrongModal(false);
  };

  const handleMicroLearning = async () => {
    if (!currentQuestion) return;

    const content = await getMicroLearning.mutateAsync(currentQuestion.id);
    setMicroLearningContent(content);
    setShowWrongModal(false);
    setShowMicroLearning(true);
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setAnswer('');
      setHintsUsed([]);
      setIsCorrect(null);
      setAttemptCount(0);
      setShowMicroLearning(false);
      setMicroLearningContent('');
    } else {
      router.push(`/student/results/${attempt?.id}`);
    }
  };

  const tryAgain = () => {
    setShowWrongModal(false);
    setAnswer('');
    setIsCorrect(null);
  };

  const renderQuestion = (text: string) => {
    const parts = text.split('__BLANK__');
    return (
      <span>
        {parts[0]}
        <span className="inline-block min-w-[100px] mx-2 border-b-4 border-dashed border-kid-purple text-kid-purple">
          {answer || '______'}
        </span>
        {parts[1]}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary/50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-xl font-medium">Loading your test...</p>
        </div>
      </div>
    );
  }

  if (!testData || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Test not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">{testData.title}</h1>
          <Button variant="ghost" onClick={() => router.push('/student/dashboard')}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="progress-kid">
          <div
            className="progress-kid-fill"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Question {currentQuestionIndex + 1} of {questions.length}
        </p>
      </div>

      <motion.div
        key={currentQuestion.id}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        className="max-w-3xl mx-auto"
      >
        <div className="question-card">
          <p className="text-kid-xl leading-relaxed mb-8">
            {renderQuestion(currentQuestion.questionText)}
          </p>

          <div className="mb-6">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitAnswer()}
              placeholder="Type your answer here..."
              className="input-kid"
              autoFocus
              disabled={isCorrect === true}
            />
          </div>

          {hintsUsed.length > 0 && (
            <div className="mb-6 space-y-3">
              {hintsUsed.map((hint, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-hint"
                >
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-kid-yellow mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-kid-purple">Hint {index + 1}</p>
                      <p className="text-foreground">{hint}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {showMicroLearning && microLearningContent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-6 bg-kid-blue/10 rounded-2xl border-2 border-kid-blue/30"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-kid-blue/20 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-kid-blue" />
                </div>
                <div>
                  <p className="font-semibold text-kid-blue mb-2">Let&apos;s Learn! 📚</p>
                  <p className="text-foreground leading-relaxed">{microLearningContent}</p>
                </div>
              </div>
            </motion.div>
          )}

          <Button
            onClick={handleSubmitAnswer}
            disabled={!answer.trim() || isCorrect === true || submitAnswer.isPending}
            className="btn-kid w-full"
          >
            {submitAnswer.isPending ? 'Checking...' : isCorrect === true ? (<> <CheckCircle2 className="w-6 h-6 mr-2" /> Correct! 🎉 </>) : (<> Check My Answer <ArrowRight className="w-5 h-5 ml-2" /> </>)}
          </Button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showWrongModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowWrongModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-card rounded-3xl p-8 max-w-md w-full shadow-2xl animate-shake"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Oops! Not quite right 🤔</h3>
                <p className="text-muted-foreground">
                  Don&apos;t worry, you can try again!
                </p>
              </div>

              <div className="space-y-3">
                <Button onClick={tryAgain} className="w-full py-6 text-lg" variant="outline">
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Try Again
                </Button>

                {hintsUsed.length < totalHintsAvailable && (
                  <Button
                    onClick={handleGetHint}
                    className="w-full py-6 text-lg bg-kid-yellow hover:bg-kid-yellow/90 text-white"
                    disabled={getHint.isPending}
                  >
                    <Lightbulb className="w-5 h-5 mr-2" />
                    Get a Hint ({totalHintsAvailable - hintsUsed.length} left)
                  </Button>
                )}

                {hintsUsed.length >= totalHintsAvailable && (
                  <Button
                    onClick={handleMicroLearning}
                    className="w-full py-6 text-lg bg-kid-blue hover:bg-kid-blue/90 text-white"
                    disabled={getMicroLearning.isPending}
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Show Me How It Works
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCorrect === true && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5 }}
              className="text-8xl"
            >
              🎉
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
