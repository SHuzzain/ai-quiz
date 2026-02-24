import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy,
  Clock,
  Lightbulb,
  Star,
  Home,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { StudentLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { useAttemptDetails } from '@/hooks/useApi';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface QuestionResult {
  questionId: string;
  correct: boolean;
  hintsUsed: number;
}

export function TestResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  // Try to get state from navigation (immediate), fallback to fetching
  const { data: attemptDetails, isLoading } = useAttemptDetails(attemptId || '');

  const attempt = attemptDetails?.attempt;

  // Determine values to display
  const score = attempt?.score ?? 0;
  const timeTaken = attempt?.timeTakenSeconds ?? 0;
  const testTitle = attemptDetails?.test.title ?? 'Test Result';

  // Results details are only in location state currently as per current API structure
  // (API doesn't return question-level results in getTestAttempt yet, strictly speaking)
  // But we can show summary stats at least.
  const results = attemptDetails?.questionResults.map(qr => ({
    questionId: qr.questionId,
    correct: qr.isCorrect,
    hintsUsed: qr.hintsUsed
  })) || [];
  const correctCount = results.length > 0 ? results.filter((r) => r.correct).length : attempt?.correctAnswers ?? 0;
  const totalQuestions = results.length > 0 ? results.length : attempt?.totalQuestions ?? 0;
  const hintsUsedCount = results.length > 0
    ? results.reduce((sum, r) => sum + (r.hintsUsed || 0), 0)
    : attempt?.hintsUsed ?? 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStarCount = (score: number) => Math.min(5, Math.floor(score / 20) + 1);
  const stars = getStarCount(score);

  const getMessage = (score: number) => {
    if (score >= 90) return { text: "Amazing! You're a superstar!", emoji: "🏆" };
    if (score >= 70) return { text: "Great job! Keep it up!", emoji: "🎉" };
    if (score >= 50) return { text: "Good effort! Practice makes perfect!", emoji: "👍" };
    return { text: "Keep trying! You'll get better!", emoji: "🌈" };
  };

  const message = getMessage(score);




  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex justify-center items-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto">
        {/* Celebration Header */}
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
          <p className="text-muted-foreground text-lg">{testTitle}</p>
        </motion.div>

        {/* Score Card */}
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
            {attempt?.totalMark ? (
              <p className="text-lg font-medium text-muted-foreground mt-2">
                {Math.round((score / 100) * attempt.totalMark)} / {attempt.totalMark} Marks
              </p>
            ) : null}
          </div>

          {/* Stars */}
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

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          <div className="card-kid text-center">
            <Trophy className="w-8 h-8 text-kid-green mx-auto mb-2" />
            <p className="text-2xl font-bold">{correctCount}/{totalQuestions}</p>
            <p className="text-sm text-muted-foreground">Correct</p>
          </div>
          <div className="card-kid text-center">
            <Clock className="w-8 h-8 text-kid-blue mx-auto mb-2" />
            <p className="text-2xl font-bold">{formatTime(timeTaken)}</p>
            <p className="text-sm text-muted-foreground">Time</p>
          </div>
          <div className="card-kid text-center">
            <Lightbulb className="w-8 h-8 text-kid-yellow mx-auto mb-2" />
            <p className="text-2xl font-bold">
              {hintsUsedCount}
            </p>
            <p className="text-sm text-muted-foreground">Hints</p>
          </div>
        </motion.div>

        {/* Question Results */}
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-8"
          >
            <h3 className="text-xl font-bold mb-4">Question Breakdown</h3>

            <Accordion type="multiple" className="space-y-4">
              {results.map((result, index) => {
                // Find full question details if available
                const questionDetails = attemptDetails?.test.questions.find(q => q.id === result.questionId);
                const questionText = questionDetails?.questionText || `Question ${index + 1}`;
                const questionAttempt = attemptDetails?.questionResults.find(qr => qr.questionId === result.questionId);
                console.log({ questionDetails, result })
                return (
                  <AccordionItem key={index} value={`item-${index}`} className="bg-card rounded-xl border px-0 overflow-hidden">
                    <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4 flex-1 text-left">
                        {result.correct ? (
                          <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-success" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                            <XCircle className="w-5 h-5 text-destructive" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium line-clamp-1 pr-4">{questionText.replace('__BLANK__', '______')}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mr-2">
                        {result.hintsUsed > 0 && (
                          <div className="flex items-center gap-1 text-xs text-kid-yellow font-medium bg-kid-yellow/10 px-2 py-1 rounded-full whitespace-nowrap">
                            <Lightbulb className="w-3 h-3" />
                            {questionAttempt?.generatedHints.length}
                          </div>
                        )}
                        {(questionAttempt?.viewedMicroLearning) && (
                          <div className="flex items-center gap-1 text-xs text-kid-blue font-medium bg-kid-blue/10 px-2 py-1 rounded-full whitespace-nowrap">
                            <Star className="w-3 h-3" />
                            Learned
                          </div>
                        )}
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-4 pb-4 pt-2 border-t bg-muted/30">
                      <div className="space-y-4 pt-2">
                        {/* Full Question */}
                        <div>
                          <p className="text-sm font-semibold text-muted-foreground mb-1">Question</p>
                          <p className="text-lg">{questionText.replace('__BLANK__', '______')}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                          {/* Student Answer */}
                          <div className={`p-3 rounded-lg border ${result.correct ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
                            <p className="text-sm font-semibold text-muted-foreground mb-1">Your Answer</p>
                            <p className={`font-medium ${result.correct ? 'text-success' : 'text-destructive'}`}>
                              {questionAttempt?.studentAnswer || 'No answer'}
                            </p>
                          </div>

                          {/* Correct Answer */}
                          {/* <div className="p-3 rounded-lg border bg-background">
                            <p className="text-sm font-semibold text-muted-foreground mb-1">Correct Answer</p>
                            <p className="font-medium text-foreground">
                              {questionDetails?.correctAnswer || 'Not available'}
                            </p>
                          </div> */}
                        </div>

                        {/* Nested Details Accordion */}
                        <Accordion type="multiple" className="space-y-2 mt-4">
                          {/* Hints Used */}
                          {result.hintsUsed > 0 && questionAttempt?.generatedHints.length > 0 && (
                            <AccordionItem value="hints" className="border rounded-lg bg-kid-yellow/5 border-kid-yellow/20 px-0">
                              <AccordionTrigger className="px-3 py-2 text-sm font-semibold text-kid-yellow-dark hover:no-underline">
                                <div className="flex items-center gap-2">
                                  <Lightbulb className="w-4 h-4" />
                                  Hints Used ({result.hintsUsed})
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-3 pb-3 pt-0">
                                <ul className="space-y-2 mt-2">
                                  {questionAttempt.generatedHints.map((hint, i) => (
                                    <li key={i} className="text-sm flex gap-2">
                                      <span className="font-bold text-kid-yellow-dark">{i + 1}.</span>
                                      <span>{hint}</span>
                                    </li>
                                  ))}
                                </ul>
                              </AccordionContent>
                            </AccordionItem>
                          )}

                          {/* Micro Learning Viewed */}
                          {questionAttempt?.viewedMicroLearning && (
                            <AccordionItem value="microlearning" className="border rounded-lg bg-kid-blue/5 border-kid-blue/20 px-0">
                              <AccordionTrigger className="px-3 py-2 text-sm font-semibold text-kid-blue-dark hover:no-underline">
                                <div className="flex items-center gap-2">
                                  <Star className="w-4 h-4" />
                                  Micro-Learning Viewed
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-3 pb-3 pt-0">
                                <p className="text-sm mt-2">
                                  {questionAttempt.microLearningContent || "Content viewed during test"}
                                </p>
                              </AccordionContent>
                            </AccordionItem>
                          )}
                        </Accordion>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Button
            onClick={() => navigate('/student')}
            className="flex-1 py-6 text-lg"
          >
            <Home className="w-5 h-5 mr-2" />
            Go Home
          </Button>
          <Button
            onClick={() => navigate('/student/tests')}
            variant="outline"
            className="flex-1 py-6 text-lg"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            More Tests
          </Button>
        </motion.div>
      </div>
    </StudentLayout>
  );
}
