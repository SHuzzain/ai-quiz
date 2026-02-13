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
} from "@/types";

import { supabase } from "@/integrations/supabase/client";
import {
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/integrations/supabase/types";

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
    .select("*, user_roles(role)", { count: "exact" });

  // Note: Filtering by role requires joining user_roles which is complex in simple queries
  // For now we'll fetch profiles and their roles.
  // Ideally, create a view 'users_with_roles' in Supabase for easier filtering.

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
    user_roles: { role: string } | null;
  })[];

  const users: User[] = profiles.map((profile) => ({
    id: profile.user_id,
    email: profile.email,
    name: profile.name,
    role: (profile.user_roles?.role as UserRole) || "student",
    avatarUrl: profile.avatar_url || undefined,
    createdAt: new Date(profile.created_at),
    lastActiveAt: new Date(profile.last_active_at),
  }));

  // Client-side role filter if needed (or prefer server-side view)
  const finalUsers = filters?.role
    ? users.filter((u) => u.role === filters.role)
    : users;

  return {
    data: finalUsers,
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

// ============================================
// Test Management Services
// ============================================

/**
 * Get all tests
 */
export async function getTests(filters?: {
  status?: Test["status"];
  search?: string;
}): Promise<Test[]> {
  let query = supabase.from("tests").select("*");

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.search) {
    query = query.ilike("title", `%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data.map((test) => ({
    id: test.id,
    title: test.title,
    description: test.description,
    status: test.status as Test["status"],
    scheduledDate: new Date(test.scheduled_date),
    duration: test.duration,
    createdAt: new Date(test.created_at),
    createdBy: test.created_by,
    lessonId: test.lesson_id || undefined,
    questionCount: test.question_count,
  }));
}

/**
 * Get single test with questions
 */
export async function getTestWithQuestions(
  testId: string,
): Promise<TestWithQuestions | null> {
  const { data: test, error: testError } = await supabase
    .from("tests")
    .select("*")
    .eq("id", testId)
    .single();

  if (testError || !test) return null;

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("*")
    .eq("test_id", testId)
    .order("order", { ascending: true });

  if (questionsError) throw questionsError;

  return {
    id: test.id,
    title: test.title,
    description: test.description,
    status: test.status as Test["status"],
    scheduledDate: new Date(test.scheduled_date),
    duration: test.duration,
    createdAt: new Date(test.created_at),
    createdBy: test.created_by,
    lessonId: test.lesson_id || undefined,
    questionCount: test.question_count,
    questions: questions.map((q) => ({
      id: q.id,
      testId: q.test_id,
      questionText: q.question_text,
      correctAnswer: q.correct_answer,
      hints: q.hints,
      microLearning: q.micro_learning,
      order: q.order,
    })),
  };
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: newTest, error } = await supabase
    .from("tests")
    .insert({
      title: data.title,
      description: data.description,
      scheduled_date: data.scheduledDate.toISOString(),
      duration: data.duration,
      lesson_id: data.lessonId,
      created_by: user.id,
      status: "draft",
      question_count: 0,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: newTest.id,
    title: newTest.title,
    description: newTest.description,
    status: newTest.status as Test["status"],
    scheduledDate: new Date(newTest.scheduled_date),
    duration: newTest.duration,
    createdAt: new Date(newTest.created_at),
    createdBy: newTest.created_by,
    lessonId: newTest.lesson_id || undefined,
    questionCount: newTest.question_count,
  };
}

/**
 * Update test
 */
export async function updateTest(
  testId: string,
  data: Partial<Test>,
): Promise<Test> {
  const updates: TablesUpdate<"tests"> = {};

  if (data.title) updates.title = data.title;
  if (data.description) updates.description = data.description;
  if (data.scheduledDate)
    updates.scheduled_date = data.scheduledDate.toISOString();
  if (data.duration) updates.duration = data.duration;
  if (data.status) updates.status = data.status;
  if (data.lessonId) updates.lesson_id = data.lessonId;

  const { data: updatedTest, error } = await supabase
    .from("tests")
    .update(updates)
    .eq("id", testId)
    .select()
    .single();

  if (error) throw error;

  return {
    id: updatedTest.id,
    title: updatedTest.title,
    description: updatedTest.description,
    status: updatedTest.status as Test["status"],
    scheduledDate: new Date(updatedTest.scheduled_date),
    duration: updatedTest.duration,
    createdAt: new Date(updatedTest.created_at),
    createdBy: updatedTest.created_by,
    lessonId: updatedTest.lesson_id || undefined,
    questionCount: updatedTest.question_count,
  };
}

/**
 * Delete test
 */
export async function deleteTest(testId: string): Promise<void> {
  const { error } = await supabase.from("tests").delete().eq("id", testId);
  if (error) throw error;
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

// ============================================
// Test Attempt Services (Student)
// ============================================

/**
 * Get upcoming tests for student
 */
export async function getUpcomingTests(studentId: string): Promise<Test[]> {
  const { data, error } = await supabase
    .from("tests")
    .select("*")
    .or("status.eq.active,status.eq.scheduled")
    .limit(2);

  if (error) throw error;

  return data.map((test) => ({
    id: test.id,
    title: test.title,
    description: test.description,
    status: test.status as Test["status"],
    scheduledDate: new Date(test.scheduled_date),
    duration: test.duration,
    createdAt: new Date(test.created_at),
    createdBy: test.created_by,
    lessonId: test.lesson_id || undefined,
    questionCount: test.question_count,
  }));
}

/**
 * Get student's past attempts
 */
export async function getStudentAttempts(
  studentId: string,
): Promise<(TestAttempt & { testTitle?: string })[]> {
  const { data, error } = await supabase
    .from("test_attempts")
    .select("*, tests(title)")
    .eq("student_id", studentId)
    .order("started_at", { ascending: false });

  if (error) throw error;

  return data.map((a) => ({
    id: a.id,
    studentId: a.student_id,
    testId: a.test_id,
    testTitle: a.tests?.title, // Include the joined title
    startedAt: new Date(a.started_at),
    completedAt: a.completed_at ? new Date(a.completed_at) : undefined,
    status: a.status as TestAttempt["status"],
    totalQuestions: a.total_questions,
    correctAnswers: a.correct_answers,
    hintsUsed: a.hints_used,
    timeTakenSeconds: a.time_taken_seconds || 0,
    score: a.score || 0,
    basicScore: Number(a.basic_score) || undefined,
    aiScore: Number(a.ai_score) || undefined,
    learningEngagementRate: Number(a.learning_engagement_rate) || undefined,
    averageTimePerQuestion: Number(a.average_time_per_question) || undefined,
    firstAttemptSuccessRate: Number(a.first_attempt_success_rate) || undefined,
    hintDependencyRate: Number(a.hint_dependency_rate) || undefined,
    persistenceScore: Number(a.persistence_score) || undefined,
    confidenceIndicator: Number(a.confidence_indicator) || undefined,
    forcedStudyBreaks: a.forced_study_breaks || 0,
    masteryAchieved: a.mastery_achieved || false,
    questionsRequiringStudy: a.questions_requiring_study || 0,
  }));
}

/**
 * Get single test attempt by ID
 */
export async function getTestAttempt(
  attemptId: string,
): Promise<TestAttempt | null> {
  const { data: attempt, error } = await supabase
    .from("test_attempts")
    .select("*")
    .eq("id", attemptId)
    .single();

  if (error) return null;

  return {
    id: attempt.id,
    studentId: attempt.student_id,
    testId: attempt.test_id,
    startedAt: new Date(attempt.started_at),
    completedAt: attempt.completed_at
      ? new Date(attempt.completed_at)
      : undefined,
    status: attempt.status as TestAttempt["status"],
    totalQuestions: attempt.total_questions,
    correctAnswers: attempt.correct_answers,
    hintsUsed: attempt.hints_used,
    timeTakenSeconds: attempt.time_taken_seconds || 0,
    score: attempt.score || 0,
    basicScore: Number(attempt.basic_score) || undefined,
    aiScore: Number(attempt.ai_score) || undefined,
  };
}

/**
 * Get detailed attempt result with question breakdown
 */
export async function getAttemptDetails(attemptId: string) {
  // 1. Get the attempt
  const { data: attempt, error: attemptError } = await supabase
    .from("test_attempts")
    .select("*")
    .eq("id", attemptId)
    .single();

  if (attemptError || !attempt) return null;

  // 2. Get the test details
  const { data: test, error: testError } = await supabase
    .from("tests")
    .select("*")
    .eq("id", attempt.test_id)
    .single();

  if (testError || !test) throw testError;

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("*")
    .eq("test_id", attempt.test_id)
    .order("order", { ascending: true });

  if (questionsError) throw questionsError;

  // 3. Get question attempts
  const { data: questionAttempts, error: qaError } = await supabase
    .from("question_attempts")
    .select("*")
    .eq("attempt_id", attemptId);

  if (qaError) throw qaError;

  // Map to types
  const mappedAttempt = {
    id: attempt.id,
    studentId: attempt.student_id,
    testId: attempt.test_id,
    startedAt: new Date(attempt.started_at),
    completedAt: attempt.completed_at
      ? new Date(attempt.completed_at)
      : undefined,
    status: attempt.status,
    totalQuestions: attempt.total_questions,
    correctAnswers: attempt.correct_answers,
    hintsUsed:
      questionAttempts?.reduce(
        (acc, qa) => acc + (qa.generated_hints?.length || 0),
        0,
      ) || 0,
    timeTakenSeconds: attempt.time_taken_seconds || 0,
    score: attempt.score || 0,
    basicScore: Number(attempt.basic_score) || undefined,
    aiScore: Number(attempt.ai_score) || undefined,
    masteryAchieved: attempt.mastery_achieved || false,
    learningEngagementRate: attempt.learning_engagement_rate || 0,
    persistenceScore: attempt.persistence_score,
  };

  const mappedTest = {
    id: test.id,
    title: test.title,
    description: test.description,
    status: test.status as Test["status"],
    scheduledDate: new Date(test.scheduled_date),
    duration: test.duration,
    createdAt: new Date(test.created_at),
    createdBy: test.created_by,
    lessonId: test.lesson_id || undefined,
    questionCount: test.question_count,
    questions: questions.map((q) => ({
      id: q.id,
      testId: q.test_id,
      questionText: q.question_text,
      correctAnswer: q.correct_answer,
      order: q.order,
    })),
  };

  const mappedQuestionAttempts = questionAttempts.map((qa) => ({
    id: qa.id,
    attemptId: qa.attempt_id,
    questionId: qa.question_id,
    studentAnswer: qa.student_answer,
    isCorrect: qa.is_correct,
    attemptsCount: 1, // Basic schema might not track count yet
    hintsUsed: qa.hints_used || 0,
    viewedMicroLearning: qa.micro_learning_viewed || false,
    timeTakenSeconds: qa.time_taken_seconds || 0,
    answeredAt: new Date(qa.answered_at),
    aiScore: qa.ai_score,
    aiFeedback: qa.ai_feedback,
    generatedHints: qa.generated_hints,
    usedNoHints: qa.used_no_hints,
    microLearningContent: qa.micro_learning_content,
    answeredOnFirstAttempt: qa.answered_on_first_attempt || false,
    studyMaterialDownloaded: qa.study_material_downloaded || false,
  }));

  return {
    attempt: mappedAttempt,
    test: mappedTest,
    questionResults: mappedQuestionAttempts,
  };
}

/**
 * Start a test attempt (or resume existing one)
 */
export async function startTestAttempt(
  testId: string,
  studentId: string,
): Promise<TestAttempt> {
  // 1. Check for existing in_progress attempt
  const { data: existingAttempt } = await supabase
    .from("test_attempts")
    .select("*")
    .eq("test_id", testId)
    .eq("student_id", studentId)
    .eq("status", "in_progress")
    .maybeSingle();

  if (existingAttempt) {
    return {
      id: existingAttempt.id,
      studentId: existingAttempt.student_id,
      testId: existingAttempt.test_id,
      startedAt: new Date(existingAttempt.started_at),
      status: existingAttempt.status as TestAttempt["status"],
      totalQuestions: existingAttempt.total_questions,
      correctAnswers: existingAttempt.correct_answers,
      hintsUsed: existingAttempt.hints_used,
      completedAt: existingAttempt.completed_at
        ? new Date(existingAttempt.completed_at)
        : undefined,
      timeTakenSeconds: existingAttempt.time_taken_seconds || 0,
      score: existingAttempt.score || 0,
      basicScore: Number(existingAttempt.basic_score) || undefined,
      aiScore: Number(existingAttempt.ai_score) || undefined,
    };
  }

  // 2. Create new attempt if none exists
  const { data: test } = await supabase
    .from("tests")
    .select("question_count")
    .eq("id", testId)
    .single();

  const { data: attempt, error } = await supabase
    .from("test_attempts")
    .insert({
      test_id: testId,
      student_id: studentId,
      status: "in_progress",
      total_questions: test?.question_count || 0,
      correct_answers: 0,
      hints_used: 0,
    })
    .select()
    .single();

  if (error) throw error;

  // Trigger async metrics calculation (fire and forget, or await if critical)
  // We await it to ensure data is consistent when user lands on results page
  if (attempt) {
    try {
      await calculateAndSaveMetrics(attempt.student_id, attempt.test_id);
    } catch (metricError) {
      console.error("Failed to update performance metrics:", metricError);
      // Don't throw, let the attempt completion succeed
    }
  }

  return {
    id: attempt.id,
    studentId: attempt.student_id,
    testId: attempt.test_id,
    startedAt: new Date(attempt.started_at),
    status: attempt.status as TestAttempt["status"],
    totalQuestions: attempt.total_questions,
    correctAnswers: attempt.correct_answers,
    hintsUsed: attempt.hints_used,
    completedAt: attempt.completed_at
      ? new Date(attempt.completed_at)
      : undefined,
    timeTakenSeconds: attempt.time_taken_seconds || 0,
    score: attempt.score || 0,
    basicScore: Number(attempt.basic_score) || undefined,
    aiScore: Number(attempt.ai_score) || undefined,
  };
}

/**
 * Submit answer for a question
 */
/**
 * Submit answer for a question
 */
export async function submitAnswer(data: {
  attemptId: string;
  questionId: string;
  answer: string;
  timeTaken?: number;
  attemptsCount?: number;
  hintsUsed?: number;
  viewedMicroLearning?: boolean;
}): Promise<{
  isCorrect: boolean;
  correctAnswer: string;
  feedback?: string;
  score?: number;
}> {
  // Check correctness
  const { data: question } = await supabase
    .from("questions")
    .select("question_text, correct_answer")
    .eq("id", data.questionId)
    .single();

  if (!question) throw new Error("Question not found");

  // 1. Strict String Check
  let isCorrect =
    data.answer.toLowerCase().trim() ===
    question.correct_answer.toLowerCase().trim();

  let feedback = isCorrect ? "Correct!" : undefined;
  // If strictly correct, score is 100. If not, 0 (pending AI).
  let score = isCorrect ? 100 : 0;
  let aiScore: number | undefined = isCorrect ? 100 : undefined;

  // 2. AI Fallback for close answers
  if (!isCorrect && data.answer.trim().length > 0) {
    try {
      const { data: evaluation, error: aiError } =
        await supabase.functions.invoke("evaluate-answer", {
          body: {
            questionText: question.question_text,
            correctAnswer: question.correct_answer,
            studentAnswer: data.answer,
          },
        });

      if (!aiError && evaluation) {
        // AI Logic:
        // 1. Trust AI ONLY if it explicitly says isCorrect=true
        if (evaluation.isCorrect === true) {
          isCorrect = true;
          score = 100;
        }

        // 2. Capture the AI's partial score/feedback
        aiScore = evaluation.score;
        feedback = evaluation.feedback;
      } else {
        console.warn("AI Evaluation failed or returned empty", aiError);
      }
    } catch (err) {
      console.error("Failed to call evaluate-answer:", err);
    }
  }

  // 3. Handle Attempt History & Best Score Calculation

  // Fetch existing attempt history first
  const { data: existingAttempt } = await supabase
    .from("question_attempts")
    .select("attempt_history, ai_score")
    .eq("attempt_id", data.attemptId)
    .eq("question_id", data.questionId)
    .maybeSingle();

  interface AttemptHistoryItem {
    answer: string;
    isCorrect: boolean;
    aiScore?: number;
    feedback?: string;
    timestamp: string;
  }

  let history: Json[] = [];
  if (
    existingAttempt?.attempt_history &&
    Array.isArray(existingAttempt.attempt_history)
  ) {
    history = existingAttempt.attempt_history;
  }

  // Append new attempt
  const newHistoryItem = {
    answer: data.answer,
    isCorrect,
    aiScore,
    feedback,
    timestamp: new Date().toISOString(),
  };
  history.push(newHistoryItem);

  // Calculate BEST AI Score from history
  // "Calculate all the scenario": If user got 70 before, and now gets 100 (or vice versa),
  // we want to store the BEST score achieved so far as the 'ai_score' for the question context.
  // Note: 'score' (the strict one) tracks current status, 'ai_score' can track potential/best effort.

  const allAiScores = history
    .map((h) =>
      typeof h === "object" && h !== null && "aiScore" in h
        ? h.aiScore
        : undefined,
    )
    .filter((s): s is number => typeof s === "number");

  // Current max score from history (including current attempt)
  const bestAiScore =
    allAiScores.length > 0 ? Math.max(...allAiScores) : aiScore;

  // Record attempt with history and best AI score
  await supabase.from("question_attempts").upsert(
    {
      attempt_id: data.attemptId,
      question_id: data.questionId,
      student_answer: data.answer,
      is_correct: isCorrect, // Strict correctness of CURRENT attempt
      answered_at: new Date().toISOString(),
      time_taken_seconds: data.timeTaken || 0,
      attempts_count: data.attemptsCount || 1,
      hints_used: data.hintsUsed || 0,
      micro_learning_viewed: data.viewedMicroLearning || false,
      ai_feedback: feedback,
      ai_score: bestAiScore, // Persist the BEST score achieve across attempts
      attempt_history: history, // Save full history
      answered_on_first_attempt: isCorrect && data.attemptsCount === 1,
      used_no_hints: (data.hintsUsed || 0) === 0,
      showed_persistence: isCorrect && (data.attemptsCount || 1) > 1,
    },
    { onConflict: "attempt_id, question_id" },
  );

  return { isCorrect, correctAnswer: question.correct_answer, feedback, score };
}

/**
 * Use a hint (with AI fallback)
 */
export async function useHint(
  attemptId: string,
  questionId: string,
  hintIndex: number,
  studentAnswer?: string, // Optional: pass wrong answer for better hints
): Promise<string> {
  // 1. Fetch static hints
  const { data: question } = await supabase
    .from("questions")
    .select("questionText:question_text, correctAnswer:correct_answer, hints")
    .eq("id", questionId)
    .single();

  if (!question) throw new Error("Question not found");

  const staticHints = question.hints || [];

  // 2. If static hint exists at this index, return it
  if (hintIndex < staticHints.length) {
    return staticHints[hintIndex];
  }

  // 3. Check for existing generated hint in question_attempts
  const generatedIndex = hintIndex - staticHints.length;

  const { data: qAttempt } = await supabase
    .from("question_attempts")
    .select("generated_hints")
    .eq("attempt_id", attemptId)
    .eq("question_id", questionId)
    .maybeSingle();

  const generatedHints = qAttempt?.generated_hints || [];

  if (generatedHints[generatedIndex]) {
    return generatedHints[generatedIndex];
  }

  // 4. Generate new AI hint (via Supabase Edge Function)
  try {
    const { data: generatedData, error: funcError } =
      await supabase.functions.invoke("generate-hint", {
        body: {
          questionText: question.questionText,
          correctAnswer: question.correctAnswer,
          studentAnswer: studentAnswer,
        },
      });

    if (funcError) throw funcError;
    const newHint = generatedData.hint;

    // 5. Store generated hint
    const updatedHints = [...generatedHints, newHint];

    // Upsert question_attempt to ensure it exists
    const { error: upsertError } = await supabase
      .from("question_attempts")
      .upsert(
        {
          attempt_id: attemptId,
          question_id: questionId,
          generated_hints: updatedHints,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "attempt_id, question_id" },
      ); // Assuming composite key or unique constraint

    if (upsertError) {
      console.error("Failed to store generated hint", upsertError);
      // Continue anyway to show the hint
    }

    return newHint;
  } catch (err) {
    console.error("AI Hint Generation failed:", err);
    return "Think about the logic carefully! You can do it!"; // Fallback
  }
}

/**
 * Get micro learning content (with AI fallback)
 */
export async function getMicroLearning(
  questionId: string,
  attemptId?: string,
): Promise<string> {
  // 1. Fetch static content
  const { data: question } = await supabase
    .from("questions")
    .select(
      "questionText:question_text, correctAnswer:correct_answer, micro_learning",
    )
    .eq("id", questionId)
    .single();

  if (!question) return "";

  if (question.micro_learning && question.micro_learning.trim() !== "") {
    return question.micro_learning;
  }

  // 2. If no static content, try to find generated content
  if (attemptId) {
    const { data: qAttempt } = await supabase
      .from("question_attempts")
      .select("micro_learning_content")
      .eq("attempt_id", attemptId)
      .eq("question_id", questionId)
      .maybeSingle();

    if (qAttempt?.micro_learning_content) {
      return qAttempt.micro_learning_content;
    }

    // 3. Generate new AI content (via Supabase Edge Function)
    try {
      const { data: generatedData, error: funcError } =
        await supabase.functions.invoke("generate-micro-learning", {
          body: {
            questionText: question.questionText,
            correctAnswer: question.correctAnswer,
          },
        });

      if (funcError) throw funcError;
      const newContent = generatedData.content;

      // 4. Store generated content
      const { error: upsertError } = await supabase
        .from("question_attempts")
        .upsert(
          {
            attempt_id: attemptId,
            question_id: questionId,
            micro_learning_content: newContent,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "attempt_id, question_id" },
        );

      if (upsertError) {
        console.error("Failed to store micro-learning", upsertError);
      }

      return newContent;
    } catch (err) {
      console.error("AI Micro-learning Generation failed:", err);
      return "Learning is fun! Keep exploring this topic."; // Fallback
    }
  }

  return "";
}

/**
 * Track study material download
 */
export async function trackStudyMaterialDownload(
  attemptId: string,
  questionId: string,
): Promise<void> {
  const { error } = await supabase.from("question_attempts").upsert(
    {
      attempt_id: attemptId,
      question_id: questionId,
      study_material_downloaded: true,
      downloaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "attempt_id, question_id" },
  );

  if (error) {
    console.error("Failed to track study material download", error);
    // Don't throw, just log
  }
}

/**
 * Complete test attempt
 */
export async function completeAttempt(
  attemptId: string,
  metrics?: Partial<TestAttempt>,
): Promise<AttemptResult> {
  // 1. Fetch validity data: Attempt existence and Test details (question count)
  const { data: attemptData, error: attemptError } = await supabase
    .from("test_attempts")
    .select("test_id, student_id")
    .eq("id", attemptId)
    .single();

  if (attemptError || !attemptData)
    throw attemptError || new Error("Attempt not found");

  const { data: testData, error: testError } = await supabase
    .from("tests")
    .select("question_count")
    .eq("id", attemptData.test_id)
    .single();

  if (testError || !testData) throw testError || new Error("Test not found");

  // 2. Count ACTUAL correct answers & Aggregate Metrics from the database (Source of Truth)
  const { data: qAttempts, error: countError } = await supabase
    .from("question_attempts")
    .select("*")
    .eq("attempt_id", attemptId);

  if (countError) throw countError;

  const correctCount = qAttempts.filter((qa) => qa.is_correct).length;

  // Robust Aggregation & Advanced Scoring
  let totalWeightedScore = 0;
  const totalQuestions = testData.question_count || 0;
  const safeTotal = totalQuestions > 0 ? totalQuestions : 1;

  const totalHintsUsed = qAttempts.reduce((sum, qa) => {
    // Scoring Logic per Question
    let qScore = 0;
    if (qa.is_correct) {
      qScore = 100;
    } else if (qa.ai_score) {
      qScore = Number(qa.ai_score);
    }

    // Penalties
    let penalty = 0;

    // 1. Hint Penalty (-10 per hint)
    const hints = qa.hints_used || 0;
    penalty += hints * 10;

    // 2. Micro-Learning Penalty (-20 if viewed)
    if (qa.micro_learning_viewed) {
      penalty += 20;
    }

    // 3. Study Material Download Penalty (-20 if downloaded)
    // Note: 'study_material_downloaded' needs to be added to QuestionAttempt type if not present,
    // or accessed as 'any' if type is not updated yet.
    // Assuming backend returns it in select *
    if (qa.study_material_downloaded) {
      penalty += 20;
    }

    qScore = Math.max(0, qScore - penalty); // Floor at 0

    totalWeightedScore += qScore;
    return sum + hints;
  }, 0);

  const microLearningCount = qAttempts.filter(
    (qa) => qa.micro_learning_viewed,
  ).length;

  // Calculate Learning Engagement Rate (Questions with hints OR micro-learning / Total Answered)
  const engagedQuestionsCount = qAttempts.filter(
    (qa) => (qa.hints_used || 0) > 0 || qa.micro_learning_viewed,
  ).length;
  const learningEngagementRate =
    qAttempts.length > 0
      ? Math.round((engagedQuestionsCount / qAttempts.length) * 100)
      : 0;

  // --- NEW BEHAVIORAL METRICS ---

  // 1. Average Time Per Question
  const totalTime = qAttempts.reduce(
    (sum, qa) => sum + (qa.time_taken_seconds || 0),
    0,
  );
  const averageTimePerQuestion =
    qAttempts.length > 0 ? Math.round(totalTime / qAttempts.length) : 0;

  // 2. First Attempt Success Rate (Mastery)
  const firstAttemptCorrectCount = qAttempts.filter(
    (qa) => qa.is_correct && qa.answered_on_first_attempt,
  ).length;
  const firstAttemptSuccessRate =
    qAttempts.length > 0
      ? Math.round((firstAttemptCorrectCount / qAttempts.length) * 100)
      : 0;

  // 3. Hint Dependency Rate (Of the correct answers, how many needed hints?)
  const correctWithHintsCount = qAttempts.filter(
    (qa) => qa.is_correct && (qa.hints_used || 0) > 0,
  ).length;
  const correctTotal = qAttempts.filter((qa) => qa.is_correct).length;
  const hintDependencyRate =
    correctTotal > 0
      ? Math.round((correctWithHintsCount / correctTotal) * 100)
      : 0;

  // 4. Persistence Score (Of the questions that had multiple attempts, how many were eventually correct?)
  const multiAttemptQuestions = qAttempts.filter(
    (qa) => (qa.attempts_count || 1) > 1,
  );
  const persistedCorrectCount = multiAttemptQuestions.filter(
    (qa) => qa.is_correct,
  ).length;
  const persistenceScore =
    multiAttemptQuestions.length > 0
      ? Math.round((persistedCorrectCount / multiAttemptQuestions.length) * 100)
      : 100; // Default to 100 if no struggle needed

  // 3. Calculate Authoritative Score
  // Average of all question scores
  // If fewer questions answered than total, those count as 0.
  const finalScore = Math.round(totalWeightedScore / safeTotal);

  // Mastery Check: Score > 90% AND First Attempt Rate > 80%
  const masteryAchieved = finalScore >= 90 && firstAttemptSuccessRate >= 80;

  // 5. Basic Score (Raw Percentage)
  const basicScore = Math.round(((correctCount || 0) / safeTotal) * 100);

  // 6. Confidence Indicator (Percentage of correct answers answered quickly, e.g., < 30s)
  // Threshold can be adjusted or made dynamic based on question difficulty in future
  const fastCorrectCount = qAttempts.filter(
    (qa) => qa.is_correct && (qa.time_taken_seconds || 0) < 30,
  ).length;
  const confidenceIndicator =
    correctTotal > 0 ? Math.round((fastCorrectCount / correctTotal) * 100) : 0;

  // 7. Questions Requiring Study (Count of questions with low weighted score, e.g., < 60)
  // We need to re-calculate the weighted score per question to count this,
  // or we can estimate it based on (Wrong OR (Correct + Hints)).
  // Let's use the same logic as the weighted score calculation.
  const questionsRequiringStudy = qAttempts.filter((qa) => {
    let qScore = 0;
    if (qa.is_correct) qScore = 100;
    else if (qa.ai_score) qScore = Number(qa.ai_score);
    const penalty = (qa.hints_used || 0) * 10;
    qScore = Math.max(0, qScore - penalty);
    return qScore < 60; // Threshold for "needs study"
  }).length;

  // 4. Prepare updates (Overwriting frontend score with backend authority)
  const updates: TablesUpdate<"test_attempts"> = {
    status: "completed",
    completed_at: new Date().toISOString(),
    score: finalScore,
    correct_answers: correctCount || 0,
    total_questions: totalQuestions,
    hints_used: totalHintsUsed, // Trust DB aggregation over frontend
    learning_engagement_rate: learningEngagementRate,
    average_time_per_question: averageTimePerQuestion,
    first_attempt_success_rate: firstAttemptSuccessRate,
    hint_dependency_rate: hintDependencyRate,
    persistence_score: persistenceScore,
    mastery_achieved: masteryAchieved,
    basic_score: basicScore,
    confidence_indicator: confidenceIndicator,
    questions_requiring_study: questionsRequiringStudy,
  };

  // Preserve qualitative/optional metrics if passed from frontend
  if (metrics) {
    if (metrics.timeTakenSeconds !== undefined)
      updates.time_taken_seconds = metrics.timeTakenSeconds;
    if (metrics.hintsUsed !== undefined) updates.hints_used = metrics.hintsUsed;

    // AI & Advanced Metrics
    if (metrics.aiScore !== undefined) updates.ai_score = metrics.aiScore;
    if (metrics.aiScoreBreakdown !== undefined)
      updates.ai_score_breakdown = metrics.aiScoreBreakdown;
    if (metrics.learningEngagementRate !== undefined)
      updates.learning_engagement_rate = metrics.learningEngagementRate;
    if (metrics.averageTimePerQuestion !== undefined)
      updates.average_time_per_question = metrics.averageTimePerQuestion;
    if (metrics.firstAttemptSuccessRate !== undefined)
      updates.first_attempt_success_rate = metrics.firstAttemptSuccessRate;
    if (metrics.hintDependencyRate !== undefined)
      updates.hint_dependency_rate = metrics.hintDependencyRate;
    if (metrics.persistenceScore !== undefined)
      updates.persistence_score = metrics.persistenceScore;
    if (metrics.confidenceIndicator !== undefined)
      updates.confidence_indicator = metrics.confidenceIndicator;
    if (metrics.forcedStudyBreaks !== undefined)
      updates.forced_study_breaks = metrics.forcedStudyBreaks;
    if (metrics.masteryAchieved !== undefined)
      updates.mastery_achieved = metrics.masteryAchieved;
    if (metrics.questionsRequiringStudy !== undefined)
      updates.questions_requiring_study = metrics.questionsRequiringStudy;
  }

  // 5. Commit Update
  const { data: attempt, error } = await supabase
    .from("test_attempts")
    .update(updates)
    .eq("id", attemptId)
    .select()
    .single();

  if (error) throw error;

  // 6. Trigger Performance Metrics Calculation
  try {
    await calculateAndSaveMetrics(attemptData.student_id, attemptData.test_id);
  } catch (metricError) {
    console.error("Failed to update performance metrics:", metricError);
  }

  // 7. Fetch full test details for return
  const { data: fullTest } = await supabase
    .from("tests")
    .select("*")
    .eq("id", attemptData.test_id)
    .single();

  return {
    attempt: {
      id: attempt.id,
      studentId: attempt.student_id,
      testId: attempt.test_id,
      startedAt: new Date(attempt.started_at),
      completedAt: new Date(attempt.completed_at!),
      status: attempt.status as TestAttempt["status"],
      totalQuestions: attempt.total_questions,
      correctAnswers: attempt.correct_answers,
      hintsUsed: attempt.hints_used,
      timeTakenSeconds: attempt.time_taken_seconds || 0,
      score: attempt.score || 0,
      basicScore: Number(attempt.basic_score) || undefined,
      aiScore: Number(attempt.ai_score) || undefined,
      learningEngagementRate:
        Number(attempt.learning_engagement_rate) || undefined,
      averageTimePerQuestion:
        Number(attempt.average_time_per_question) || undefined,
      firstAttemptSuccessRate:
        Number(attempt.first_attempt_success_rate) || undefined,
      hintDependencyRate: Number(attempt.hint_dependency_rate) || undefined,
      persistenceScore: Number(attempt.persistence_score) || undefined,
      confidenceIndicator: Number(attempt.confidence_indicator) || undefined,
      forcedStudyBreaks: attempt.forced_study_breaks || 0,
      masteryAchieved: attempt.mastery_achieved || false,
      questionsRequiringStudy: attempt.questions_requiring_study || 0,
    },
    questionResults: [],
    test: fullTest
      ? {
          id: fullTest.id,
          title: fullTest.title,
          description: fullTest.description,
          status: fullTest.status as Test["status"],
          scheduledDate: new Date(fullTest.scheduled_date),
          duration: fullTest.duration,
          createdAt: new Date(fullTest.created_at),
          createdBy: fullTest.created_by,
          lessonId: fullTest.lesson_id || undefined,
          questionCount: fullTest.question_count,
          questions: [], // Questions not needed or not fetched here for now
        }
      : {
          id: "unknown",
          title: "Unknown Test",
          description: "",
          status: "draft",
          scheduledDate: new Date(),
          duration: 0,
          createdAt: new Date(),
          createdBy: "",
          questionCount: 0,
          questions: [],
        },
  };
}

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

// ============================================
// Performance Metrics Services
// ============================================

/**
 * Get performance metrics for a student
 */
export async function getStudentPerformance(
  studentId: string,
  testId?: string,
): Promise<PerformanceMetrics[]> {
  let query = supabase
    .from("performance_metrics")
    .select("*")
    .eq("student_id", studentId);

  if (testId) {
    query = query.eq("test_id", testId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data.map((m) => ({
    id: m.id,
    studentId: m.student_id,
    testId: m.test_id,
    averageBasicScore: Number(m.average_basic_score) || 0,
    averageAiScore: Number(m.average_ai_score) || 0,
    totalAttempts: m.total_attempts || 0,
    improvementRate: Number(m.improvement_rate) || 0,
    consistencyScore: Number(m.consistency_score) || 0,
    averageHintUsage: Number(m.average_hint_usage) || 0,
    averageLearningEngagement: Number(m.average_learning_engagement) || 0,
    averageTimeEfficiency: Number(m.average_time_efficiency) || 0,
    strongTopics: m.strong_topics || [],
    weakTopics: m.weak_topics || [],
    calculatedAt: new Date(m.calculated_at),
  }));
}

/**
 * Save/Update performance metrics
 * (Usually called by backend/edge function, but exposing here for flexibility)
 */
export async function savePerformanceMetrics(
  metrics: Omit<PerformanceMetrics, "id" | "calculatedAt">,
): Promise<PerformanceMetrics> {
  // Check if exists for student+test
  const { data: existing } = await supabase
    .from("performance_metrics")
    .select("id")
    .eq("student_id", metrics.studentId)
    .eq("test_id", metrics.testId)
    .maybeSingle();

  let query;
  if (existing) {
    query = supabase
      .from("performance_metrics")
      .update({
        average_basic_score: metrics.averageBasicScore,
        average_ai_score: metrics.averageAiScore,
        total_attempts: metrics.totalAttempts,
        improvement_rate: metrics.improvementRate,
        consistency_score: metrics.consistencyScore,
        average_hint_usage: metrics.averageHintUsage,
        average_learning_engagement: metrics.averageLearningEngagement,
        average_time_efficiency: metrics.averageTimeEfficiency,
        strong_topics: metrics.strongTopics,
        weak_topics: metrics.weakTopics,
        updated_at: new Date().toISOString(), // explicitly update ts
      })
      .eq("id", existing.id);
  } else {
    query = supabase.from("performance_metrics").insert({
      student_id: metrics.studentId,
      test_id: metrics.testId,
      average_basic_score: metrics.averageBasicScore,
      average_ai_score: metrics.averageAiScore,
      total_attempts: metrics.totalAttempts,
      improvement_rate: metrics.improvementRate,
      consistency_score: metrics.consistencyScore,
      average_hint_usage: metrics.averageHintUsage,
      average_learning_engagement: metrics.averageLearningEngagement,
      average_time_efficiency: metrics.averageTimeEfficiency,
      strong_topics: metrics.strongTopics,
      weak_topics: metrics.weakTopics,
    });
  }

  const { data: saved, error } = await query.select().single();
  if (error) throw error;

  return {
    id: saved.id,
    studentId: saved.student_id,
    testId: saved.test_id,
    averageBasicScore: Number(saved.average_basic_score) || 0,
    averageAiScore: Number(saved.average_ai_score) || 0,
    totalAttempts: saved.total_attempts || 0,
    improvementRate: Number(saved.improvement_rate) || 0,
    consistencyScore: Number(saved.consistency_score) || 0,
    averageHintUsage: Number(saved.average_hint_usage) || 0,
    averageLearningEngagement: Number(saved.average_learning_engagement) || 0,
    averageTimeEfficiency: Number(saved.average_time_efficiency) || 0,
    strongTopics: saved.strong_topics || [],
    weakTopics: saved.weak_topics || [],
    calculatedAt: new Date(saved.calculated_at),
  };
}

// ============================================
// Analytics Services
// ============================================

/**
 * Get overall analytics
 */
export async function getOverallAnalytics(): Promise<OverallAnalytics> {
  // 1. Get counts
  const { count: tests } = await supabase
    .from("tests")
    .select("*", { count: "exact", head: true });

  const { count: students } = await supabase
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", "student");

  // 2. Get all attempts for aggregation
  // Optimization: In a real app, this should be an RPC or a materialized view
  const { data: attemptsData, error } = await supabase.from("test_attempts")
    .select(`
      id,
      score,
      time_taken_seconds,
      hints_used,
      status,
      test_id,
      test:tests(title)
    `);

  if (error) throw error;

  const attempts = attemptsData || [];
  const totalAttempts = attempts.length;

  // 3. Calculate Overall Average Score (completed only)
  const completedAttempts = attempts.filter((a) => a.status === "completed");
  const totalScore = completedAttempts.reduce(
    (sum, a) => sum + (a.score || 0),
    0,
  );
  const averageScore =
    completedAttempts.length > 0
      ? Math.round(totalScore / completedAttempts.length)
      : 0;

  // 4. Group by Test for TestAnalytics
  const contentMap = new Map<string, TestAnalytics>();

  attempts.forEach((attempt) => {
    const testId = attempt.test_id;
    // Type assertion for joined relationship
    const testData = attempt.test as unknown as { title: string } | null;
    const testTitle = testData?.title || "Unknown Test";

    if (!contentMap.has(testId)) {
      contentMap.set(testId, {
        testId,
        testTitle,
        totalAttempts: 0,
        averageScore: 0,
        averageTime: 0,
        averageHintsUsed: 0,
        completionRate: 0,
      });
    }

    const metrics = contentMap.get(testId)!;
    metrics.totalAttempts += 1;
  });

  // Calculate averages per test
  const testAnalytics: TestAnalytics[] = Array.from(contentMap.values()).map(
    (metric) => {
      const testAttempts = attempts.filter((a) => a.test_id === metric.testId);
      const completed = testAttempts.filter((a) => a.status === "completed");

      const avgScore =
        completed.length > 0
          ? completed.reduce((sum, a) => sum + (a.score || 0), 0) /
            completed.length
          : 0;

      const avgTime =
        completed.length > 0
          ? completed.reduce((sum, a) => sum + (a.time_taken_seconds || 0), 0) /
            completed.length
          : 0;

      const avgHints =
        completed.length > 0
          ? completed.reduce((sum, a) => sum + (a.hints_used || 0), 0) /
            completed.length
          : 0;

      const completionRate =
        testAttempts.length > 0
          ? Math.round((completed.length / testAttempts.length) * 100)
          : 0;

      return {
        ...metric,
        averageScore: Math.round(avgScore),
        averageTime: Math.round(avgTime),
        averageHintsUsed: Math.round(avgHints * 10) / 10,
        completionRate,
      };
    },
  );

  return {
    totalTests: tests || 0,
    totalStudents: students || 0,
    totalAttempts: totalAttempts,
    averageScore,
    testAnalytics,
  };
}

/**
 * Get analytics for a specific test
 */
export async function getTestAnalytics(testId: string) {
  const { data: attempts, error } = await supabase
    .from("test_attempts")
    .select("*")
    .eq("test_id", testId);

  if (error) throw error;

  const totalAttempts = attempts.length;
  const completed = attempts.filter((a) => a.status === "completed");

  const avgScore =
    completed.length > 0
      ? completed.reduce((sum, a) => sum + (a.score || 0), 0) / completed.length
      : 0;

  const avgTime =
    completed.length > 0
      ? completed.reduce((sum, a) => sum + (a.time_taken_seconds || 0), 0) /
        completed.length
      : 0;

  return {
    testId,
    totalAttempts,
    averageScore: Math.round(avgScore),
    averageTime: Math.round(avgTime),
    completedCount: completed.length,
  };
}

/**
 * Calculate and save performance metrics for a student on a specific test
 */
export async function calculateAndSaveMetrics(
  studentId: string,
  testId: string,
): Promise<void> {
  // 1. Fetch all completed attempts for this student & test
  const { data: attempts, error: attemptsError } = await supabase
    .from("test_attempts")
    .select("*")
    .eq("student_id", studentId)
    .eq("test_id", testId)
    .eq("status", "completed")
    .order("completed_at", { ascending: true });

  if (attemptsError) {
    console.error("Error fetching attempts for metrics:", attemptsError);
    return;
  }

  if (!attempts || attempts.length === 0) return;

  // 2. Calculate Metrics
  const totalAttempts = attempts.length;

  // Basic Score Avg
  const totalBasicScore = attempts.reduce(
    (sum, a) => sum + (Number(a.score) || 0),
    0,
  );
  const averageBasicScore = Math.round(totalBasicScore / totalAttempts);

  // Improvement Rate (Last Score - First Score)
  const firstScore = Number(attempts[0].score) || 0;
  const lastScore = Number(attempts[attempts.length - 1].score) || 0;
  const improvementRate = lastScore - firstScore;

  // Consistency (Standard Deviation-based score)
  const variance =
    attempts.reduce(
      (sum, a) => sum + Math.pow((Number(a.score) || 0) - averageBasicScore, 2),
      0,
    ) / (totalAttempts || 1);
  const stdDev = Math.sqrt(variance);
  const consistencyScore = Math.max(0, Math.round(100 - stdDev)); // 100 = perfectly consistent

  // Hint Usage
  const totalHints = attempts.reduce((sum, a) => sum + (a.hints_used || 0), 0);
  const averageHintUsage = Number(
    (totalHints / (totalAttempts || 1)).toFixed(1),
  );

  // Time Efficiency (Avg time taken)
  const totalTime = attempts.reduce(
    (sum, a) => sum + (a.time_taken_seconds || 0),
    0,
  );
  const averageTime = Math.round(totalTime / (totalAttempts || 1));

  // 3. Save to performance_metrics
  await savePerformanceMetrics({
    studentId,
    testId,
    averageBasicScore,
    averageAiScore: 0,
    totalAttempts,
    improvementRate,
    consistencyScore,
    averageHintUsage,
    averageLearningEngagement: 0,
    averageTimeEfficiency: averageTime,
    strongTopics: [],
    weakTopics: [],
  });
}

/**
 * Get all test attempts (Admin)
 */
export async function getAllTestAttempts(page = 1, pageSize = 20) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await supabase
    .from("test_attempts")
    .select(
      `
      *,
      test:tests(title),
      student:profiles(name, email)
    `,
      { count: "exact" },
    )
    .order("started_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    data: data.map((attempt) => ({
      ...attempt,
      testTitle: attempt.test?.title,
      studentName:
        (attempt.student as unknown as { name: string; email: string })?.name ||
        (attempt.student as unknown as { name: string; email: string })
          ?.email ||
        "Unknown",
      score: attempt.score,
      status: attempt.status,
      startedAt: attempt.started_at,
      completedAt: attempt.completed_at,
    })),
    total: count || 0,
    page,
    pageSize,
  };
}

/**
 * Get all performance metrics (Admin)
 */
export async function getPerformanceMetrics(page = 1, pageSize = 20) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await supabase
    .from("performance_metrics")
    .select(
      `
      *,
      test:tests(title),
      student:profiles(name, email)
    `,
      { count: "exact" },
    )
    .order("calculated_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  // Type definition for the joined query result
  type PerformanceMetricRow = Tables<"performance_metrics"> & {
    test: { title: string } | null;
    student: { name: string; email: string } | null;
  };

  const metrics = data as unknown as PerformanceMetricRow[];

  return {
    data: metrics.map((m) => ({
      id: m.id,
      studentId: m.student_id,
      testId: m.test_id,
      testTitle: m.test?.title,
      studentName: m.student?.name || m.student?.email,
      averageBasicScore: Number(m.average_basic_score) || 0,
      averageAiScore: Number(m.average_ai_score) || 0,
      totalAttempts: m.total_attempts || 0,
      improvementRate: Number(m.improvement_rate) || 0,
      consistencyScore: Number(m.consistency_score) || 0,
      averageHintUsage: Number(m.average_hint_usage) || 0,
      averageLearningEngagement: Number(m.average_learning_engagement) || 0,
      averageTimeEfficiency: Number(m.average_time_efficiency) || 0,
      strongTopics: m.strong_topics || [],
      weakTopics: m.weak_topics || [],
      calculatedAt: new Date(m.calculated_at),
    })),
    total: count || 0,
    page,
    pageSize,
  };
}
