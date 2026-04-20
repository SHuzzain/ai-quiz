/**
 * Analytics API – Express backend
 */

import { apiGet, apiPost } from "@/lib/api-client";
import type {
  OverallAnalytics,
  PerformanceMetrics,
  TestAnalytics,
} from "@/types";
import { mapApiToTestAttempt } from "./attempts";

export async function getStudentPerformance(
  studentId: string,
  testId?: string,
): Promise<PerformanceMetrics[]> {
  const q = testId ? `?testId=${encodeURIComponent(testId)}` : "";
  return apiGet(`/analytics/student-performance/${studentId}${q}`);
}

export async function savePerformanceMetrics(
  metrics: Omit<PerformanceMetrics, "id" | "calculatedAt">,
): Promise<void> {
  await apiPost("/analytics/performance-metrics", metrics);
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

export async function getAnalyticsFilterOptions(): Promise<AnalyticsFilterOptions> {
  return apiGet("/analytics/filter-options");
}

export async function getOverallAnalytics(
  filters?: AnalyticsFilters,
): Promise<OverallAnalytics> {
  const params = new URLSearchParams();
  if (filters?.studentId) params.set("studentId", filters.studentId);
  if (filters?.testId) params.set("testId", filters.testId);
  if (filters?.topic) params.set("topic", filters.topic);
  if (filters?.concept) params.set("concept", filters.concept);
  const q = params.toString();
  return apiGet(`/analytics/overall${q ? `?${q}` : ""}`);
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

export async function getAnalyticsChartsData(
  filters?: AnalyticsFilters,
): Promise<AnalyticsChartsData> {
  const params = new URLSearchParams();
  if (filters?.studentId) params.set("studentId", filters.studentId);
  if (filters?.testId) params.set("testId", filters.testId);
  if (filters?.topic) params.set("topic", filters.topic);
  if (filters?.concept) params.set("concept", filters.concept);
  const q = params.toString();
  return apiGet(`/analytics/charts${q ? `?${q}` : ""}`);
}

export async function getTestAnalytics(testId: string) {
  return apiGet(`/analytics/test/${testId}`);
}

/** No-op: metrics are recalculated on the server after attempts. */
export async function calculateAndSaveMetrics(
  _studentId: string,
  _testId: string,
): Promise<void> {
  return Promise.resolve();
}

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
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (filters?.search) params.set("search", filters.search);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.minScore !== undefined) params.set("minScore", String(filters.minScore));
  if (filters?.maxScore !== undefined) params.set("maxScore", String(filters.maxScore));
  const res = await apiGet<{
    data: Record<string, unknown>[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>(`/analytics/all-attempts?${params.toString()}`);
  return {
    ...res,
    data: res.data.map((row) => mapApiToTestAttempt(row)),
  };
}

export async function getPerformanceMetrics(
  page = 1,
  pageSize = 20,
  filters?: { search?: string; testId?: string; studentId?: string },
) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (filters?.search) params.set("search", filters.search);
  if (filters?.testId) params.set("testId", filters.testId);
  if (filters?.studentId) params.set("studentId", filters.studentId);
  return apiGet(`/analytics/performance-metrics-list?${params.toString()}`);
}

export async function getAllStudentMetrics(testId?: string, studentId?: string) {
  const params = new URLSearchParams();
  if (testId) params.set("testId", testId);
  if (studentId) params.set("studentId", studentId);
  const q = params.toString();
  return apiGet(`/analytics/student-metrics${q ? `?${q}` : ""}`);
}
