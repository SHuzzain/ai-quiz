export type UserRole = "ADMIN" | "STUDENT";

export type TestStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "COMPLETED";

export type AttemptStatus = "IN_PROGRESS" | "COMPLETED" | "ABANDONED";

export interface User {
  id: string;
  email: string;
  name: string | null;
  clerkId: string;
  role: UserRole;
  avatarUrl: string | null;
  grade: number | null;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
}

export interface Lesson {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface Test {
  id: string;
  title: string;
  description: string;
  scheduledDate: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  status: TestStatus;
  questionCount: number;
  duration: number;
  lessonId: string | null;
}

export interface Question {
  id: string;
  testId: string;
  questionText: string;
  correctAnswer: string;
  hints: string[];
  microLearning: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  maxAttemptsBeforeStudy: number;
}

export interface TestAttempt {
  id: string;
  testId: string;
  studentId: string;
  startedAt: Date;
  completedAt: Date | null;
  status: AttemptStatus;
  basicScore: number | null;
  aiScore: number | null;
  aiScoreBreakdown: any | null;
  totalQuestions: number;
  correctAnswers: number;
  hintsUsed: number;
  timeTakenSeconds: number | null;
  learningEngagementRate: number | null;
  averageTimePerQuestion: number | null;
  firstAttemptSuccessRate: number | null;
  hintDependencyRate: number | null;
  persistenceScore: number | null;
  confidenceIndicator: number | null;
  forcedStudyBreaks: number;
  masteryAchieved: boolean;
  questionsRequiringStudy: number;
}

export interface QuestionAttempt {
  id: string;
  attemptId: string;
  questionId: string;
  studentAnswer: string;
  isCorrect: boolean;
  attemptsCount: number;
  createdAt: Date;
  timeTakenSeconds: number;
  timeBeforeFirstAttempt: number | null;
  hintsUsed: number;
  hintSequence: number[];
  timeSpentOnHints: number | null;
  viewedMicroLearning: boolean;
  microLearningViewedBefore: boolean;
  microLearningTimeSpent: number | null;
  answeredOnFirstAttempt: boolean;
  usedNoHints: boolean;
  showedPersistence: boolean;
  studyMaterialDownloaded: boolean;
  downloadedAt: Date | null;
  retriesAfterStudy: number;
  mustStudyBeforeRetry: boolean;
}

export interface PerformanceMetrics {
  id: string;
  studentId: string;
  testId: string | null;
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
  updatedAt: Date;
}
