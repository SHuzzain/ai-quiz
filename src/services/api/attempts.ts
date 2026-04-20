/**
 * Attempts API – Express backend
 */

import { apiGet, apiPost } from "@/lib/api-client";
import type {
  AttemptResult,
  Question,
  Test,
  TestAttempt,
  TestWithQuestions,
} from "@/types";

function parseOptionalDate(v: unknown): Date | undefined {
  if (v == null || v === "") return undefined;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

/** JSON uses ISO strings; normalize so `TestAttempt.startedAt` is a real Date. */
export function mapApiToTestAttempt(raw: Record<string, unknown>): TestAttempt {
  const started =
    parseOptionalDate(raw.startedAt ?? raw.started_at) ?? new Date(0);
  const completed = parseOptionalDate(raw.completedAt ?? raw.completed_at);
  return {
    ...raw,
    startedAt: started,
    ...(completed !== undefined ? { completedAt: completed } : {}),
  } as TestAttempt;
}

export async function getStudentAttempts(
  studentId: string,
): Promise<Array<TestAttempt & { testTitle?: string }>> {
  const rows = (await apiGet(`/attempts/student/${studentId}`)) as Record<
    string,
    unknown
  >[];
  return rows.map((row) => mapApiToTestAttempt(row) as TestAttempt & { testTitle?: string });
}

export async function getTestAttempt(attemptId: string): Promise<TestAttempt> {
  const raw = (await apiGet(`/attempts/${attemptId}`)) as Record<
    string,
    unknown
  >;
  return mapApiToTestAttempt(raw);
}

export async function getAttemptDetailByStudentIdAndTestId(
  studentId: string,
  testId: string,
): Promise<TestAttempt> {
  const raw = (await apiGet(
    `/attempts/by-student-test/${studentId}/${testId}`,
  )) as Record<string, unknown>;
  return mapApiToTestAttempt(raw);
}

export async function getAttemptDetails(attemptId: string) {
  const raw = (await apiGet(`/attempts/${attemptId}/details`)) as Record<
    string,
    unknown
  >;
  const att = raw.attempt;
  if (att && typeof att === "object" && !Array.isArray(att)) {
    raw.attempt = mapApiToTestAttempt(att as Record<string, unknown>);
  }
  return raw;
}


export async function determineStartingDifficulty(
  studentId: string,
  testId: string | null,
): Promise<number> {
  const params = new URLSearchParams({ studentId });
  if (testId) params.set("testId", testId);
  const r = await apiGet<{ difficulty: number }>(
    `/attempts/difficulty/start?${params.toString()}`,
  );
  return r.difficulty;
}

export async function updateDifficultyAfterAnswer(
  attemptId: string,
  questionId: string,
): Promise<void> {
  await apiPost("/attempts/update-difficulty", { attemptId, questionId });
}

export async function getNextAdaptiveQuestion(
  attemptId: string,
  aiHistory?: import("@/services/adaptiveEngine").AttemptHistoryItem[],
) {
  return apiPost<Question | null>("/attempts/next-question", {
    attemptId,
    aiHistory,
  });
}

export async function startTestAttempt(testId: string, studentId: string) {
  const r = await apiPost<{ id: string }>("/attempts/start", {
    testId,
    studentId,
  });
  return r.id;
}

export async function submitAnswer(data: {
  attemptId: string;
  questionId: string;
  answer: string;
  timeTaken?: number;
  attemptsCount?: number;
  hintsUsed?: number;
  viewedMicroLearning?: boolean;
}) {
  return apiPost<{
    isCorrect: boolean;
    correctAnswer: string;
    feedback?: string;
    score: number;
  }>("/attempts/submit-answer", data);
}

export async function useHint(
  attemptId: string,
  questionId: string,
  hintIndex: number,
  studentAnswer?: string,
): Promise<string> {
  const r = await apiPost<{ hint: string }>("/attempts/hint", {
    attemptId,
    questionId,
    hintIndex,
    studentAnswer,
  });
  return r.hint;
}

export async function getMicroLearning(
  questionId: string,
  attemptId?: string,
  studentQuestion?: string,
): Promise<string> {
  const r = await apiPost<{ content: string }>("/attempts/micro-learning", {
    questionId,
    attemptId,
    studentQuestion,
  });
  return r.content;
}

export async function trackStudyMaterialDownload(
  attemptId: string,
  questionId: string,
): Promise<void> {
  await apiPost("/attempts/track-study-download", { attemptId, questionId });
}

export async function completeAttempt(
  attemptId: string,
  metrics?: Partial<TestAttempt>,
): Promise<AttemptResult> {
  const raw = (await apiPost(`/attempts/${attemptId}/complete`, {
    timeTakenSeconds: metrics?.timeTakenSeconds,
  })) as Record<string, unknown>;
  const att = raw.attempt;
  if (att && typeof att === "object" && !Array.isArray(att)) {
    raw.attempt = mapApiToTestAttempt(att as Record<string, unknown>);
  }
  return raw as AttemptResult;
}
