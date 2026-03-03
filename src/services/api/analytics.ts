/**
 * Analytics API – metrics, overall/test analytics, performance.
 * Types from @/integrations/supabase/types.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables, TablesUpdate } from "@/integrations/supabase/types";
import type {
  OverallAnalytics,
  TestAnalytics,
  PerformanceMetrics,
} from "@/types";

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

  return (data ?? []).map((m) => ({
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
 */
export async function savePerformanceMetrics(
  metrics: Omit<PerformanceMetrics, "id" | "calculatedAt">,
): Promise<PerformanceMetrics> {
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
        updated_at: new Date().toISOString(),
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

/**
 * Get overall analytics
 */
export async function getOverallAnalytics(): Promise<OverallAnalytics> {
  const { count: tests } = await supabase
    .from("tests")
    .select("*", { count: "exact", head: true });

  const { count: students } = await supabase
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", "student");

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

  const completedAttempts = attempts.filter((a) => a.status === "completed");
  const totalScore = completedAttempts.reduce(
    (sum, a) => sum + (a.score || 0),
    0,
  );
  const averageScore =
    completedAttempts.length > 0
      ? Math.round(totalScore / completedAttempts.length)
      : 0;

  const contentMap = new Map<string, TestAnalytics>();

  attempts.forEach((attempt) => {
    const testId = attempt.test_id;
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

  const totalAttempts = attempts?.length ?? 0;
  const completed = (attempts ?? []).filter((a) => a.status === "completed");

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

  const totalAttempts = attempts.length;

  const totalScore = attempts.reduce(
    (sum, a) => sum + (Number(a.score) || 0),
    0,
  );
  const averageTotalScore = Math.round(totalScore / totalAttempts);

  const totalBasicScore = attempts.reduce(
    (sum, a) => sum + (Number(a.basic_score) || Number(a.score) || 0),
    0,
  );
  const averageBasicScore = Math.round(totalBasicScore / totalAttempts);

  const totalAiScore = attempts.reduce(
    (sum, a) => sum + (Number(a.ai_score) || 0),
    0,
  );
  const averageAiScore = Math.round(totalAiScore / totalAttempts);

  const totalEngagement = attempts.reduce(
    (sum, a) => sum + (Number(a.learning_engagement_rate) || 0),
    0,
  );
  const averageLearningEngagement = Math.round(totalEngagement / totalAttempts);

  const firstScore = Number(attempts[0].score) || 0;
  const lastScore = Number(attempts[attempts.length - 1].score) || 0;
  const improvementRate = lastScore - firstScore;

  const variance =
    attempts.reduce(
      (sum, a) => sum + Math.pow((Number(a.score) || 0) - averageTotalScore, 2),
      0,
    ) / (totalAttempts || 1);
  const stdDev = Math.sqrt(variance);
  const consistencyScore = Math.max(0, Math.round(100 - stdDev));

  const totalHints = attempts.reduce((sum, a) => sum + (a.hints_used || 0), 0);
  const averageHintUsage = Number(
    (totalHints / (totalAttempts || 1)).toFixed(1),
  );

  const totalTime = attempts.reduce(
    (sum, a) => sum + (a.time_taken_seconds || 0),
    0,
  );
  const averageTime = Math.round(totalTime / (totalAttempts || 1));

  await savePerformanceMetrics({
    studentId,
    testId,
    averageBasicScore,
    averageAiScore,
    totalAttempts,
    improvementRate,
    consistencyScore,
    averageHintUsage,
    averageLearningEngagement,
    averageTimeEfficiency: averageTime,
    strongTopics: [],
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
    query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`, {
      foreignTable: "student",
    });
  }

  const { data, count, error } = await query
    .order("started_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  type AttemptRow = Tables<"test_attempts"> & {
    test?: { title: string } | null;
    student?: { name: string; email: string } | null;
  };

  const rows = (data ?? []) as unknown as AttemptRow[];

  return {
    data: rows.map((attempt) => ({
      ...attempt,
      testTitle: attempt.test?.title,
      studentName:
        attempt.student?.name || attempt.student?.email || "Unknown",
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

  type PerformanceMetricRow = Tables<"performance_metrics"> & {
    test: { title: string } | null;
    student: { name: string; email: string } | null;
  };

  const metrics = (data ?? []) as unknown as PerformanceMetricRow[];

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

  const metrics = (data ?? []) as unknown as MetricRow[];

  return metrics.map((m) => ({
    studentId: m.student_id,
    averageBasicScore: Number(m.average_basic_score) || 0,
    studentAvatar: m.student?.avatar_url || "Unknown",
    testTitle: m.test?.title || "Unknown",
  }));
}
