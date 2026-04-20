/**
 * React Query Hooks for AI Learning Platform
 *
 * All data access goes through these hooks.
 * When backend is ready, only the service functions need to change.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  User,
  Test,
  Question,
  Lesson,
  TestWithQuestions,
  UserRole,
  TestAttempt,
  QuestionBankItem,
  QuestionBankSet,
} from "@/types";
import * as api from "@/services/api";

// ============================================
// Query Keys
// ============================================

export const queryKeys = {
  // Auth
  currentUser: ["currentUser"] as const,

  // Users
  users: (filters?: { role?: UserRole; search?: string }) =>
    ["users", filters] as const,
  user: (id: string) => ["user", id] as const,

  // Tests
  tests: (filters?: { status?: string; search?: string }) =>
    ["tests", filters] as const,
  test: (id: string) => ["test", id] as const,
  testWithQuestions: (id: string) => ["test", id, "questions"] as const,

  // Lessons
  lessons: ["lessons"] as const,

  // Attempts

  upcomingTests: (studentId: string) => ["upcomingTests", studentId] as const,
  studentAttempts: (studentId: string) =>
    ["studentAttempts", studentId] as const,
  attemptResult: (attemptId: string) => ["attemptResult", attemptId] as const,
  attemptDetails: (attemptId: string) => ["attemptDetails", attemptId] as const,

  // Analytics
  analytics: (filters?: import("@/services/api/analytics").AnalyticsFilters) =>
    ["analytics", filters ?? null] as const,
  analyticsFilterOptions: ["analyticsFilterOptions"] as const,
  analyticsCharts: (filters?: import("@/services/api/analytics").AnalyticsFilters) =>
    ["analyticsCharts", filters ?? null] as const,
  testAnalytics: (testId: string) => ["analytics", "test", testId] as const,

  // Question Bank
  questionBankItems: ["questionBankItems"] as const,

  // Single question (by id)
  question: (questionId: string) => ["question", questionId] as const,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: api.getCurrentUser,
    staleTime: Infinity,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.loginUser,
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.currentUser, user);
    },
  });
}

export function useSignUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.signUpUser,
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.currentUser, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.logoutUser,
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.currentUser, null);
      queryClient.clear();
    },
  });
}

// ============================================
// User Management Hooks (Admin)
// ============================================

export function useUsers(filters?: {
  role?: UserRole;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: queryKeys.users(filters),
    queryFn: () => api.getUsers(filters),
  });
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: queryKeys.user(userId),
    queryFn: () => api.getUserById(userId),
    enabled: !!userId,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["updateUser"],
    mutationFn: ({
      userId,
      updates,
    }: {
      userId: string;
      updates: Partial<User>;
    }) => api.adminUpdateUser(userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

// ============================================
// Test Management Hooks
// ============================================

export function useTests(filters?: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: queryKeys.tests(filters),
    queryFn: () => api.getTests(filters),
  });
}

export function useTest(testId: string) {
  return useQuery({
    queryKey: queryKeys.test(testId),
    queryFn: async () => {
      const test = await api.getTestWithQuestions(testId);
      return test as Test | null;
    },
    enabled: !!testId,
  });
}

export function useTestWithQuestions(testId: string) {
  return useQuery<TestWithQuestions>({
    queryKey: queryKeys.testWithQuestions(testId),
    queryFn: () => api.getTestWithQuestions(testId),
    enabled: !!testId,
  });
}

export function useCreateTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createTest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
    },
  });
}

export function useUpdateTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ testId, data }: { testId: string; data: Partial<Test> }) =>
      api.updateTest(testId, data),
    onSuccess: (_, { testId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.test(testId) });
      queryClient.invalidateQueries({ queryKey: ["tests"] });
    },
  });
}

export function useDeleteTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteTest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
    },
  });
}

export function useAnalyzeDocument() {
  return useMutation({
    mutationFn: ({
      content,
      clarificationAnswer,
    }: {
      content: string;
      clarificationAnswer?: string;
    }) => api.analyzeDocument(content, clarificationAnswer),
  });
}

export function useExtractQuestions() {
  return useMutation({
    mutationFn: ({
      content,
      count,
      topics,
    }: {
      content: string;
      count: number;
      topics?: string[];
    }) => api.extractQuestionsFromText(content, count, topics),
  });
}

export function useAddQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      testId,
      question,
    }: {
      testId: string;
      question: Omit<Question, "id" | "testId">;
    }) => api.addQuestion(testId, question),
    onSuccess: (_, { testId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.testWithQuestions(testId),
      });
    },
  });
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      questionId,
      data,
    }: {
      questionId: string;
      data: Partial<Question>;
    }) => api.updateQuestion(questionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test"] });
    },
  });
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test"] });
    },
  });
}

export function useGuessAnswer() {
  return useMutation({
    mutationFn: api.guessAnswer,
  });
}

// ============================================
// Lesson Hooks
// ============================================

export function useLessons() {
  return useQuery({
    queryKey: queryKeys.lessons,
    queryFn: api.getLessons,
  });
}

export function useLesson(lessonId: string) {
  return useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => api.getLesson(lessonId),
    enabled: !!lessonId,
  });
}

export function useUploadLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.uploadLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lessons });
    },
  });
}

export function useDeleteLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lessons });
    },
  });
}

// ============================================
// Test Attempt Hooks (Student)
// ============================================

export function useUpcomingTests(studentId: string) {
  return useQuery({
    queryKey: queryKeys.upcomingTests(studentId),
    queryFn: () => api.getUpcomingTests(studentId),
    enabled: !!studentId,
  });
}

export function useStudentAttempts(studentId: string) {
  return useQuery({
    queryKey: queryKeys.studentAttempts(studentId),
    queryFn: () => api.getStudentAttempts(studentId),
    enabled: !!studentId,
  });
}

export function useTestAttempt(attemptId: string) {
  return useQuery({
    queryKey: queryKeys.attemptResult(attemptId),
    queryFn: () => api.getTestAttempt(attemptId),
    enabled: !!attemptId,
  });
}

export function useAttemptDetails(attemptId: string) {
  return useQuery({
    queryKey: queryKeys.attemptDetails(attemptId),
    queryFn: () => api.getAttemptDetails(attemptId),
    enabled: !!attemptId,
  });
}

export function useStartAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      testId,
      studentId,
    }: {
      testId: string;
      studentId: string;
    }) => api.startTestAttempt(testId, studentId),
    onSuccess: (_, { studentId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.studentAttempts(studentId),
      });
    },
  });
}

export function useSubmitAnswer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.submitAnswer,
    onSuccess: (_, { attemptId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.attemptResult(attemptId),
      });
    },
  });
}

export function useGetNextAdaptiveQuestion() {
  return useMutation({
    mutationFn: (attemptId: string) => api.getNextAdaptiveQuestion(attemptId),
  });
}

export function useGetQuestion() {
  return useMutation({
    mutationFn: (questionId: string) => api.getQuestionById(questionId),
  });
}

export function useQuestion(questionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.question(questionId ?? ""),
    queryFn: () => api.getQuestionById(questionId!),
    enabled: !!questionId,
  });
}

export function useHint() {
  return useMutation({
    mutationFn: ({
      attemptId,
      questionId,
      hintIndex,
      studentAnswer,
    }: {
      attemptId: string;
      questionId: string;
      hintIndex: number;
      studentAnswer?: string;
    }) => api.useHint(attemptId, questionId, hintIndex, studentAnswer),
  });
}

export function useMicroLearning() {
  return useMutation({
    mutationFn: ({
      questionId,
      attemptId,
      studentQuestion,
    }: {
      questionId: string;
      attemptId?: string;
      studentQuestion?: string;
    }) => api.getMicroLearning(questionId, attemptId, studentQuestion),
  });
}

export function useTrackStudyMaterialDownload() {
  return useMutation({
    mutationFn: ({
      attemptId,
      questionId,
    }: {
      attemptId: string;
      questionId: string;
    }) => api.trackStudyMaterialDownload(attemptId, questionId),
  });
}

export function useCompleteAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      attemptId,
      metrics,
    }: {
      attemptId: string;
      metrics?: Partial<TestAttempt>;
    }) => api.completeAttempt(attemptId, metrics),
    onSuccess: (_, { attemptId }) => {
      queryClient.invalidateQueries({ queryKey: ["studentAttempts"] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.attemptDetails(attemptId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.attemptResult(attemptId),
      });
    },
  });
}

// ============================================
// Analytics Hooks
// ============================================

export function useAnalyticsFilters() {
  return useQuery({
    queryKey: queryKeys.analyticsFilterOptions,
    queryFn: api.getAnalyticsFilterOptions,
  });
}

export function useAnalytics(
  filters?: import("@/services/api/analytics").AnalyticsFilters,
) {
  return useQuery({
    queryKey: queryKeys.analytics(filters),
    queryFn: () => api.getOverallAnalytics(filters),
  });
}

export function useSuspenseAnalytics(
  filters?: import("@/services/api/analytics").AnalyticsFilters,
) {
  return useSuspenseQuery({
    queryKey: queryKeys.analytics(filters),
    queryFn: () => api.getOverallAnalytics(filters),
  });
}

export function useAnalyticsChartsData(
  filters?: import("@/services/api/analytics").AnalyticsFilters,
) {
  return useQuery({
    queryKey: queryKeys.analyticsCharts(filters),
    queryFn: () => api.getAnalyticsChartsData(filters),
  });
}

export function useSuspenseAnalyticsChartsData(
  filters?: import("@/services/api/analytics").AnalyticsFilters,
) {
  return useSuspenseQuery({
    queryKey: queryKeys.analyticsCharts(filters),
    queryFn: () => api.getAnalyticsChartsData(filters),
  });
}

export function useTestAnalytics(testId: string) {
  return useQuery({
    queryKey: queryKeys.testAnalytics(testId),
    queryFn: () => api.getTestAnalytics(testId),
    enabled: !!testId,
  });
}

export function useAllTestAttempts(
  page = 1,
  pageSize = 20,
  filters?: {
    search?: string;
    status?: string;
    minScore?: number;
    maxScore?: number;
  },
) {
  return useQuery({
    queryKey: ["allTestAttempts", page, pageSize, filters],
    queryFn: () => api.getAllTestAttempts(page, pageSize, filters),
  });
}

export function usePerformanceMetrics(
  page = 1,
  pageSize = 20,
  filters?: { search?: string; testId?: string; studentId?: string },
) {
  return useQuery({
    queryKey: ["performanceMetrics", page, pageSize, filters],
    queryFn: () => api.getPerformanceMetrics(page, pageSize, filters),
  });
}

export function useSuspensePerformanceMetrics(
  page = 1,
  pageSize = 20,
  filters?: { search?: string; testId?: string; studentId?: string },
) {
  return useSuspenseQuery({
    queryKey: ["performanceMetrics", page, pageSize, filters],
    queryFn: () => api.getPerformanceMetrics(page, pageSize, filters),
  });
}

export function useAllStudentMetrics(testId?: string, studentId?: string) {
  return useQuery({
    queryKey: ["allStudentMetrics", testId, studentId],
    queryFn: () => api.getAllStudentMetrics(testId, studentId),
  });
}

export function useSuspenseAllStudentMetrics(testId?: string, studentId?: string) {
  return useSuspenseQuery({
    queryKey: ["allStudentMetrics", testId, studentId],
    queryFn: () => api.getAllStudentMetrics(testId, studentId),
  });
}

// ============================================
// Question Bank Hooks
// ============================================

export function useGenerateQuestionVariants() {
  return useMutation({
    mutationFn: api.generateQuestionVariants,
  });
}

export function useSaveQuestionBankSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.saveQuestionBankSet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questionBankSets"] });
    },
  });
}

export function useEvaluateQuestionQuality() {
  return useMutation({
    mutationFn: api.evaluateQuestionQuality,
  });
}

export function useRegenerateQuestionVariant() {
  return useMutation({
    mutationFn: api.regenerateQuestionVariant,
  });
}

export function useQuestionBankSets(filters?: {
  lessonId?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["questionBankSets", filters],
    queryFn: () => api.getQuestionBankSets(filters),
  });
}

export function useQuestionBankSet(id?: string) {
  return useQuery({
    queryKey: ["questionBankSet", id],
    queryFn: () => api.getQuestionBankSet(id),
    enabled: !!id,
  });
}

export function useUpdateQuestionBankSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<QuestionBankSet>;
    }) => api.updateQuestionBankSet(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questionBankSets"] });
    },
  });
}

export function useDeleteQuestionBankSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteQuestionBankSet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questionBankSets"] });
    },
  });
}

// ============================================
// Question Bank Items (per-question table)
// ============================================

export function useQuestionBankItems(filters?: api.GetQuestionBankItemsFilters) {
  return useQuery({
    queryKey: [...queryKeys.questionBankItems, filters],
    queryFn: () => api.getQuestionBankItems(filters),
  });
}

export function useCreateQuestionBankItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      items: api.GenerateQuestionBankResponse["questions"];
      lessonId?: string | null;
    }) => api.createQuestionBankItems(params.items, { lessonId: params.lessonId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questionBankItems });
    },
  });
}

/** Generate questions from document then save to question_bank_items (Add dialog flow). */
export function useGenerateAndCreateQuestionBankItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      content: string;
      lessonId?: string | null;
    }) => {
      const response = await api.generateQuestionBankFromDocument({
        content: params.content,
      });
      const created = await api.createQuestionBankItems(response.questions, {
        lessonId: params.lessonId,
      });
      return { created, count: created.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questionBankItems });
    },
  });
}

export function useUpdateQuestionBankItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Parameters<typeof api.updateQuestionBankItem>[1];
    }) => api.updateQuestionBankItem(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questionBankItems });
    },
  });
}

export function useDeleteQuestionBankItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteQuestionBankItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.questionBankItems });
    },
  });
}
