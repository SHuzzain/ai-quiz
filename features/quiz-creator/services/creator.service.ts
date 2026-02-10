import { Lesson, Question, Test } from "@/types/db";
import { apiFetch } from "@/lib/api-client";
import { ExtractedQuestions } from "@/types";
import { env } from "@/env";
import { SESSION_TOKEN } from "@/helper/storage";
import { API_ROUTES } from "@/config/routes";

/**
 * Get all tests
 */
export async function getTests(filters?: {
  status?: Test["status"];
  search?: string;
  userId?: string | null;
  page?: number;
  limit?: number;
}): Promise<Test[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.search) params.append("search", filters.search);
  if (filters?.userId) params.append("userId", filters.userId);
  if (filters?.page) params.append("page", filters.page.toString());
  if (filters?.limit) params.append("limit", filters.limit.toString());

  const data = await apiFetch.get<{ data: Test[] }>(
    `${API_ROUTES.TESTS.ROOT}?${params.toString()}`,
  );
  return data.data;
}

/**
 * Get single test with questions
 */
export async function getTestWithQuestions(
  testId: string,
): Promise<(Test & { questions: Question[] }) | null> {
  try {
    return await apiFetch.get<Test & { questions: Question[] }>(
      API_ROUTES.TESTS.BY_ID(testId),
    );
  } catch {
    return null;
  }
}

/**
 * Create a new test
 */
export type QuestionInput = Omit<
  Question,
  | "id"
  | "testId"
  | "createdAt"
  | "updatedAt"
  | "order"
  | "maxAttemptsBeforeStudy"
> & {
  id?: string;
  order?: number;
  maxAttemptsBeforeStudy?: number;
};

/**
 * Create a new test
 */
export async function createTest(
  data: Partial<Test> & { questions: QuestionInput[] },
): Promise<Test> {
  return apiFetch.post<Test>(API_ROUTES.TESTS.ROOT, data);
}

/**
 * Update a test
 */
export async function updateTest(
  testId: string,
  data: Partial<Test> & { questions?: QuestionInput[] },
): Promise<Test> {
  return apiFetch.put<Test>(API_ROUTES.TESTS.BY_ID(testId), data);
}

/**
 * Delete a test
 */
export async function deleteTest(testId: string): Promise<void> {
  await apiFetch.delete(API_ROUTES.TESTS.BY_ID(testId));
}

/**
 * Extract questions from uploaded file
 */
export async function extractQuestionsFromFile(data: {
  files: File[];
  questionCount: number;
  topics?: string[];
}): Promise<ExtractedQuestions> {
  const formData = new FormData();
  data.files.forEach((file) => formData.append("files", file));
  formData.append("questionCount", String(data.questionCount));

  if (data.topics) {
    formData.append("topics", JSON.stringify(data.topics));
  }

  /*
   * Note: The original implementation used FormData for file upload.
   * Since apiFetch supports JSON by default in post/put, for FormData we might need to use `connect` directly
   * or a custom wrapper if apiFetch doesn't handle FormData automatically.
   * However, let's look at apiFetch implementation.
   * It sets Content-Type to application/json automatically which breaks FormData.
   * So we should use a direct apiFetch call but override headers to let browser set boundary,
   * OR update apiFetch to handle FormData.
   *
   * Given the constraints, I will use a direct generic call but we need to handle the headers carefully.
   * Actually, let's import `connect` if exported or just use the pattern but without Content-Type json for formdata.
   * The user provided `apiFetch` hardcodes Content-Type: application/json.
   * I will workaround this by passing a custom header that overrides it or by using raw fetch for file upload
   * but still pointing to the new backend.
   *
   * To keep it clean and use the authenticated client helper, I should ideally update apiFetch or use a raw fetch with the token.
   *
   * Let's check `lib/api-client.ts` again. It exports `apiFetch`.
   * It hardcodes Content-Type: application/json.
   *
   * I will implement a `uploadFile` helper in this file locally or just use raw fetch
   * using the SESSION_TOKEN helper if available, or just keeping the existing logic but updating the URL.
   */

  // Using raw fetch but with correct full URL
  const token = typeof window !== "undefined" ? SESSION_TOKEN.get() : null;

  const response = await fetch(
    `${env.NEXT_PUBLIC_API_URL}${API_ROUTES.AI.EXTRACT_QUESTIONS}`,
    {
      method: "POST",
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to extract questions.");
  }

  return response.json();
}

/**
 * Generate hints for a question
 */
export async function generateHints(data: {
  questionText: string;
  correctAnswer: string;
}): Promise<{ hints: string[] }> {
  return apiFetch.post<{ hints: string[] }>(API_ROUTES.AI.GENERATE_HINTS, data);
}

/**
 * Generate micro-learning content
 */
export async function generateMicroLearning(data: {
  questionText: string;
  correctAnswer: string;
}): Promise<{ microLearning: string }> {
  return apiFetch.post<{ microLearning: string }>(
    API_ROUTES.AI.GENERATE_MICRO_LEARNING,
    data,
  );
}

/**
 * Analyze document
 */
export async function analyzeDocument(
  files: (
    | File
    | { name: string; text: string; type: "pdf" }
    | { file: File; name: string; type: "file" }
  )[],
  clarificationAnswer?: string,
) {
  const formData = new FormData();

  // Handle different file types
  const texts: { name: string; content: string }[] = [];

  for (const item of files) {
    if ("text" in item) {
      // It's a processed PDF with text
      const content =
        typeof item.text === "string" ? item.text : await item.text();
      texts.push({ name: item.name, content });
    } else if ("file" in item) {
      // It's a wrapper object
      formData.append("files", item.file);
    } else {
      // It's a raw File object
      formData.append("files", item);
    }
  }

  if (texts.length > 0) {
    formData.append("texts", JSON.stringify(texts));
  }

  if (clarificationAnswer) {
    formData.append("clarificationAnswer", clarificationAnswer);
  }

  // Manual fetch for FormData to avoid Content-Type application/json from apiFetch
  const token = typeof window !== "undefined" ? SESSION_TOKEN.get() : null;

  const response = await fetch(
    `${env.NEXT_PUBLIC_API_URL}${API_ROUTES.AI.ANALYZE_DOCUMENT}`,
    {
      method: "POST",
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to analyze document");
  }

  return response.json();
}

// Placeholder functions for compatibility
// These functionalities are currently handled within the main Test create/update flow

export async function addQuestion(
  testId: string,
  question: Omit<Question, "id" | "testId">,
): Promise<Question> {
  throw new Error("Use updateTest to add questions");
}

export async function updateQuestion(
  questionId: string,
  data: Partial<Question>,
): Promise<Question> {
  throw new Error("Use updateTest to update questions");
}

export async function deleteQuestion(questionId: string): Promise<void> {
  throw new Error("Use updateTest to delete questions");
}

export async function guessAnswer(questionText: string): Promise<string> {
  // This could be an API call if needed
  return "";
}

export async function getLessons(): Promise<Lesson[]> {
  // TODO: Implement Lesson API
  return [];
}

export async function uploadLesson(data: FormData): Promise<Lesson> {
  // TODO: Implement Lesson API
  throw new Error("Not implemented");
}

export async function deleteLesson(id: string): Promise<void> {
  // TODO: Implement Lesson API
  throw new Error("Not implemented");
}
