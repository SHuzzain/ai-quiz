import {
  User,
  UserRole,
  PaginatedResponse,
  OverallAnalytics,
  DashboardAnalytics,
} from "@/types";
import { mockUsers, mockOverallAnalytics } from "@/mocks/data";
import { API_ROUTES } from "@/config/routes";
import { apiFetch } from "@/lib/api-client";

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const MOCK_DELAY = 500;

/**
 * Get all users with optional filters
 */
export async function getUsers(filters?: {
  role?: UserRole;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<User>> {
  await delay(MOCK_DELAY);

  let filtered = [...mockUsers];

  if (filters?.role) {
    filtered = filtered.filter((u) => u.role === filters.role);
  }

  if (filters?.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(
      (u) =>
        u.name.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search),
    );
  }

  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    data: filtered.slice(start, end),
    total: filtered.length,
    page,
    pageSize,
    totalPages: Math.ceil(filtered.length / pageSize),
  };
}

/**
 * Get single user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  await delay(MOCK_DELAY);
  return mockUsers.find((u) => u.id === userId) || null;
}

/**
 * Get overall analytics
 */
export async function getOverallAnalytics() {
  const data = await apiFetch.get<DashboardAnalytics>(
    API_ROUTES.ADMIN.ANALYTICS.ROOT,
  );
  return data;
}

/**
 * Get analytics for a specific test
 */
export async function getTestAnalytics(testId: string) {
  const data = await apiFetch.get<OverallAnalytics[]>(
    API_ROUTES.ADMIN.ANALYTICS.ROOT,
  );
  return data;
}
