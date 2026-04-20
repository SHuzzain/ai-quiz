/**
 * API services – Express + PostgreSQL backend (replaces Supabase).
 */

import type { Json } from "@/types/json";
import {
  apiDelete,
  apiFetch,
  apiGet,
  apiPatch,
  apiPost,
  apiUploadFormData,
  setStoredToken,
} from "@/lib/api-client";
import type {
  Course,
  DocumentAnalysis,
  ExtractedQuestionsResult,
  Lesson,
  PaginatedResponse,
  Question,
  QuestionBankItem,
  QuestionBankItemRow,
  QuestionBankSet,
  User,
  UserRole,
} from "@/types";
import type { VariantConfigForm } from "@/schemas/questionBank";

export * from "./api/tests";
export * from "./api/attempts";
export * from "./api/analytics";

// ============================================
// Auth
// ============================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpData extends LoginCredentials {
  name: string;
  role: UserRole;
}

function mapUser(d: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  grade?: number;
  createdAt: string;
  lastActiveAt: string;
}): User {
  return {
    id: d.id,
    email: d.email,
    name: d.name,
    role: d.role,
    avatarUrl: d.avatarUrl,
    grade: d.grade,
    createdAt: new Date(d.createdAt),
    lastActiveAt: new Date(d.lastActiveAt),
  };
}

export async function loginUser(credentials: LoginCredentials): Promise<User> {
  setStoredToken(null);
  const res = await apiFetch<{ token: string; user: Parameters<typeof mapUser>[0] }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify(credentials),
    },
  );
  setStoredToken(res.token);
  return mapUser(res.user);
}

export async function signUpUser(data: SignUpData): Promise<User> {
  setStoredToken(null);
  const res = await apiFetch<{ token: string; user: Parameters<typeof mapUser>[0] }>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
  setStoredToken(res.token);
  return mapUser(res.user);
}

export async function getCurrentUser(): Promise<User | null> {
  const { getStoredToken: getTok } = await import("@/lib/api-client");
  if (!getTok()) return null;
  try {
    const u = await apiGet<Parameters<typeof mapUser>[0]>("/auth/me");
    return mapUser(u);
  } catch {
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  setStoredToken(null);
}

// ============================================
// Users (admin)
// ============================================

export async function getUsers(filters?: {
  role?: UserRole;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<User>> {
  const params = new URLSearchParams();
  if (filters?.role) params.set("role", filters.role);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.pageSize) params.set("pageSize", String(filters.pageSize));
  return apiGet(`/profiles/users?${params.toString()}`);
}

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const u = await apiGet<Parameters<typeof mapUser>[0]>(
      `/profiles/lookup/${userId}`,
    );
    return mapUser(u);
  } catch {
    return null;
  }
}

export async function updateUser(
  _userId: string,
  data: { name?: string; avatarUrl?: string },
): Promise<User> {
  const u = await apiPatch<Parameters<typeof mapUser>[0]>("/profiles/me", data);
  return mapUser(u);
}

export async function adminUpdateUser(
  userId: string,
  updates: Partial<User>,
): Promise<User> {
  const u = await apiPatch<Parameters<typeof mapUser>[0]>(
    `/profiles/${userId}`,
    {
      name: updates.name,
      grade: updates.grade,
      avatarUrl: updates.avatarUrl,
      role: updates.role,
    },
  );
  return mapUser(u);
}

export async function uploadAvatar(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await apiUploadFormData<{ url: string }>("/profiles/me/avatar", fd);
  return r.url;
}

// ============================================
// AI tools
// ============================================

export async function analyzeDocument(
  content: string,
  clarificationAnswer?: string,
): Promise<DocumentAnalysis> {
  return apiPost("/ai/analyze-document", { content, clarificationAnswer }) as Promise<
    DocumentAnalysis
  >;
}

export async function extractQuestionsFromText(
  content: string,
  count: number,
  topics?: string[],
): Promise<ExtractedQuestionsResult> {
  return apiPost("/ai/extract-questions", { content, count, topics }) as Promise<
    ExtractedQuestionsResult
  >;
}

