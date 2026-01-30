/**
 * Bridge API Services
 * Re-exports from feature-based services to maintain compatibility.
 */

export * from "@/features/auth/services/auth.service";
export * from "@/features/quiz-creator/services/creator.service";
export * from "@/features/quiz-creator/services/openai.service";
export {
  getUpcomingTests,
  getStudentAttempts,
  startTestAttempt,
  submitAnswer,
  useHintRequest,
  getMicroLearning,
  completeAttempt,
  getAttemptResult,
} from "@/features/quiz-player/services/player.service";
export * from "@/features/admin/services/admin.service";
