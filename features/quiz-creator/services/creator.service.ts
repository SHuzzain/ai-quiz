import {
  Test,
  Question,
  Lesson,
  TestWithQuestions,
  ExtractedQuestions,
} from "@/types";
import { mockTests, mockQuestions, mockLessons } from "@/mocks/data";

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const MOCK_DELAY = 500;

/**
 * Get all tests
 */
export async function getTests(filters?: {
  status?: Test["status"];
  search?: string;
}): Promise<Test[]> {
  await delay(MOCK_DELAY);

  let filtered = [...mockTests];

  if (filters?.status) {
    filtered = filtered.filter((t) => t.status === filters.status);
  }

  if (filters?.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search),
    );
  }

  return filtered;
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
 * Create a new test
 */
export async function createTest(data: {
  title: string;
  description: string;
  scheduledDate: Date;
  duration: number;
  lessonId?: string;
}): Promise<Test> {
  await delay(MOCK_DELAY);

  const newTest: Test = {
    id: `test-${Date.now()}`,
    ...data,
    createdAt: new Date(),
    createdBy: "admin-1",
    status: "draft",
    questionCount: 0,
  };

  return newTest;
}

/**
 * Update test
 */
export async function updateTest(
  testId: string,
  data: Partial<Test>,
): Promise<Test> {
  await delay(MOCK_DELAY);

  const test = mockTests.find((t) => t.id === testId);
  if (!test) throw new Error("Test not found");

  return { ...test, ...data };
}

/**
 * Delete test
 */
export async function deleteTest(testId: string): Promise<void> {
  await delay(MOCK_DELAY);
}

/**
 * Extract questions from uploaded file (AI mock)
 */
export async function extractQuestionsFromFile(data: {
  file: File;
  questionCount: number;
}): Promise<ExtractedQuestions> {
  const formData = new FormData();
  formData.append("file", data.file);
  formData.append("questionCount", String(data.questionCount));

  const response = await fetch("/api/extract-questions", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to extract questions.");
  }

  return response.json();
}

/**
 * Add question to test
 */
export async function addQuestion(
  testId: string,
  question: Omit<Question, "id" | "testId">,
): Promise<Question> {
  await delay(MOCK_DELAY);

  const newQuestion: Question = {
    id: `q-${Date.now()}`,
    testId,
    ...question,
  };

  return newQuestion;
}

/**
 * Update question
 */
export async function updateQuestion(
  questionId: string,
  data: Partial<Question>,
): Promise<Question> {
  await delay(MOCK_DELAY);

  for (const questions of Object.values(mockQuestions)) {
    const question = questions.find((q) => q.id === questionId);
    if (question) {
      return { ...question, ...data };
    }
  }

  throw new Error("Question not found");
}

/**
 * Delete question
 */
export async function deleteQuestion(questionId: string): Promise<void> {
  await delay(MOCK_DELAY);
}

/**
 * AI-guess answer for a question (mock)
 */
export async function guessAnswer(questionText: string): Promise<string> {
  await delay(1500);

  if (questionText.toLowerCase().includes("planet")) return "Earth";
  if (questionText.toLowerCase().includes("color")) return "blue";
  if (questionText.toLowerCase().includes("animal")) return "dog";

  return "example answer";
}

export async function generateHints(data: {
  questionText: string;
  correctAnswer: string;
}): Promise<{ hints: string[] }> {
  const response = await fetch("/api/generate-hints", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to generate hints.");
  }
  return response.json();
}

export async function generateMicroLearning(data: {
  questionText: string;
  correctAnswer: string;
}): Promise<{ microLearning: string }> {
  const response = await fetch("/api/generate-micro-learning", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to generate micro-learning.");
  }
  return response.json();
}

/**
 * Get all lessons
 */
export async function getLessons(): Promise<Lesson[]> {
  await delay(MOCK_DELAY);
  return [...mockLessons];
}

/**
 * Upload lesson file
 */
export async function uploadLesson(data: {
  title: string;
  description?: string;
  file: File;
}): Promise<Lesson> {
  await delay(1000);

  const newLesson: Lesson = {
    id: `lesson-${Date.now()}`,
    title: data.title,
    description: data.description,
    fileName: data.file.name,
    fileUrl: URL.createObjectURL(data.file),
    fileType: data.file.type,
    uploadedAt: new Date(),
    uploadedBy: "admin-1",
  };

  return newLesson;
}

/**
 * Delete lesson
 */
export async function deleteLesson(lessonId: string): Promise<void> {
  await delay(MOCK_DELAY);
}