// ============================================
// Test conditions (pure helpers)
// ============================================

export interface TestCondition {
  topics: string[];
  concept: string[];
  difficulty: number;
  numberOfQuestions: number | string;
}

export function resolveConditionsFromBank(
  conditions: TestCondition[],
  items: QuestionBankItemRow[],
) {
  const seen = new Set<string>();
  const result: QuestionBankItemRow[] = [];

  for (const cond of conditions) {
    const n = Math.max(0, Number(cond.numberOfQuestions ?? 0));
    if (n === 0) continue;

    const pool = items.filter((item) => {
      if (seen.has(item.id)) return false;
      if (cond.topics.length > 0 && !cond.topics.includes(item.topic))
        return false;
      if (
        cond.concept.length > 0 &&
        !cond.concept.includes(item.conceptTested)
      )
        return false;
      if (item.difficulty !== cond.difficulty) return false;
      return true;
    });

    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const taken = pool.slice(0, n);
    for (const item of taken) {
      seen.add(item.id);
      result.push(item);
    }
  }

  return result;
}

export function getRemainingItemsAfterConditions(
  conditions: TestCondition[],
  upToIndex: number,
  items: QuestionBankItemRow[],
): QuestionBankItemRow[] {
  if (upToIndex <= 0) return items;
  const taken = resolveConditionsFromBank(conditions.slice(0, upToIndex), items);
  const takenIds = new Set(taken.map((x) => x.id));
  return items.filter((item) => item.id != null && !takenIds.has(item.id));
}

export function mapBankItemToAddQuestionPayload(
  item: QuestionBankItemRow,
  order: number,
): Omit<Question, "id" | "testId"> {
  return {
    questionText: item.questionText,
    correctAnswer: item.correctAnswer,
    hints: [],
    microLearning: "",
    order,
    topic: item.topic,
    concept: item.conceptTested,
    mark: item.marks,
    difficulty: item.difficulty,
    working: item.working ?? "",
  };
}

export async function guessAnswer(_questionText: string): Promise<string> {
  return "AI Answer";
}

// ============================================
// Lessons
// ============================================

export async function getLessons(): Promise<Lesson[]> {
  const rows = await apiGet<
    {
      id: string;
      title: string;
      description: string;
      files: { name: string; url: string; type: string }[];
      uploadedAt: string;
      uploadedBy: string;
    }[]
  >("/lessons");
  return rows.map((l) => ({
    id: l.id,
    title: l.title,
    description: l.description,
    files: l.files,
    uploadedAt: new Date(l.uploadedAt),
    uploadedBy: l.uploadedBy,
  }));
}

export async function getLesson(lessonId: string) {
  const l = await apiGet<{
    id: string;
    title: string;
    description: string;
    files: { name: string; url: string; type: string }[];
    uploadedAt: string;
    uploadedBy: string;
  }>(`/lessons/${lessonId}`);
  return {
    id: l.id,
    title: l.title,
    description: l.description,
    files: l.files,
    uploadedAt: new Date(l.uploadedAt),
    uploadedBy: l.uploadedBy,
  };
}

export async function uploadLesson(data: {
  title: string;
  description?: string;
  files: File[];
}): Promise<Lesson> {
  if (data.files.length > 3) throw new Error("Max 3 files allowed");
  const fd = new FormData();
  fd.append("title", data.title);
  if (data.description) fd.append("description", data.description);
  data.files.forEach((f) => fd.append("files", f));
  const l = await apiUploadFormData<{
    id: string;
    title: string;
    description: string;
    files: { name: string; url: string; type: string }[];
    uploadedAt: string;
    uploadedBy: string;
  }>("/lessons", fd);
  return {
    id: l.id,
    title: l.title,
    description: l.description,
    files: l.files,
    uploadedAt: new Date(l.uploadedAt),
    uploadedBy: l.uploadedBy,
  };
}

export async function deleteLesson(lessonId: string): Promise<void> {
  await apiDelete(`/lessons/${lessonId}`);
}

// ============================================
// Courses
// ============================================

