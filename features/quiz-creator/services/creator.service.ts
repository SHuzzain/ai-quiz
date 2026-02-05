import { Lesson, Question, Test } from "@prisma/client";
import { TestWithQuestions, ExtractedQuestions } from "@/types";

/**
 * Get all tests
 */
export async function getTests(filters?: {
  status?: Test["status"];
  search?: string;
}): Promise<Test[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.search) params.append("search", filters.search);

  const response = await fetch(`/api/tests?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch tests");

  const data = await response.json();
  return data.data;
}

/**
 * Get single test with questions
 */
export async function getTestWithQuestions(
  testId: string,
): Promise<(Test & { questions: Question[] }) | null> {
  const response = await fetch(`/api/tests/${testId}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Failed to fetch test");

  return response.json();
}

/**
 * Create a new test
 */
export async function createTest(
  data: Partial<Test> & { questions: Question[] },
): Promise<Test> {
  const response = await fetch("/api/tests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create test");
  }

  return response.json();
}

/**
 * Update a test
 */
export async function updateTest(
  testId: string,
  data: Partial<Test>,
): Promise<Test> {
  const response = await fetch(`/api/tests/${testId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update test");
  }

  return response.json();
}

/**
 * Delete a test
 */
export async function deleteTest(testId: string): Promise<void> {
  const response = await fetch(`/api/tests/${testId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete test");
  }
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
 * Generate hints for a question
 */
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

/**
 * Generate micro-learning content
 */
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
    throw new Error(
      errorData.error || "Failed to generate micro-learning content.",
    );
  }

  return response.json();
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
  files.forEach(async (item) => {
    if ("text" in item) {
      // It's a processed PDF with text
      const text =
        typeof item.text === "string" ? item.text : await item.text();
      formData.append(
        "files",
        new Blob([text], { type: "text/plain" }),
        item.name + ".txt",
      );
    } else if ("file" in item) {
      // It's a wrapper object
      formData.append("files", item.file);
    } else {
      // It's a raw File object
      formData.append("files", item);
    }
  });

  if (clarificationAnswer) {
    formData.append("clarificationAnswer", clarificationAnswer);
  }

  const response = await fetch("/api/analyze-document", {
    method: "POST",
    body: formData,
  });

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
