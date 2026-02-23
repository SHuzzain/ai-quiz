/**
 * Test Taking Page - Interactive test flow for students
 * Shows one question at a time with hints and micro-learning
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Lightbulb,
  BookOpen,
  X,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileText,
  Volume2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTestWithQuestions, useStartAttempt, useSubmitAnswer, useHint, useAttemptDetails, useLesson, useCompleteAttempt, useTrackStudyMaterialDownload, useMicroLearning } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Question, TestAttempt } from '@/types';

export function TestTakingPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: testData, isLoading } = useTestWithQuestions(testId || '');
  const startAttempt = useStartAttempt();
  const submitAnswer = useSubmitAnswer();
  const getHint = useHint();
  const getMicroLearning = useMicroLearning();
  const completeAttempt = useCompleteAttempt();
  const { data: lesson } = useLesson(testData?.lessonId || '');
  const trackDownload = useTrackStudyMaterialDownload();

  const [attempt, setAttempt] = useState<TestAttempt | null>(null);

  // Fetch attempt details to resume progress if an attempt exists
  const { data: attemptDetails } = useAttemptDetails(attempt?.id || '');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [hintsUsed, setHintsUsed] = useState<string[]>([]);
  const [showWrongModal, setShowWrongModal] = useState(false);
  const [showMicroLearning, setShowMicroLearning] = useState(false);
  const [microLearningContent, setMicroLearningContent] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [microLearningViewed, setMicroLearningViewed] = useState(false); // Track if viewed for current question
  const [results, setResults] = useState<{ questionId: string; correct: boolean; hintsUsed: number }[]>([]);
  const [testStartTime] = useState(Date.now()); // Total test time
  const [questionStartTime, setQuestionStartTime] = useState(Date.now()); // Current question time

  const questions = testData?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const totalHintsAvailable = 3;

  // Start attempt when component mounts
  useEffect(() => {
    if (testId && user?.id && !attempt) {
      startAttempt.mutateAsync({ testId, studentId: user.id })
        .then(setAttempt)
        .catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, user?.id, attempt]);

  // Hydrate state from existing attempt details (Resume functionality)
  useEffect(() => {
    if (attemptDetails?.questionResults && attemptDetails.questionResults.length > 0 && results.length === 0) {
      const previousResults = attemptDetails.questionResults.map(qr => ({
        questionId: qr.questionId,
        correct: qr.isCorrect,
        hintsUsed: qr.hintsUsed
      }));
      setResults(previousResults);

      // Resume from next question
      const nextIndex = previousResults.length;
      if (nextIndex < questions.length) {
        setCurrentQuestionIndex(nextIndex);
        setQuestionStartTime(Date.now()); // Reset for resumed question
      }
    }
  }, [attemptDetails, questions.length, results.length]);

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !attempt) return;

    const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);
    // current attemptCount is 0-based for specific wrong tries before this submit? 
    // actually attemptCount starts at 0. If it's the first try, it's 1 attempt total.
    const currentAttemptNumber = attemptCount + 1;

    const result = await submitAnswer.mutateAsync({
      attemptId: attempt.id,
      questionId: currentQuestion.id,
      answer: answer.trim(),
      hintsUsed: hintsUsed.length,
      viewedMicroLearning: microLearningViewed,
      timeTaken: timeTaken,
      attemptsCount: currentAttemptNumber,
    });

    if (result.isCorrect) {
      setIsCorrect(true);
      setResults(prev => [...prev, {
        questionId: currentQuestion.id,
        correct: true,
        hintsUsed: hintsUsed.length
      }]);

      // Move to next question after delay
      setTimeout(() => {
        // Pass true to indicate the current question was answered correctly
        goToNextQuestion(true);
      }, 2000);
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
      studentAnswer: answer
    });

    setHintsUsed(prev => [...prev, hint]);
    setShowWrongModal(false);
  };

  const handleMicroLearning = async () => {
    if (!currentQuestion) return;

    const content = await getMicroLearning.mutateAsync({
      questionId: currentQuestion.id,
      attemptId: attempt?.id
    });
    setMicroLearningContent(content);
    setShowWrongModal(false);
    setShowMicroLearning(true);
    setMicroLearningViewed(true); // Mark as viewed
  };

  const handleAskAI = async () => {
    if (!currentQuestion || !aiQuestion.trim()) return;
    setAiLoading(true);
    try {
      const content = await getMicroLearning.mutateAsync({
        questionId: currentQuestion.id,
        attemptId: attempt?.id,
        studentQuestion: aiQuestion.trim()
      });
      // Replace the current content with the new tailored explanation
      setMicroLearningContent(content);
      setAiQuestion('');
    } finally {
      setAiLoading(false);
    }
  };

  const handleFileDownload = (fileUrl: string) => {
    if (attempt && currentQuestion) {
      trackDownload.mutate({
        attemptId: attempt.id,
        questionId: currentQuestion.id
      });
    }
    window.open(fileUrl, '_blank');
  };

  const goToNextQuestion = (currentResultIsCorrect?: boolean) => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setAnswer('');
      setAiQuestion('');
      setHintsUsed([]);
      setIsCorrect(null);
      setAttemptCount(0);
      setShowMicroLearning(false);
      setMicroLearningContent('');
      setMicroLearningViewed(false); // Reset for next question
      setQuestionStartTime(Date.now()); // Reset timer
    } else {
      // Test complete - navigate to results
      const totalTimeTaken = Math.floor((Date.now() - testStartTime) / 1000);

      // Fix: Use explicit argument if provided, as state might be stale in closure
      const finalIsCorrect = currentResultIsCorrect ?? (isCorrect === true);
      const correctCount = results.filter(r => r.correct).length + (finalIsCorrect ? 1 : 0);

      const score = Math.round((correctCount / questions.length) * 100);

      // Complete the attempt in backend
      completeAttempt.mutateAsync({
        attemptId: attempt?.id || '',
        metrics: {
          score,
          timeTakenSeconds: totalTimeTaken,
          correctAnswers: correctCount,
          totalQuestions: questions.length,
          hintsUsed: hintsUsed.length // This might need accumulation from all questions if not handled elsewhere
        }
      }).then(() => {
        navigate(`/student/results/${attempt?.id}`, {
          state: {
            score,
            timeTaken: totalTimeTaken,
            results,
            testTitle: testData?.title
          }
        });
      });
    }
  };

  const tryAgain = () => {
    setShowWrongModal(false);
    setAnswer('');
    setIsCorrect(null);
  };

  // Parse question to highlight blank
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

  // Text-to-Speech Helper
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any current speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; // Slightly slower for kids
      utterance.pitch = 1.1; // Slightly higher/friendly pitch

      // Try to find a good voice (Google US English or similar)
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes('Google US English')) || voices[0];
      if (preferredVoice) utterance.voice = preferredVoice;

      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/50 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-3xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">{testData.title}</h1>
          <Button variant="ghost" onClick={() => navigate('/student')}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Progress bar */}
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

      {/* Question Card */}
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

          {/* Answer Input */}
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

          {/* Hints Display */}
          {hintsUsed.length > 0 && (
            <div className="mb-6 space-y-3">
              {hintsUsed.map((hint, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-hint group relative pr-12"
                >
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-kid-yellow mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-kid-purple">Hint {index + 1}</p>
                      <p className="text-foreground">{hint}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => speakText(hint)}
                    className="absolute right-2 top-2 rounded-full hover:bg-kid-purple/10 text-kid-purple opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Read Aloud"
                  >
                    <Volume2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          )}

          {/* Micro Learning Display */}
          {showMicroLearning && microLearningContent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-6 bg-kid-blue/10 rounded-2xl border-2 border-kid-blue/30 relative group"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => speakText(microLearningContent)}
                className="absolute right-4 top-4 rounded-full hover:bg-kid-blue/20 text-kid-blue opacity-0 group-hover:opacity-100 transition-opacity z-10"
                title="Read Aloud"
              >
                <Volume2 className="w-5 h-5" />
              </Button>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-kid-blue/20 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-kid-blue" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-kid-blue text-lg mb-2">Let's Learn! 📚</p>
                  <p className="text-foreground leading-relaxed text-lg mb-4">{microLearningContent}</p>



                  {/* Lesson Files Display */}
                  {lesson?.files && lesson.files.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-kid-blue/20">
                      <p className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Study Material:
                      </p>
                      <div className="grid gap-2">
                        {lesson.files.map((file, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleFileDownload(file.url)}
                            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-border hover:border-kid-blue transitions-all group cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-500">
                              <FileText className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium group-hover:text-kid-blue truncate">
                              {file.name}
                            </span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Assist Follow-up */}
                  <div className="mt-6 pt-4 border-t border-kid-blue/20">
                    <label className="text-sm font-semibold text-kid-blue flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4" /> AI Assistant (Ask any thing related to this question)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={aiQuestion}
                        onChange={(e) => setAiQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                        placeholder="e.g., Can you explain the steps to solve this?"
                        className="input-kid text-base py-3 flex-1"
                        disabled={aiLoading}
                      />
                      <Button
                        onClick={handleAskAI}
                        disabled={!aiQuestion.trim() || aiLoading}
                        className="py-6 px-8 bg-blue-400 hover:bg-blue-500 text-white rounded-xl text-base font-semibold"
                      >
                        {aiLoading ? "Thinking..." : "Ask"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmitAnswer}
            disabled={!answer.trim() || isCorrect === true || submitAnswer.isPending}
            className="btn-kid w-full"
          >
            {submitAnswer.isPending ? (
              'Checking...'
            ) : isCorrect === true ? (
              <>
                <CheckCircle2 className="w-6 h-6 mr-2" />
                Correct! 🎉
              </>
            ) : (
              <>
                Check My Answer
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Wrong Answer Modal */}
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
                  Don't worry, you can try again!
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

      {/* Success Animation Modal */}
      <AnimatePresence>
        {isCorrect === true && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotate: -5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotate: 5 }}
              transition={{ type: "spring", damping: 12, stiffness: 100 }}
              className="relative bg-white rounded-[2rem] p-12 max-w-md w-full shadow-2xl text-center overflow-hidden"
            >
              {/* Decorative spinning background blobs for kids */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -top-20 -right-20 w-40 h-40 bg-green-50 rounded-full blur-2xl"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-20 -left-20 w-40 h-40 bg-emerald-50 rounded-full blur-2xl"
              />

              <motion.div
                initial={{ scale: 0, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", bounce: 0.6, duration: 0.8, delay: 0.1 }}
                className="relative w-32 h-32 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-8 shadow-inner z-10"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <CheckCircle2 className="w-16 h-16 text-emerald-500" strokeWidth={3} />
                </motion.div>
                {/* Small popping dots */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0] }}
                  transition={{ duration: 1.2, delay: 0.3 }}
                  className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-yellow-400"
                />
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0] }}
                  transition={{ duration: 1.2, delay: 0.5 }}
                  className="absolute top-4 -left-4 w-3 h-3 rounded-full bg-emerald-400"
                />
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0] }}
                  transition={{ duration: 1.2, delay: 0.4 }}
                  className="absolute bottom-2 -right-4 w-5 h-5 rounded-full bg-blue-400"
                />
              </motion.div>

              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="relative text-4xl font-extrabold mb-4 text-emerald-500 tracking-tight z-10"
              >
                Awesome!
              </motion.h3>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="relative text-slate-500 text-xl font-medium z-10"
              >
                You got it right! Get ready for the next one...
              </motion.p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