export async function getCourses(): Promise<Course[]> {
  const rows = await apiGet<
    {
      id: string;
      name: string;
      description: string;
      price: number;
      imageUrl: string;
      createdAt: string;
      updatedAt: string;
    }[]
  >("/courses");
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    price: c.price,
    imageUrl: c.imageUrl,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
  }));
}

export async function getCourse(courseId: string): Promise<Course | null> {
  try {
    const c = await apiGet<{
      id: string;
      name: string;
      description: string;
      price: number;
      imageUrl: string;
      createdAt: string;
      updatedAt: string;
    }>(`/courses/${courseId}`);
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      price: c.price,
      imageUrl: c.imageUrl,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
    };
  } catch {
    return null;
  }
}

export async function createCourse(data: {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}): Promise<Course> {
  const c = await apiPost<{
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    createdAt: string;
    updatedAt: string;
  }>("/courses", data);
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    price: c.price,
    imageUrl: c.imageUrl,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
  };
}

export async function updateCourse(
  courseId: string,
  data: Partial<Omit<Course, "id" | "createdAt" | "updatedAt">>,
): Promise<Course> {
  const c = await apiPatch<{
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    createdAt: string;
    updatedAt: string;
  }>(`/courses/${courseId}`, data);
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    price: c.price,
    imageUrl: c.imageUrl,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
  };
}

export async function deleteCourse(courseId: string): Promise<void> {
  await apiDelete(`/courses/${courseId}`);
}

// ============================================
// Question Bank
// ============================================

export interface VariantConfig {
  topics: string[];
  concepts: string[];
  difficulty: number;
  marks: number;
  variantCount: number;
  baseQuestion?: string;
}

export interface GenerateVariantsPayload {
  documentText?: string;
  configurations: Pick<
    VariantConfigForm,
    | "topics"
    | "concepts"
    | "difficulty"
    | "marks"
    | "variantCount"
    | "baseQuestion"
  >[];
}

export interface EvaluateQuestionPayload {
  question: string;
  answer: string;
  working?: string;
}

export interface EvaluateQuestionResponse {
  isCorrect: boolean;
  feedback: string;
  suggestedImprovement?: string;
}

export async function generateQuestionVariants(
  payload: GenerateVariantsPayload,
): Promise<{ questions: Partial<QuestionBankItem>[] }> {
  return apiPost("/ai/generate-question-variants", payload);
}

export async function saveQuestionBankSet(data: {
  title: string;
  lessonId: string;
  questions: QuestionBankItem[];
  configurations: Pick<
    VariantConfigForm,
    "topics" | "concepts" | "difficulty" | "marks" | "variantCount"
  >[];
}) {
  const row = await apiPost<{
    id: string;
    title: string;
    lessonId: string;
    questions: QuestionBankItem[];
    configurations: VariantConfigForm[];
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;
  }>("/question-bank/sets", data);
  return {
    id: row.id,
    title: row.title,
    lessonId: row.lessonId,
    questions: row.questions,
    configurations: row.configurations,
    createdBy: row.createdBy,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export async function getQuestionBankSets(filters?: {
  lessonId?: string;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.lessonId) params.set("lessonId", filters.lessonId);
  if (filters?.search) params.set("search", filters.search);
  const q = params.toString();
  const rows = await apiGet<
    {
      id: string;
      title: string;
      lessonId: string | null;
      questions: QuestionBankItem[];
      configurations: VariantConfigForm[];
      createdBy: string | null;
      createdAt: string;
      updatedAt: string;
    }[]
  >(`/question-bank/sets${q ? `?${q}` : ""}`);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    lessonId: r.lessonId,
    questions: r.questions,
    configurations: r.configurations,
    createdBy: r.createdBy,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  }));
}

export async function getQuestionBankSet(id: string) {
  const r = await apiGet<{
    id: string;
    title: string;
    lessonId: string | null;
    questions: QuestionBankItem[];
    configurations: VariantConfigForm[];
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;
  }>(`/question-bank/sets/${id}`);
  return {
    id: r.id,
    title: r.title,
    lessonId: r.lessonId,
    questions: r.questions,
    configurations: r.configurations,
    createdBy: r.createdBy,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  };
}

