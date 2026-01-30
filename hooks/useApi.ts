/**
 * Bridge React Query Hooks
 * Re-exports from feature-based hooks to maintain compatibility.
 */

export * from "@/features/auth/hooks/useAuthQuery";
export * from "@/features/quiz-creator/hooks/useCreatorQuery";
export {
  useUpcomingTests,
  useStudentAttempts,
  useStartAttempt,
  useSubmitAnswer,
  useHint,
  useMicroLearning,
  useCompleteAttempt,
  useAttemptResult,
} from "@/features/quiz-player/hooks/usePlayerQuery";
export * from "@/features/admin/hooks/useAdminQuery";

// Re-export common query keys if needed
import { authQueryKeys } from "@/features/auth/hooks/useAuthQuery";
import { creatorQueryKeys } from "@/features/quiz-creator/hooks/useCreatorQuery";
import { playerQueryKeys } from "@/features/quiz-player/hooks/usePlayerQuery";
import { adminQueryKeys } from "@/features/admin/hooks/useAdminQuery";

export const queryKeys = {
  ...authQueryKeys,
  ...creatorQueryKeys,
  ...playerQueryKeys,
  ...adminQueryKeys,
};
