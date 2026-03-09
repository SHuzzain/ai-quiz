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

export interface AnalyticsFilters {
  studentId?: string;
  testId?: string;
  topic?: string;
  concept?: string;
}

export interface AnalyticsFilterOptions {
  students: { id: string; name: string }[];
  tests: { id: string; title: string }[];
  topics: string[];
  concepts: string[];
}

/** Extract unique topics and concepts from tests.conditions JSONB */
function getTestConditionValues(conditions: Json | null): { topics: string[]; concepts: string[] } {
  const topics = new Set<string>();
  const concepts = new Set<string>();
  if (conditions == null || !Array.isArray(conditions)) return { topics: [], concepts: [] };
  for (const c of conditions) {
    if (c && typeof c === "object") {
      const x = c as { topics?: string[]; concept?: string[] };
      (x.topics ?? []).forEach((t) => topics.add(t));
      (x.concept ?? []).forEach((c) => concepts.add(c));
    }
  }
  return {
    topics: Array.from(topics).filter(Boolean).sort(),
    concepts: Array.from(concepts).filter(Boolean).sort(),
  };
}

/**
 * Get filter options for analytics (students, tests, topics, concepts)
 */
export async function getAnalyticsFilterOptions(): Promise<AnalyticsFilterOptions> {
  const [studentsRes, testsRes] = await Promise.all([
    supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "student"),
    supabase.from("tests").select("id, title, conditions"),
  ]);

  const studentIds = (studentsRes.data ?? []).map((r) => r.user_id);
  const tests = (testsRes.data ?? []) as { id: string; title: string; conditions: Json }[];

  let students: { id: string; name: string }[] = [];
  if (studentIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name")
      .in("user_id", studentIds);
    const nameByUserId = new Map<string, string>();
    (profiles ?? []).forEach((p) => nameByUserId.set(p.user_id, p.name || p.user_id));
    students = studentIds.map((id) => ({ id, name: nameByUserId.get(id) || id }));
  }

  const topicsSet = new Set<string>();
  const conceptsSet = new Set<string>();
  tests.forEach((t) => {
    const { topics: tTopics, concepts: tConcepts } = getTestConditionValues(t.conditions);
    tTopics.forEach((x) => topicsSet.add(x));
    tConcepts.forEach((x) => conceptsSet.add(x));
  });
  const topics = Array.from(topicsSet).filter(Boolean).sort();
  const concepts = Array.from(conceptsSet).filter(Boolean).sort();

  return {
    students,
    tests: tests.map((t) => ({ id: t.id, title: t.title })),
    topics,
    concepts,
  };
}

/** Get test IDs that have the given topic or concept in conditions */
async function getTestIdsByTopicOrConcept(
  topic?: string,
  concept?: string,
): Promise<Set<string> | null> {
  if (!topic && !concept) return null;
  const { data: tests } = await supabase.from("tests").select("id, conditions");
  if (!tests?.length) return new Set();
  const ids = new Set<string>();
  for (const t of tests as { id: string; conditions: Json }[]) {
    const { topics: topicsList, concepts: conceptsList } = getTestConditionValues(t.conditions);
    const matchTopic = !topic || topicsList.some((x) => x === topic);
    const matchConcept = !concept || conceptsList.some((x) => x === concept);
    if (matchTopic && matchConcept) ids.add(t.id);
  }
  return ids;
}

/**
 * Get overall analytics, optionally filtered by student, test, topic, concept
 */
