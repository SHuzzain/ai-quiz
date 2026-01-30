import { Test, TestAttempt, AttemptResult, TestWithQuestions } from "@/types";
import {
  mockTests,
  mockQuestions,
  mockAttempts,
  mockQuestionAttempts,
} from "@/mocks/data";

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const MOCK_DELAY = 500;

/**
 * Get upcoming tests for student
 */
export async function getUpcomingTests(studentId: string): Promise<Test[]> {
  await delay(MOCK_DELAY);

  return mockTests.filter(
    (t) => t.status === "active" || t.status === "scheduled",
  );
}

/**
 * Get single test with questions
 */
export async function getTestWithQuestions(
  testId: string,
): Promise<TestWithQuestions | null> {
  await delay(MOCK_DELAY);

  const test = mockTests.find((t) => t.id === testId);
  if (!test) return null;

  const questions = mockQuestions[testId] || [];

  return { ...test, questions };
}

/**
 * Get student's past attempts
 */
export async function getStudentAttempts(
  studentId: string,
): Promise<TestAttempt[]> {
  await delay(MOCK_DELAY);

  return mockAttempts.filter((a) => a.studentId === studentId);
}

/**
 * Start a test attempt
 */
export async function startTestAttempt(
  testId: string,
  studentId: string,
): Promise<TestAttempt> {
  await delay(MOCK_DELAY);

  const test = mockTests.find((t) => t.id === testId);
  if (!test) throw new Error("Test not found");

  const attempt: TestAttempt = {
    id: `attempt-${Date.now()}`,
    testId,
    studentId,
    startedAt: new Date(),
    status: "in_progress",
    totalQuestions: test.questionCount,
    correctAnswers: 0,
    hintsUsed: 0,
  };

  return attempt;
}

/**
 * Submit answer for a question
 */
export async function submitAnswer(data: {
  attemptId: string;
  questionId: string;
  answer: string;
}): Promise<{ isCorrect: boolean; correctAnswer: string }> {
  await delay(MOCK_DELAY);

  for (const questions of Object.values(mockQuestions)) {
    const question = questions.find((q) => q.id === data.questionId);
    if (question) {
      const isCorrect =
        data.answer.toLowerCase().trim() ===
        question.correctAnswer.toLowerCase().trim();
      return { isCorrect, correctAnswer: question.correctAnswer };
    }
  }

  throw new Error("Question not found");
}

/**
 * Use a hint
 */
export async function useHintRequest(
  attemptId: string,
  questionId: string,
  hintIndex: number,
): Promise<string> {
  await delay(MOCK_DELAY);

  for (const questions of Object.values(mockQuestions)) {
    const question = questions.find((q) => q.id === questionId);
    if (question && question.hints[hintIndex]) {
      return question.hints[hintIndex];
    }
  }

  throw new Error("Hint not found");
}

/**
 * Get micro learning content
 */
export async function getMicroLearning(questionId: string): Promise<string> {
  await delay(MOCK_DELAY);

  for (const questions of Object.values(mockQuestions)) {
    const question = questions.find((q) => q.id === questionId);
    if (question) {
      return question.microLearning;
    }
  }

  throw new Error("Question not found");
}

/**
 * Complete test attempt
 */
export async function completeAttempt(
  attemptId: string,
): Promise<AttemptResult> {
  await delay(MOCK_DELAY);

  const attempt = mockAttempts.find((a) => a.id === attemptId) || {
    id: attemptId,
    testId: "test-1",
    studentId: "student-1",
    startedAt: new Date(Date.now() - 600000),
    completedAt: new Date(),
    status: "completed" as const,
    score: 80,
    totalQuestions: 5,
    correctAnswers: 4,
    hintsUsed: 2,
    timeTakenSeconds: 600,
  };

  const test = mockTests.find((t) => t.id === attempt.testId)!;

  return {
    attempt: { ...attempt, status: "completed", completedAt: new Date() },
    questionResults: mockQuestionAttempts.filter(
      (qa) => qa.attemptId === attemptId,
    ),
    test,
  };
}

export async function getAttemptResult(
  attemptId: string,
): Promise<AttemptResult | null> {
  await delay(MOCK_DELAY);

  const attempt = mockAttempts.find((a) => a.id === attemptId);
  if (!attempt) return null;

  const test = mockTests.find((t) => t.id === attempt.testId);
  if (!test) return null;

  const questionResults = mockQuestionAttempts.filter(
    (qa) => qa.attemptId === attemptId,
  );

  return {
    attempt,
    test,
    questionResults,
  };
}
