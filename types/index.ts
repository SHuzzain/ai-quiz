// ============================================
// Core Types for AI Learning Platform
// ============================================

export type UserRole = "admin" | "student";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  grade?: number; // For students
  createdAt: Date;
  lastActiveAt: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ============================================
// Test & Question Types
// ============================================

export interface Test {
  id: string;
  title: string;
  description: string;
  scheduledDate: Date;
  createdAt: Date;
  createdBy: string;
  status: "draft" | "scheduled" | "active" | "completed";
  questionCount: number;
  duration: number; // in minutes
  lessonId?: string;
}

export interface Question {
  id: string;
  testId: string;
  questionText: string; // Contains __BLANK__ placeholder
  correctAnswer: string;
  hints: string[];
  microLearning: string; // AI-generated explanation for kids
  order: number;
}

export interface TestWithQuestions extends Test {
  questions: Question[];
}

// ============================================
// Test Attempt Types
// ============================================

export interface TestAttempt {
  id: string;
  testId: string;
  studentId: string;
  startedAt: Date;
  completedAt?: Date;
  status: "in_progress" | "completed" | "abandoned";
  score?: number;
  totalQuestions: number;
  correctAnswers: number;
  hintsUsed: number;
  timeTakenSeconds?: number;
}

export interface QuestionAttempt {
  id: string;
  attemptId: string;
  questionId: string;
  studentAnswer: string;
  isCorrect: boolean;
  attemptsCount: number;
  hintsUsed: number;
  viewedMicroLearning: boolean;
  timeTakenSeconds: number;
}

export interface AttemptResult {
  attempt: TestAttempt;
  questionResults: QuestionAttempt[];
  test: Test;
}

// ============================================
// Lesson Types
// ============================================

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: Date;
  uploadedBy: string;
}

// ============================================
// Analytics Types
// ============================================

export interface TestAnalytics {
  testId: string;
  testTitle: string;
  totalAttempts: number;
  averageScore: number;
  averageTime: number; // seconds
  averageHintsUsed: number;
  completionRate: number;
}

export interface StudentAnalytics {
  studentId: string;
  studentName: string;
  testsCompleted: number;
  averageScore: number;
  totalHintsUsed: number;
  totalTimeSpent: number;
}

export interface OverallAnalytics {
  title: string;
  value: number | string;
  state: string;
}

export interface DashboardAnalytics {
  overallAnalytic: OverallAnalytics[];
  testAnalytics: TestAnalytics[];
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface GetTestsResponse {
  data: Test[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// File Upload Types
// ============================================

export interface FileUpload {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
}

export interface ExtractedQuestions {
  questions: Omit<Question, "id" | "testId">[];
  rawText: string;
  confidence: number;
}
