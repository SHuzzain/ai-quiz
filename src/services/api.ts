/**
 * API Services
 *
 * Services to interact with Supabase backend.
 */

import {
  User,
  Test,
  Question,
  Lesson,
  TestAttempt,
  QuestionAttempt,
  TestWithQuestions,
  AttemptResult,
  PerformanceMetrics,
  DocumentAnalysis,
  ExtractedQuestionsResult,
  UserRole,
  Course,
  PaginatedResponse,
  OverallAnalytics,
  TestAnalytics,
  ExtractedQuestion,
  FileUpload,
  QuestionBankItem,
  QuestionBankSet,
} from "@/types";

import { supabase } from "@/integrations/supabase/client";
import {
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/integrations/supabase/types";
import { VariantConfigForm } from "@/schemas/questionBank";

// Re-export split domain modules so consumers can import from "@/services/api"
export * from "./api/tests";
export * from "./api/attempts";
export * from "./api/analytics";

// ============================================
// Authentication Services
// ============================================

// Auth is mainly handled by useAuth hook and Supabase Auth directly.
// We provide these helpers for consistency if needed, but they are wrappers.

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpData extends LoginCredentials {
  name: string;
  role: UserRole;
}

/**
 * Login user
 */
export async function loginUser(credentials: LoginCredentials): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) throw error;
  if (!data.user) throw new Error("Login failed");

  return getUserById(data.user.id).then((u) => {
    if (!u) throw new Error("User profile not found");
    return u;
  });
}

/**
 * Signup user
 */
export async function signUpUser(data: SignUpData): Promise<User> {
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name,
        role: data.role,
      },
    },
  });

  if (error) throw error;
  if (!authData.user) throw new Error("Signup failed");

  // Profile creation is typically handled by database triggers in Supabase
  // But we can fetch it to confirm
  return getUserById(authData.user.id).then((u) => {
    // If trigger hasn't run yet, we might need to wait or return a partial user
    if (!u) {
      return {
        id: authData.user!.id,
        email: authData.user!.email!,
        name: data.name,
        role: data.role,
        createdAt: new Date(),
        lastActiveAt: new Date(),
      };
    }
    return u;
  });
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return getUserById(user.id);
}

/**
 * Logout user
 */
export async function logoutUser(): Promise<void> {
  await supabase.auth.signOut();
}

// ============================================
// User Management Services (Admin)
// ============================================
/**
 * Get all users with optional filters
 */