export async function getOverallAnalytics(
  filters?: AnalyticsFilters,
): Promise<OverallAnalytics> {
  const { count: testsCount } = await supabase
    .from("tests")
    .select("*", { count: "exact", head: true });

  const { count: studentsCount } = await supabase
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", "student");

  let query = supabase.from("test_attempts").select(`
      id,
      score,
      time_taken_seconds,
      hints_used,
      status,
      test_id,
      student_id,
      completed_at,
      test:tests(title)
    `);

  if (filters?.studentId) {
    query = query.eq("student_id", filters.studentId);
  }
  if (filters?.testId) {
    query = query.eq("test_id", filters.testId);
  }

  const { data: attemptsData, error } = await query;
  if (error) throw error;

  let attempts = attemptsData || [];

  if (filters?.topic || filters?.concept) {
    const allowedTestIds = await getTestIdsByTopicOrConcept(filters.topic, filters.concept);
    if (allowedTestIds && allowedTestIds.size > 0) {
      attempts = attempts.filter((a: { test_id: string }) => allowedTestIds.has(a.test_id));
    } else if (allowedTestIds && allowedTestIds.size === 0) {
      attempts = [];
    }
  }

  const totalAttempts = attempts.length;

  const completedAttempts = attempts.filter((a: { status: string }) => a.status === "completed");
  const totalScore = completedAttempts.reduce(
    (sum: number, a: { score?: number }) => sum + (a.score || 0),
    0,
  );
  const averageScore =
    completedAttempts.length > 0
      ? Math.round(totalScore / completedAttempts.length)
      : 0;

  const contentMap = new Map<string, TestAnalytics>();

  attempts.forEach((attempt: { test_id: string; test: unknown; status: string; score?: number; time_taken_seconds?: number; hints_used?: number }) => {
    const testId = attempt.test_id;
    const testData = attempt.test as { title: string } | null;
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
      const testAttempts = attempts.filter((a: { test_id: string }) => a.test_id === metric.testId);
      const completed = testAttempts.filter((a: { status: string }) => a.status === "completed");

      const avgScore =
        completed.length > 0
          ? completed.reduce((sum: number, a: { score?: number }) => sum + (a.score || 0), 0) /
            completed.length
          : 0;

      const avgTime =
        completed.length > 0
          ? completed.reduce((sum: number, a: { time_taken_seconds?: number }) => sum + (a.time_taken_seconds || 0), 0) /
            completed.length
          : 0;

      const avgHints =
        completed.length > 0
          ? completed.reduce((sum: number, a: { hints_used?: number }) => sum + (a.hints_used || 0), 0) /
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
    totalTests: testsCount || 0,
    totalStudents: studentsCount || 0,
    totalAttempts: totalAttempts,
    averageScore,
    testAnalytics,
  };
}

export interface ScoreOverTimePoint {
  date: string;
  attempts: number;
  avgScore: number;
}

export interface CompletionBreakdownItem {
  name: string;
  value: number;
}

export interface HintsDistributionItem {
  range: string;
  count: number;
}

export interface AnalyticsChartsData {
  scoreOverTime: ScoreOverTimePoint[];
  completionBreakdown: CompletionBreakdownItem[];
  hintsDistribution: HintsDistributionItem[];
}

/**
 * Get chart-ready data for analytics (score trend, completion, hints), with optional filters
 */
export async function getAnalyticsChartsData(
  filters?: AnalyticsFilters,
): Promise<AnalyticsChartsData> {
  let query = supabase.from("test_attempts").select(`
      test_id,
      score,
      status,
      hints_used,
      completed_at
    `);

  if (filters?.studentId) query = query.eq("student_id", filters.studentId);
  if (filters?.testId) query = query.eq("test_id", filters.testId);

  const { data: attemptsData, error } = await query;
  if (error) throw error;

  let list = (attemptsData ?? []) as {
    test_id: string;
    score: number | null;
    status: string;
    hints_used: number | null;
    completed_at: string | null;
  }[];

  if (filters?.topic || filters?.concept) {
    const allowedTestIds = await getTestIdsByTopicOrConcept(filters.topic, filters.concept);
    if (allowedTestIds && allowedTestIds.size === 0) {
      list = [];
    } else if (allowedTestIds && allowedTestIds.size > 0) {
      list = list.filter((a) => allowedTestIds.has(a.test_id));
    }
  }

  const byDate: Record<string, { sum: number; count: number }> = {};
  const completionCounts: Record<string, number> = { completed: 0, in_progress: 0, abandoned: 0 };
  const hintsBuckets: Record<string, number> = { "0": 0, "1-2": 0, "3-5": 0, "6+": 0 };

  for (const a of list) {
    const status = (a.status === "completed" ? "completed" : a.status === "in_progress" ? "in_progress" : "abandoned") as keyof typeof completionCounts;
    completionCounts[status] = (completionCounts[status] ?? 0) + 1;

    const hints = a.hints_used ?? 0;
    if (hints <= 0) hintsBuckets["0"]++;
    else if (hints <= 2) hintsBuckets["1-2"]++;
    else if (hints <= 5) hintsBuckets["3-5"]++;
    else hintsBuckets["6+"]++;

    const dateStr = a.completed_at ? a.completed_at.slice(0, 10) : null;
    if (dateStr && a.status === "completed") {
      if (!byDate[dateStr]) byDate[dateStr] = { sum: 0, count: 0 };
      byDate[dateStr].count++;
      byDate[dateStr].sum += a.score ?? 0;
    }
  }

  const scoreOverTime: ScoreOverTimePoint[] = Object.entries(byDate)
    .map(([date, v]) => ({ date, attempts: v.count, avgScore: v.count > 0 ? Math.round(v.sum / v.count) : 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const completionBreakdown: CompletionBreakdownItem[] = [
    { name: "Completed", value: completionCounts.completed ?? 0 },
    { name: "In Progress", value: completionCounts.in_progress ?? 0 },
    { name: "Abandoned", value: completionCounts.abandoned ?? 0 },
  ].filter((x) => x.value > 0);

  const hintsDistribution: HintsDistributionItem[] = [
    { range: "0", count: hintsBuckets["0"] },
    { range: "1-2", count: hintsBuckets["1-2"] },
    { range: "3-5", count: hintsBuckets["3-5"] },
    { range: "6+", count: hintsBuckets["6+"] },
  ];

  return { scoreOverTime, completionBreakdown, hintsDistribution };
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
  filters?: { search?: string; testId?: string; studentId?: string },
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

  if (filters?.studentId) {
    query = query.eq("student_id", filters.studentId);
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
export async function getAllStudentMetrics(testId?: string, studentId?: string) {
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

  if (studentId) {
    query = query.eq("student_id", studentId);
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
    averageLearningEngagement: Number(m.average_learning_engagement) || 0,
    totalAttempts: m.total_attempts || 0,
    studentName: m.student?.name || "Unknown",
    studentAvatar: m.student?.avatar_url || "Unknown",
    testTitle: m.test?.title || "Unknown",
  }));
}
