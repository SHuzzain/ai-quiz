// ============================================
// Core Types for AI Learning Platform
// ============================================

import type { Json } from "@/types/json";

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
// Course Types
// ============================================

export interface Course {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Test & Question Types
// ============================================

/** Stored per-condition config for resolving questions from question bank. */
export interface TestConditionStored {
  topics: string[];
  concept: string[];
  difficulty: number;
  numberOfQuestions: number;
}

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
  totalMark?: number;
  updatedAt?: Date;
  /** How many questions the student attempts; must be <= questionCount (pool size). */
  numberOfQuestions?: number | null;
  /** Conditions used to resolve questions from question bank (for edit binding). */
  conditions?: TestConditionStored[] | null;
}

export interface Question {
  id: string;
  testId: string;
  questionText: string; // Contains __BLANK__ placeholder
  correctAnswer: string;
  hints: string[];
  microLearning: string; // AI-generated explanation for kids
  order: number;
  maxAttemptsBeforeStudy?: number;
  topic: string;
  concept: string;
  mark: number;
  difficulty: number;
  working: string;
  difficultyReason?: string;
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
  totalMark?: number;
  /** For adaptive tests: question currently shown (resume). */
  currentQuestionId?: string | null;
  /** Number of questions answered so far. */
  questionsAttemptedCount: number;
  /** Test title (when loaded with attempt, e.g. getTestAttempt). */
  testTitle?: string;
  /** Test duration in minutes (when loaded with attempt, for countdown). */
  durationMinutes?: number;

  // AI & Advanced Metrics
  basicScore?: number;
  aiScore?: number;
  aiScoreBreakdown?: Json; // JSON
  learningEngagementRate?: number;
  averageTimePerQuestion?: number;
  firstAttemptSuccessRate?: number;
  hintDependencyRate?: number;
  persistenceScore?: number;
  confidenceIndicator?: number;
  forcedStudyBreaks?: number;
  masteryAchieved?: boolean;
  questionsRequiringStudy?: number;
}

export interface QuestionAttempt {
  id: string;
  attemptId: string;
  questionId: string;
  studentAnswer: string;
  isCorrect: boolean;
  mark?: number;
  attemptsCount: number;
  hintsUsed: number;
  viewedMicroLearning: boolean;
  timeTakenSeconds: number;
  aiScore: number;
  aiFeedback: string;
  // Detailed Metrics
  timeBeforeFirstAttempt?: number;
  hintSequence?: number[];
  timeSpentOnHints?: number;
  microLearningViewedBefore?: boolean;
  microLearningTimeSpent?: number;
  answeredOnFirstAttempt?: boolean;
  usedNoHints?: boolean;
  showedPersistence?: boolean;
  studyMaterialDownloaded?: boolean;
  downloadedAt?: Date;
  retriesAfterStudy?: number;
  mustStudyBeforeRetry?: boolean;
  generatedHints?: string[];
  microLearningContent?: string;
  answeredAt?: Date;
}

export interface AttemptResult {
  attempt: TestAttempt;
  questionResults: QuestionAttempt[];
  test: TestWithQuestions;
}

// ============================================
// Performance Metrics Types
// ============================================

export interface PerformanceMetrics {
  id: string;
  studentId: string;
  testId: string;
  averageBasicScore: number;
  averageAiScore: number;
  totalAttempts: number;
  improvementRate: number;
  consistencyScore: number;
  averageHintUsage: number;
  averageLearningEngagement: number;
  averageTimeEfficiency: number;
  strongTopics: string[];
  weakTopics: string[];
  calculatedAt: Date;
}

// ============================================
// Lesson Types
// ============================================

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  files: { name: string; url: string; type: string }[];
  uploadedAt: Date;
  uploadedBy: string;
  updatedAt?: Date;
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
  // TODO: Add more specific analytics fields matching new schema if needed
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
  totalTests: number;
  totalStudents: number;
  totalAttempts: number;
  averageScore: number;
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

// ============================================
// AI Analysis Types
// ============================================

export interface DocumentAnalysis {
  type: string;
  greeting: string;
  summary: string;
  topics: string[];
  concepts: string[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
}

export interface ExtractedQuestion {
  questionText: string;
  correctAnswer: string;
  order: number;
}

export interface ExtractedQuestionsResult {
  questions: ExtractedQuestion[];
  rawText: string;
  confidence: number;
}

// ============================================
// Question Bank Types
// ============================================

/** One row from question_bank_items table (list/dialog use). */
export interface QuestionBankItemRow {
  id: string;
  lessonId: string | null;
  testIds: string[];
  questionText: string;
  correctAnswer: string;
  working: string | null;
  topic: string;
  conceptTested: string;
  marks: number;
  difficulty: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

export interface QuestionBankItem {
  title: string;
  answer: string;
  topic: string;
  concept: string;
  difficulty: number;
  marks: number;
  working?: string;
  difficultyReason?: string;
}

export interface VariantConfig {
  topics: string[];
  concepts: string[];
  difficulty: number;
  marks: number;
  variantCount: number;
  baseQuestion?: string;
}

export interface QuestionBankSet {
  id: string;
  title: string;
  lessonId?: string | null;
  questions: QuestionBankItem[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// ============================================
// Question Bank Types
// ============================================