export async function getUsers(filters?: {
  role?: UserRole;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<User>> {
  let query = supabase
    .from("profiles")
    .select(
      filters?.role ? "*, user_roles!inner(role)" : "*, user_roles(role)",
      { count: "exact" },
    );

  // Filter by role if provided
  if (filters?.role) {
    query = query.eq("user_roles.role", filters.role);
  }

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`,
    );
  }

  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  query = query.range(start, end);

  const { data, error, count } = await query;

  if (error) throw error;

  // Type assertion needed because of the joined user_roles
  const profiles = data as unknown as (Tables<"profiles"> & {
    user_roles: { role: UserRole }[] | null;
  })[];

  const users: User[] = profiles.map((profile) => ({
    id: profile.user_id,
    email: profile.email,
    name: profile.name,
    role: profile.user_roles?.[0].role || "student",
    avatarUrl: profile.avatar_url || undefined,
    createdAt: new Date(profile.created_at),
    lastActiveAt: new Date(profile.last_active_at),
  }));

  return {
    data: users,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

/**
 * Get single user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) return null;

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();

  return {
    id: userId,
    email: profile.email,
    name: profile.name,
    role: (roleData?.role as UserRole) || "student", // Cast safety depends on DB constraint
    avatarUrl: profile.avatar_url || undefined,
    createdAt: new Date(profile.created_at),
    lastActiveAt: new Date(profile.last_active_at),
  };
}

/**
 * Update user profile
 */
export async function updateUser(
  userId: string,
  data: { name?: string; avatarUrl?: string },
): Promise<User> {
  const updates: TablesUpdate<"profiles"> = {};
  if (data.name) updates.name = data.name;
  if (data.avatarUrl) updates.avatar_url = data.avatarUrl;

  const { data: updatedProfile, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;

  return getUserById(userId) as Promise<User>;
}

/**
 * Update ANY user (Admin function)
 */
export async function adminUpdateUser(
  userId: string,
  updates: Partial<User>,
): Promise<User> {
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      name: updates.name,
      grade: updates.grade,
      avatar_url: updates.avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (profileError) throw profileError;

  if (updates.role) {
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (existingRole) {
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: updates.role })
        .eq("user_id", userId);
      if (roleError) throw roleError;
    } else {
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: updates.role });
      if (roleError) throw roleError;
    }
  }

  const updatedUser = await getUserById(userId);
  if (!updatedUser) throw new Error("User not found after update");
  return updatedUser;
}

/**
 * Upload avatar image
 */
export async function uploadAvatar(file: File): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Create a unique file name
  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}-${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Analyze document content using AI
 */
export async function analyzeDocument(
  content: string,
  clarificationAnswer?: string,
): Promise<DocumentAnalysis> {
  const { data, error } = await supabase.functions.invoke("analyze-document", {
    body: { content, clarificationAnswer },
  });

  if (error) throw error;
  return data;
}

/**
 * Extract questions from text using AI
 */
export async function extractQuestionsFromText(
  content: string,
  count: number,
  topics?: string[],
): Promise<ExtractedQuestionsResult> {
  const { data, error } = await supabase.functions.invoke("extract-questions", {
    body: { content, count, topics },
  });

  if (error) throw error;
  return data;
}

/**
 * Add question to test
 */
export async function addQuestion(
  testId: string,
  question: Omit<Question, "id" | "testId">,
) {
  const { data: newQuestion, error } = await supabase
    .from("questions")
    .insert({
      test_id: testId,
      question_text: question.questionText,
      correct_answer: question.correctAnswer,
      order: question.order,
      topic: question.topic,
      concept: question.concept,
      mark: question.mark,
      difficulty: question.difficulty,
      working: question.working,
      difficultyReason: question.difficultyReason,
      hints: question.hints,
      micro_learning: question.microLearning,
    })
    .select()
    .single();

  if (error) throw error;

  // Update question count in test
  // (Ideally done via trigger, but manual update here for safety)
  // await supabase.rpc('increment_question_count', { test_id: testId });

  return {
    id: newQuestion.id,
    testId: newQuestion.test_id,
    questionText: newQuestion.question_text,
    correctAnswer: newQuestion.correct_answer,
    order: newQuestion.order,
    topic: newQuestion.topic,
    concept: newQuestion.concept,
    mark: newQuestion.mark,
    difficulty: newQuestion.difficulty,
    working: newQuestion.working,
    difficultyReason: newQuestion.difficultyReason,
    hints: newQuestion.hints,
    microLearning: newQuestion.micro_learning,
  };
}

/**
 * Update question
 */
export async function updateQuestion(
  questionId: string,
  data: Partial<Question>,
): Promise<Question> {
  // Cleaner manual assignment to avoid TS issues with partial updates on strict types
  const finalUpdates: TablesUpdate<"questions"> = {};
  if (data.questionText !== undefined)
    finalUpdates.question_text = data.questionText;
  if (data.correctAnswer !== undefined)
    finalUpdates.correct_answer = data.correctAnswer;
  if (data.hints !== undefined) finalUpdates.hints = data.hints;
  if (data.microLearning !== undefined)
    finalUpdates.micro_learning = data.microLearning;
  if (data.order !== undefined) finalUpdates.order = data.order;
  if (data.topic !== undefined) finalUpdates.topic = data.topic;
  if (data.concept !== undefined) finalUpdates.concept = data.concept;
  if (data.difficulty !== undefined) finalUpdates.difficulty = data.difficulty;
  if (data.mark !== undefined) finalUpdates.mark = data.mark;
  if (data.working !== undefined) finalUpdates.working = data.working;
  if (data.difficultyReason !== undefined)
    finalUpdates.difficultyReason = data.difficultyReason;

  const { data: updatedQuestion, error } = await supabase
    .from("questions")
    .update(finalUpdates)
    .eq("id", questionId)
    .select()
    .single();

  if (error) throw error;

  return {
    id: updatedQuestion.id,
    testId: updatedQuestion.test_id,
    questionText: updatedQuestion.question_text,
    correctAnswer: updatedQuestion.correct_answer,
    hints: updatedQuestion.hints,
    microLearning: updatedQuestion.micro_learning,
    order: updatedQuestion.order,
    concept: updatedQuestion.concept,
    topic: updatedQuestion.topic,
    difficulty: updatedQuestion.difficulty,
    mark: updatedQuestion.mark,
    working: updatedQuestion.working,
    difficultyReason: updatedQuestion.difficultyReason,
    maxAttemptsBeforeStudy: updatedQuestion.max_attempts_before_study,
  };
}

/**
 * Delete question
 */
export async function deleteQuestion(questionId: string): Promise<void> {
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", questionId);
  if (error) throw error;
}

/**
 * AI-guess answer for a question
 */
export async function guessAnswer(questionText: string): Promise<string> {
  // Mock for now
  return "AI Answer";
}

// ============================================
// Lesson Management Services
// ============================================

/**
 * Get all lessons
 */
export async function getLessons(): Promise<Lesson[]> {
  const { data, error } = await supabase.from("lessons").select("*");
  if (error) throw error;

  return data.map((l) => ({
    id: l.id,
    title: l.title,
    description: l.description || "",
    files:
      (l.files as unknown as { name: string; url: string; type: string }[]) ||
      [],
    uploadedAt: new Date(l.uploaded_at || new Date()),
    uploadedBy: l.uploaded_by,
  }));
}

/**
 * Get signle lessons
 */
export async function getLesson(lessonId: string) {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .single();
  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    description: data.description || "",
    files:
      (data.files as unknown as {
        name: string;
        url: string;
        type: string;
      }[]) || [],
    uploadedAt: new Date(data.uploaded_at || new Date()),
    uploadedBy: data.uploaded_by,
  };
}

/**
 * Upload lesson file
 */
export async function uploadLesson(data: {
  title: string;
  description?: string;
  files: File[];
}): Promise<Lesson> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (data.files.length > 3) throw new Error("Max 3 files allowed");

  const uploadedFiles: { name: string; url: string; type: string }[] = [];

  for (const file of data.files) {
    const fileName = `${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("lessons")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from("lessons")
      .getPublicUrl(fileName);

    uploadedFiles.push({
      name: file.name,
      url: publicUrlData.publicUrl,
      type: file.type,
    });
  }

  const { data: lesson, error: dbError } = await supabase
    .from("lessons")
    .insert({
      title: data.title,
      description: data.description,
      files: uploadedFiles,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (dbError) throw dbError;

  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description || "",
    files:
      (lesson.files as unknown as {
        name: string;
        url: string;
        type: string;
      }[]) || [],
    uploadedAt: new Date(lesson.uploaded_at || new Date()),
    uploadedBy: lesson.uploaded_by,
  };
}

/**
 * Delete lesson
 */
export async function deleteLesson(lessonId: string): Promise<void> {
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) throw error;
}

// Attempts: getStudentAttempts, getTestAttempt, getAttemptDetails, etc. → see ./api/attempts



// ============================================
// Course Management Services
// ============================================

/**
 * Get all courses
 */
export async function getCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    price: Number(c.price),
    imageUrl: c.image_url,
    createdAt: new Date(c.created_at),
    updatedAt: new Date(c.updated_at),
  }));
}

