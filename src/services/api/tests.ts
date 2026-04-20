/**
 * Test & Question API – backed by Express + PostgreSQL
 */

import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type { Question, Test, TestWithQuestions } from "@/types";

const DEFAULT_TESTS_PAGE_SIZE = 1000;

export interface GetTestsResult {
  items: Test[];
  total: number;
}

export async function getTests(filters?: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<GetTestsResult> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.pageSize) params.set("pageSize", String(filters.pageSize));
  const q = params.toString();
  return apiGet<GetTestsResult>(`/tests${q ? `?${q}` : ""}`);
}

export async function getQuestionById(questionId: string) {
  return apiGet(`/questions/${questionId}`);
}

export async function getTestWithQuestions(
  testId: string,
): Promise<TestWithQuestions> {
  return apiGet<TestWithQuestions>(`/tests/${testId}`);
}

export async function createTest(data: {
  title: string;
  description: string;
  scheduledDate: Date;
  duration: number;
  lessonId?: string;
  status?: string;
  totalMark?: number;
  numberOfQuestions?: number | null;
  conditions?: unknown;
}) {
  return apiPost<Test>("/tests", {
    ...data,
    scheduledDate: data.scheduledDate.toISOString(),
  });
}

export async function updateTest(
  testId: string,
  data: Partial<{
    title: string;
    description: string;
    scheduledDate: Date;
    duration: number;
    lessonId?: string;
    status?: string;
    totalMark?: number;
    numberOfQuestions?: number | null;
    questionCount?: number;
    conditions?: unknown;
  }>,
) {
  const payload: Record<string, unknown> = { ...data };
  if (data.scheduledDate) payload.scheduledDate = data.scheduledDate.toISOString();
  return apiPatch<Test>(`/tests/${testId}`, payload);
}

export async function deleteTest(testId: string): Promise<void> {
  await apiDelete(`/tests/${testId}`);
}

export async function addQuestion(
  testId: string,
  question: Omit<Question, "id" | "testId">,
) {
  return apiPost(`/tests/${testId}/questions`, {
    questionText: question.questionText,
    correctAnswer: question.correctAnswer,
    order: question.order,
    topic: question.topic,
    concept: question.concept,
    mark: question.mark,
    difficulty: question.difficulty,
    working: question.working,
    difficultyReason: question.difficultyReason,
    hints: question.hints,
    microLearning: question.microLearning,
  });
}

export async function updateQuestion(
  questionId: string,
  data: Partial<Question>,
) {
  return apiPatch(`/questions/${questionId}`, {
    ...(data.questionText !== undefined && { questionText: data.questionText }),
    ...(data.correctAnswer !== undefined && { correctAnswer: data.correctAnswer }),
    ...(data.hints !== undefined && { hints: data.hints }),
    ...(data.microLearning !== undefined && { microLearning: data.microLearning }),
    ...(data.order !== undefined && { order: data.order }),
    ...(data.topic !== undefined && { topic: data.topic }),
    ...(data.concept !== undefined && { concept: data.concept }),
    ...(data.difficulty !== undefined && { difficulty: data.difficulty }),
    ...(data.mark !== undefined && { mark: data.mark }),
    ...(data.working !== undefined && { working: data.working }),
    ...(data.difficultyReason !== undefined && {
      difficultyReason: data.difficultyReason,
    }),
  });
}

export async function deleteQuestion(questionId: string): Promise<void> {
  await apiDelete(`/questions/${questionId}`);
}

export async function getUpcomingTests(_studentId: string) {
  return apiGet<Test[]>("/tests/upcoming");
}