export async function updateQuestionBankSet(
  id: string,
  updates: Partial<QuestionBankSet>,
) {
  const r = await apiPatch<{
    id: string;
    title: string;
    lessonId: string | null;
    questions: QuestionBankItem[];
    configurations: VariantConfigForm[];
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;
  }>(`/question-bank/sets/${id}`, {
    title: updates.title,
    lessonId: updates.lessonId,
    questions: updates.questions as unknown as Json,
  });
  return {
    id: r.id,
    title: r.title,
    lessonId: r.lessonId,
    questions: r.questions,
    configurations: r.configurations,
    createdBy: r.createdBy,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  };
}

export async function deleteQuestionBankSet(id: string): Promise<void> {
  await apiDelete(`/question-bank/sets/${id}`);
}

export interface GenerateQuestionBankResponse {
  questions: Array<{
    question: string;
    answer: string;
    working: string;
    topic: string;
    conceptTested: string;
    marks: number;
    difficulty: number;
  }>;
}

export async function generateQuestionBankFromDocument(payload: {
  content: string;
}): Promise<GenerateQuestionBankResponse> {
  return apiPost("/ai/generate-question-bank", payload);
}

export interface GetQuestionBankItemsFilters {
  lessonId?: string;
  topic?: string;
  concept?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface GetQuestionBankItemsResult {
  items: QuestionBankItemRow[];
  total: number;
}

export async function getQuestionBankItems(filters?: GetQuestionBankItemsFilters) {
  const params = new URLSearchParams();
  if (filters?.lessonId) params.set("lessonId", filters.lessonId);
  if (filters?.topic) params.set("topic", filters.topic);
  if (filters?.concept) params.set("concept", filters.concept);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.pageSize) params.set("pageSize", String(filters.pageSize));
  const q = params.toString();
  const res = await apiGet<{
    items: Array<
      Omit<QuestionBankItemRow, "createdAt" | "updatedAt"> & {
        createdAt: string;
        updatedAt: string;
      }
    >;
    total: number;
  }>(`/question-bank/items${q ? `?${q}` : ""}`);
  return {
    items: res.items.map((i) => ({
      ...i,
      createdAt: new Date(i.createdAt),
      updatedAt: new Date(i.updatedAt),
    })),
    total: res.total,
  };
}

export async function createQuestionBankItems(
  items: GenerateQuestionBankResponse["questions"],
  options?: { lessonId?: string | null; createdBy?: string },
): Promise<QuestionBankItemRow[]> {
  const rows = await apiPost<
    Array<
      Omit<QuestionBankItemRow, "createdAt" | "updatedAt"> & {
        createdAt: string;
        updatedAt: string;
      }
    >
  >("/question-bank/items/bulk", { items, lessonId: options?.lessonId });
  return rows.map((row) => ({
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }));
}

export async function updateQuestionBankItem(
  id: string,
  updates: Partial<Omit<QuestionBankItemRow, "id" | "createdAt" | "createdBy">>,
): Promise<QuestionBankItemRow> {
  const row = await apiPatch<
    Omit<QuestionBankItemRow, "createdAt" | "updatedAt"> & {
      createdAt: string;
      updatedAt: string;
    }
  >(`/question-bank/items/${id}`, updates);
  return {
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export async function deleteQuestionBankItem(id: string): Promise<void> {
  await apiDelete(`/question-bank/items/${id}`);
}

export async function evaluateQuestionQuality(
  payload: EvaluateQuestionPayload,
): Promise<EvaluateQuestionResponse> {
  return apiPost("/ai/evaluate-question-quality", payload);
}

export interface RegenerateQuestionPayload {
  documentText?: string;
  currentQuestion: {
    title?: string;
    answer?: string;
    topic?: string;
    concept?: string;
    difficulty?: number;
    marks?: number;
    working?: string;
    isDirtyFields: Record<string, boolean>;
  };
}

export async function regenerateQuestionVariant(
  payload: RegenerateQuestionPayload,
): Promise<Partial<QuestionBankItem>> {
  return apiPost("/ai/regenerate-question", payload);
}