/**
 * Get single course by ID
 */
export async function getCourse(courseId: string): Promise<Course | null> {
  const { data: c, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  if (error) return null;

  return {
    id: c.id,
    name: c.name,
    description: c.description,
    price: Number(c.price),
    imageUrl: c.image_url,
    createdAt: new Date(c.created_at),
    updatedAt: new Date(c.updated_at),
  };
}

/**
 * Create a new course
 */
export async function createCourse(data: {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}): Promise<Course> {
  const { data: newCourse, error } = await supabase
    .from("courses")
    .insert({
      name: data.name,
      description: data.description,
      price: data.price,
      image_url: data.imageUrl,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: newCourse.id,
    name: newCourse.name,
    description: newCourse.description,
    price: Number(newCourse.price),
    imageUrl: newCourse.image_url,
    createdAt: new Date(newCourse.created_at),
    updatedAt: new Date(newCourse.updated_at),
  };
}

/**
 * Update course
 */
export async function updateCourse(
  courseId: string,
  data: Partial<Omit<Course, "id" | "createdAt" | "updatedAt">>,
): Promise<Course> {
  const updates: TablesUpdate<"courses"> = {};
  if (data.name) updates.name = data.name;
  if (data.description) updates.description = data.description;
  if (data.price !== undefined) updates.price = data.price;
  if (data.imageUrl) updates.image_url = data.imageUrl;

  const { data: updatedCourse, error } = await supabase
    .from("courses")
    .update(updates)
    .eq("id", courseId)
    .select()
    .single();

  if (error) throw error;

  return {
    id: updatedCourse.id,
    name: updatedCourse.name,
    description: updatedCourse.description,
    price: Number(updatedCourse.price),
    imageUrl: updatedCourse.image_url,
    createdAt: new Date(updatedCourse.created_at),
    updatedAt: new Date(updatedCourse.updated_at),
  };
}

/**
 * Delete course
 */
export async function deleteCourse(courseId: string): Promise<void> {
  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) throw error;
}

// Performance metrics & analytics: getStudentPerformance, getOverallAnalytics, calculateAndSaveMetrics, etc. → see ./api/analytics

// ============================================
// Question Bank Services
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

/**
 * Generate question variants from context
 */
export async function generateQuestionVariants(
  payload: GenerateVariantsPayload,
): Promise<{ questions: Partial<QuestionBankItem>[] }> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "generate-question-variants",
      {
        body: payload,
      },
    );

    if (error) {
      console.error("Generate variants edge function error:", error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error("Failed to generate question variants", err);
    throw err;
  }
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

/**
 * Save a set of questions to the bank
 */
export async function saveQuestionBankSet(data: {
  title: string;
  lessonId: string;
  questions: QuestionBankItem[];
  configurations: Pick<
    VariantConfigForm,
    "topics" | "concepts" | "difficulty" | "marks" | "variantCount"
  >[];
}) {
  const userResponse = await supabase.auth.getUser();
  const user = userResponse.data.user;

  if (!user) {
    throw new Error("You must be logged in to save questions to the bank");
  }

  const { data: qSet, error } = await supabase
    .from("question_bank")
    .insert({
      title: data.title,
      lesson_id: data.lessonId,
      questions: data.questions as unknown as Json,
      configurations: data.configurations as unknown as Pick<
        VariantConfigForm,
        "topics" | "concepts" | "difficulty" | "marks" | "variantCount"
      >[],
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: qSet.id,
    title: qSet.title,
    lessonId: qSet.lesson_id,
    questions: qSet.questions as unknown as QuestionBankItem[],
    configurations: qSet.configurations as unknown as VariantConfigForm[],
    createdBy: qSet.created_by,
    createdAt: new Date(qSet.created_at || new Date()),
    updatedAt: new Date(qSet.updated_at || new Date()),
  };
}

/**
 * Get item sets from the Question Bank
 */
export async function getQuestionBankSets(filters?: {
  lessonId?: string;
  search?: string;
}) {
  let query = supabase.from("question_bank").select("*");

  if (filters?.lessonId) {
    query = query.eq("lesson_id", filters.lessonId);
  }

  if (filters?.search) {
    query = query.ilike("title", `%${filters.search}%`);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;

  return data.map((q) => ({
    id: q.id,
    title: q.title,
    lessonId: q.lesson_id,
    questions: q.questions as unknown as QuestionBankItem[],
    configurations: q.configurations as unknown as VariantConfigForm[],
    createdBy: q.created_by,
    createdAt: new Date(q.created_at),
    updatedAt: new Date(q.updated_at),
  }));
}

/**
 * Get a single question bank set by ID
 */
export async function getQuestionBankSet(id: string) {
  const { data: qSet, error } = await supabase
    .from("question_bank")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return {
    id: qSet.id,
    title: qSet.title,
    lessonId: qSet.lesson_id,
    questions: qSet.questions as unknown as QuestionBankItem[],
    configurations: qSet.configurations as unknown as VariantConfigForm[],
    createdBy: qSet.created_by,
    createdAt: new Date(qSet.created_at || new Date()),
    updatedAt: new Date(qSet.updated_at || new Date()),
  };
}

/**
 * Update a specific question bank set
 */
export async function updateQuestionBankSet(
  id: string,
  updates: Partial<QuestionBankSet>,
) {
  const payload: TablesUpdate<"question_bank"> = {};
  if (updates.title) payload.title = updates.title;
  if (updates.lessonId !== undefined) payload.lesson_id = updates.lessonId;
  if (updates.questions)
    payload.questions = updates.questions as unknown as Json;

  const { data: qSet, error } = await supabase
    .from("question_bank")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: qSet.id,
    title: qSet.title,
    lessonId: qSet.lesson_id,
    questions: qSet.questions as unknown as QuestionBankItem[],
    configurations: qSet.configurations as unknown as VariantConfigForm[],
    createdBy: qSet.created_by,
    createdAt: new Date(qSet.created_at || new Date()),
    updatedAt: new Date(qSet.updated_at || new Date()),
  };
}

/**
 * Delete a specific set from the Question Bank
 */
export async function deleteQuestionBankSet(id: string): Promise<void> {
  const { error } = await supabase.from("question_bank").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Checks a specific question's quality using the AI evaluate Edge Function.
 */
export async function evaluateQuestionQuality(
  payload: EvaluateQuestionPayload,
): Promise<EvaluateQuestionResponse> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "evaluate-question-quality",
      {
        body: payload,
      },
    );

    if (error) {
      console.error("Evaluate question edge function error:", error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error("Failed to evaluate question quality", err);
    throw err;
  }
}

/**
 * Regenerates a specific question variant via AI.
 */
export async function regenerateQuestionVariant(
  payload: RegenerateQuestionPayload,
): Promise<Partial<QuestionBankItem>> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "regenerate-question",
      {
        body: payload,
      },
    );

    if (error) {
      console.error("Regenerate question edge function error:", error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error("Failed to regenerate question variant", err);
    throw err;
  }
}
