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
    totalMark: test.total_mark || 0,
    questions: questions.map((q) => ({
      id: q.id,
      testId: q.test_id,
      questionText: q.question_text,
      correctAnswer: q.correct_answer,
      hints: q.hints,
      microLearning: q.micro_learning,
      order: q.order,
      concept: q.concept,
      topic: q.topic,
      difficulty: q.difficulty,
      mark: q.mark,
      working: q.working,
      difficultyReason: q.difficultyReason,
      maxAttemptsBeforeStudy: q.max_attempts_before_study,
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
  status?: Test["status"];
  totalMark?: number;
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
      status: data.status || "draft",
      question_count: 0,
      total_mark: data.totalMark || 0,
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
    totalMark: newTest.total_mark || 0,
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
  if (data.totalMark !== undefined) updates.total_mark = data.totalMark;

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
    totalMark: updatedTest.total_mark || 0,
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
    totalMark: a.total_mark || 0,
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
    totalMark: attempt.total_mark || 0,
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
    totalMark: attempt.total_mark || 0,
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
    mark: qa.mark || 0,
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
    .select("question_count, total_mark")
    .eq("id", testId)
    .single();

  const { data: attempt, error } = await supabase
    .from("test_attempts")
    .insert({
      test_id: testId,
      student_id: studentId,
      status: "in_progress",
      total_questions: test?.question_count || 0,
      total_mark: test?.total_mark || 0,
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
    totalMark: attempt.total_mark || 0,
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

interface AttemptHistoryItem {
  answer: string;
  isCorrect: boolean;
  aiScore?: number;
  feedback?: string;
  timestamp: string;
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
    .select("question_text, correct_answer, mark")
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
      mark: question.mark || 0,
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
  studentQuestion?: string,
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

  // If no static content, or if the student has a specific question, try to generate AI content.
  // Note: if studentQuestion is provided, we bypass the static micro_learning to give them a tailored answer.
  if (
    !question.micro_learning ||
    question.micro_learning.trim() === "" ||
    studentQuestion
  ) {
    if (attemptId) {
      const { data: qAttempt } = await supabase
        .from("question_attempts")
        .select("micro_learning_content")
        .eq("attempt_id", attemptId)
        .eq("question_id", questionId)
        .maybeSingle();

      // Only return previously generated content if they are NOT asking a new question
      if (qAttempt?.micro_learning_content && !studentQuestion) {
        return qAttempt.micro_learning_content;
      }

      // 3. Generate new AI content (via Supabase Edge Function)
      try {
        const { data: generatedData, error: funcError } =
          await supabase.functions.invoke("generate-micro-learning", {
            body: {
              questionText: question.questionText,
              correctAnswer: question.correctAnswer,
              studentQuestion: studentQuestion,
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

  return question.micro_learning;
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
  // 1. Fetch Attempt + Test Info
  const { data: attemptData, error: attemptError } = await supabase
    .from("test_attempts")
    .select("test_id, student_id")
    .eq("id", attemptId)
    .single();

  if (attemptError || !attemptData)
    throw attemptError || new Error("Attempt not found");

  const { data: testData, error: testError } = await supabase
    .from("tests")
    .select("question_count, duration, total_mark")
    .eq("id", attemptData.test_id)
    .single();

  if (testError || !testData) throw testError || new Error("Test not found");

  // 2. Fetch Question Attempts (include mark + difficulty)
  const { data: qAttempts, error: countError } = await supabase
    .from("question_attempts")
    .select("*")
    .eq("attempt_id", attemptId);

  if (countError) throw countError;

  // Track the breakdown of the score calculation for clarity
  interface ScoreBreakdown {
    questions: Array<{
      questionId: string;
      rawScore: number;
      penalties: {
        hints: number;
        microLearning: number;
        studyMaterial: number;
        totalPenalty: number;
      };
      difficultyMultiplier: number;
      finalQuestionScore: number;
      weightedMark: number;
      isConsideredCorrect: boolean;
    }>;
    timePenalty: number;
    finalScore: number;
    totalWeightedMarks: number;
    totalTestMarks: number;
  }

  const aiScoreBreakdown: ScoreBreakdown = {
    questions: [],
    timePenalty: 0,
    finalScore: 0,
    totalWeightedMarks: 0,
    totalTestMarks: testData.total_mark || 0,
  };

  const totalTestMarks = testData.total_mark || 0;
  const safeTotalMarks = totalTestMarks > 0 ? totalTestMarks : 1;

  let totalWeightedMarks = 0;
  let correctCount = 0;
  let totalHintsUsedCount = 0;

  const getAverageAiScore = (qa): number => {
    if (
      qa.attempt_history &&
      Array.isArray(qa.attempt_history) &&
      qa.attempt_history.length > 0
    ) {
      const scores = qa.attempt_history
        .map((h) => h?.aiScore)
        .filter((s) => typeof s === "number");

      if (scores.length > 0)
        return Math.round(
          scores.reduce((a: number, b: number) => a + b, 0) / scores.length,
        );
    }
    return qa.ai_score ?? (qa.is_correct ? 100 : 0);
  };

  const getDifficultyMultiplier = (difficulty: number | null | undefined) => {
    if (difficulty === null || difficulty === undefined) return 1.0;
    switch (difficulty) {
      case 1:
        return 1.0;
      case 2:
        return 0.9;
      case 3:
        return 0.75;
      case 4:
        return 0.6;
      case 5:
        return 0.5;
      default:
        return 1.0;
    }
  };

  const totalTimeTaken = qAttempts.reduce(
    (sum, qa) => sum + (qa.time_taken_seconds || 0),
    0,
  );

  for (const qa of qAttempts) {
    const rawScore = getAverageAiScore(qa);
    const isQuestionCorrect = rawScore >= 60;
    if (isQuestionCorrect) correctCount++;
    if (qa.hints_used) totalHintsUsedCount += qa.hints_used;

    // Penalties
    const baseHintPenalty = (qa.hints_used || 0) * 10;
    const baseMicroPenalty = qa.micro_learning_viewed ? 20 : 0;
    const baseStudyPenalty = qa.study_material_downloaded ? 20 : 0;

    const diffMultiplier = getDifficultyMultiplier(qa.difficulty);
    const totalPenalty =
      (baseHintPenalty + baseMicroPenalty + baseStudyPenalty) * diffMultiplier;

    const postPenaltyScore = Math.max(0, rawScore - totalPenalty);
    const questionMark = qa.mark || 0;
    const weightedMark = (postPenaltyScore / 100) * questionMark;

    totalWeightedMarks += weightedMark;

    // Add to breakdown
    aiScoreBreakdown.questions.push({
      questionId: qa.question_id,
      rawScore,
      penalties: {
        hints: baseHintPenalty,
        microLearning: baseMicroPenalty,
        studyMaterial: baseStudyPenalty,
        totalPenalty,
      },
      difficultyMultiplier: diffMultiplier,
      finalQuestionScore: postPenaltyScore,
      weightedMark,
      isConsideredCorrect: isQuestionCorrect,
    });
  }

  aiScoreBreakdown.totalWeightedMarks = totalWeightedMarks;

  // 3. Final Score Calculation
  let finalScoreCalculated = Math.round(
    (totalWeightedMarks / safeTotalMarks) * 100,
  );

  // --- Time Penalty Logic ---
  const testDurationMinutesLimit = testData.duration || 0;
  let appliedTimePenaltyScore = 0;
  if (testDurationMinutesLimit > 0) {
    const timeTakenMinutesVal = totalTimeTaken / 60;
    const extraMinutesCount = Math.floor(
      timeTakenMinutesVal - testDurationMinutesLimit,
    );
    if (extraMinutesCount > 0) {
      let timePenaltyVal = extraMinutesCount * 1;
      if (extraMinutesCount > 5) timePenaltyVal += 10;
      appliedTimePenaltyScore = timePenaltyVal;
      finalScoreCalculated = Math.max(0, finalScoreCalculated - timePenaltyVal);
    }
  }

  aiScoreBreakdown.timePenalty = appliedTimePenaltyScore;
  aiScoreBreakdown.finalScore = finalScoreCalculated;

  // --- BEHAVIORAL METRICS ---
  const engagedQuestionsCountVal = qAttempts.filter(
    (qa) => (qa.hints_used || 0) > 0 || qa.micro_learning_viewed,
  ).length;
  const learningEngagementRateVal =
    qAttempts.length > 0
      ? Math.round((engagedQuestionsCountVal / qAttempts.length) * 100)
      : 0;

  const averageTimePerQuestionVal =
    qAttempts.length > 0 ? Math.round(totalTimeTaken / qAttempts.length) : 0;

  const firstAttemptCorrectCountVal = qAttempts.filter(
    (qa) => qa.is_correct && qa.answered_on_first_attempt,
  ).length;
  const firstAttemptSuccessRateVal =
    qAttempts.length > 0
      ? Math.round((firstAttemptCorrectCountVal / qAttempts.length) * 100)
      : 0;

  // Persistence Score
  const multiAttemptQuestionsVal = qAttempts.filter(
    (qa) => (qa.attempts_count || 1) > 1,
  );
  const persistedCorrectCountVal = multiAttemptQuestionsVal.filter((qa) => {
    const score = getAverageAiScore(qa);
    return score >= 60;
  }).length;
  const persistenceScoreVal =
    multiAttemptQuestionsVal.length > 0
      ? Math.round(
          (persistedCorrectCountVal / multiAttemptQuestionsVal.length) * 100,
        )
      : 100;

  const masteryAchievedVal =
    finalScoreCalculated >= 90 && firstAttemptSuccessRateVal >= 80;

  // Basic Score (Authoritative Raw weighted % without time penalty)
  const basicScoreVal = Math.round((totalWeightedMarks / safeTotalMarks) * 100);

  // Confidence Indicator
  const fastCorrectCountVal = qAttempts.filter((qa) => {
    const score = getAverageAiScore(qa);
    return score >= 60 && (qa.time_taken_seconds || 0) < 30;
  }).length;
  const confidenceIndicatorVal =
    correctCount > 0
      ? Math.round((fastCorrectCountVal / correctCount) * 100)
      : 0;

  const questionsRequiringStudyCountVal = aiScoreBreakdown.questions.filter(
    (q) => q.finalQuestionScore < 60,
  ).length;

  const hintDependencyRateVal =
    correctCount > 0
      ? Math.round(
          (qAttempts.filter(
            (qa) =>
              (Number(qa.ai_score) || 0) >= 60 && (qa.hints_used || 0) > 0,
          ).length /
            correctCount) *
            100,
        )
      : 0;

  // 4. Update Database
  const updates: TablesUpdate<"test_attempts"> = {
    status: "completed",
    completed_at: new Date().toISOString(),
    score: finalScoreCalculated,
    correct_answers: correctCount,
    total_questions: testData.question_count,
    hints_used: totalHintsUsedCount,
    learning_engagement_rate: learningEngagementRateVal,
    average_time_per_question: averageTimePerQuestionVal,
    first_attempt_success_rate: firstAttemptSuccessRateVal,
    persistence_score: persistenceScoreVal,
    mastery_achieved: masteryAchievedVal,
    basic_score: basicScoreVal,
    confidence_indicator: confidenceIndicatorVal,
    questions_requiring_study: questionsRequiringStudyCountVal,
    hint_dependency_rate: hintDependencyRateVal,
    ai_score_breakdown: aiScoreBreakdown as unknown as Json,
  };

  if (metrics) {
    if (metrics.timeTakenSeconds !== undefined)
      updates.time_taken_seconds = metrics.timeTakenSeconds;
    if (metrics.score !== undefined && !updates.score)
      updates.score = metrics.score;
  }

  const { data: attempt, error } = await supabase
    .from("test_attempts")
    .update(updates)
    .eq("id", attemptId)
    .select()
    .single();

  if (error) throw error;

  await calculateAndSaveMetrics(attemptData.student_id, attemptData.test_id);

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
      ? ({
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
          questions: [],
        } as TestWithQuestions)
      : undefined,
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

  // Average Score (Total weighted final score)
  const totalScore = attempts.reduce(
    (sum, a) => sum + (Number(a.score) || 0),
    0,
  );
  const averageTotalScore = Math.round(totalScore / totalAttempts);

  // Basic Score Avg (Using basic_score which tracks raw % correct, fallback to final score)
  const totalBasicScore = attempts.reduce(
    (sum, a) => sum + (Number(a.basic_score) || Number(a.score) || 0),
    0,
  );
  const averageBasicScore = Math.round(totalBasicScore / totalAttempts);

  // AI Score Avg
  const totalAiScore = attempts.reduce(
    (sum, a) => sum + (Number(a.ai_score) || 0),
    0,
  );
  const averageAiScore = Math.round(totalAiScore / totalAttempts);

  // Learning Engagement Avg
  const totalEngagement = attempts.reduce(
    (sum, a) => sum + (Number(a.learning_engagement_rate) || 0),
    0,
  );
  const averageLearningEngagement = Math.round(totalEngagement / totalAttempts);

  // Improvement Rate (Last Score - First bare Score)
  const firstScore = Number(attempts[0].score) || 0;
  const lastScore = Number(attempts[attempts.length - 1].score) || 0;
  const improvementRate = lastScore - firstScore;

  // Consistency (Standard Deviation-based score using the final final score)
  const variance =
    attempts.reduce(
      (sum, a) => sum + Math.pow((Number(a.score) || 0) - averageTotalScore, 2),
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
    averageAiScore, // Now actually calculated
    totalAttempts,
    improvementRate,
    consistencyScore,
    averageHintUsage,
    averageLearningEngagement, // Now actually calculated
    averageTimeEfficiency: averageTime,
    strongTopics: [], // Would require aggregating tags across questions
    weakTopics: [],
  });
}

/**
 * Get all test attempts (Admin)
 */
export async function getAllTestAttempts(
  page = 1,
  pageSize = 20,
  filters?: {
    search?: string;
    status?: string;
    minScore?: number;
    maxScore?: number;
  },
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("test_attempts").select(
    `
      *,
      test:tests!inner(title),
      student:profiles!inner(name, email)
    `,
    { count: "exact" },
  );

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters?.minScore !== undefined) {
    query = query.gte("score", filters.minScore);
  }

  if (filters?.maxScore !== undefined) {
    query = query.lte("score", filters.maxScore);
  }

  if (filters?.search) {
    // Filter by student name or test title
    // Note: Cross-table OR filters are tricky in Supabase/PostgREST.
    // We might need to rely on a view or separate queries if this gets complex.
    // For now, let's filter by student name directly if possible via the join?
    // Actually, simple OR across joined tables isn't directly supported in one string.
    // workaround: use !inner and filter on the joined columns?
    // OR condition on joined columns:
    // query = query.or(`name.ilike.%${filters.search}%,title.ilike.%${filters.search}%`, { foreignTable: "student,test" });
    // This is getting complicated.
    // Let's simplified: Filter by student Name OR Test Title
    // But since they are in different tables...
    // Let's try textSearch if available or just filter on student name for now as "Name" was requested.
    query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`, {
      foreignTable: "student",
    });
  }

  // Order and paginate
  const { data, count, error } = await query
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
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

/**
 * Update ANY user (Admin function)
 */
export async function adminUpdateUser(
  userId: string,
  updates: Partial<User>,
): Promise<User> {
  // 1. Update Profile
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      name: updates.name,
      grade: updates.grade,
      avatar_url: updates.avatarUrl,
      // email: updates.email // Email update in profiles for display only if needed
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (profileError) throw profileError;

  // 2. Update Role if provided
  if (updates.role) {
    // Check if user_role entry exists
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

  // 3. Return updated user
  const updatedUser = await getUserById(userId);
  if (!updatedUser) throw new Error("User not found after update");

  return updatedUser;
}

/**
 * Get all performance metrics (Admin)
 */
export async function getPerformanceMetrics(
  page = 1,
  pageSize = 20,
  filters?: { search?: string; testId?: string },
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("performance_metrics").select(
    `
      *,
      test:tests!inner(title),
      student:profiles!inner(name, email)
    `,
    { count: "exact" },
  );

  if (filters?.testId && filters.testId !== "all") {
    query = query.eq("test_id", filters.testId);
  }

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`,
      {
        foreignTable: "student",
      },
    );
  }

  const { data, count, error } = await query
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
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

/**
 * Get all student metrics for charts (Unpaginated, lightweight)
 */
export async function getAllStudentMetrics(testId?: string) {
  let query = supabase.from("performance_metrics").select(
    `
      student_id,
      average_basic_score,
      average_learning_engagement,
      total_attempts,
      student:profiles!inner(name,avatar_url),
      test:tests!inner(title)
    `,
  );

  if (testId && testId !== "all") {
    query = query.eq("test_id", testId);
  }

  const { data, error } = await query.order("calculated_at", {
    ascending: false,
  });

  if (error) throw error;

  // Type definition for the joined query result
  type MetricRow = Pick<
    Tables<"performance_metrics">,
    | "student_id"
    | "average_basic_score"
    | "average_learning_engagement"
    | "total_attempts"
  > & {
    test: { title: string } | null;
    student: { name: string; avatar_url: string } | null;
  };

  const metrics = data as unknown as MetricRow[];

  return metrics.map((m) => ({
    studentId: m.student_id,
    averageBasicScore: Number(m.average_basic_score) || 0,
    studentAvatar: m.student?.avatar_url || "Unknown",
    testTitle: m.test?.title || "Unknown",
  }));
}

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
