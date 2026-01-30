import { useQuery } from "@tanstack/react-query";
import * as adminService from "../services/admin.service";
import { UserRole } from "@/types";

export const adminQueryKeys = {
  users: (filters?: { role?: UserRole; search?: string }) =>
    ["users", filters] as const,
  user: (id: string) => ["user", id] as const,
  analytics: ["analytics"] as const,
  testAnalytics: (testId: string) => ["analytics", "test", testId] as const,
};

export function useUsers(filters?: {
  role?: UserRole;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: adminQueryKeys.users(filters),
    queryFn: () => adminService.getUsers(filters),
  });
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: adminQueryKeys.user(userId),
    queryFn: () => adminService.getUserById(userId),
    enabled: !!userId,
  });
}

export function useAnalytics() {
  return useQuery({
    queryKey: adminQueryKeys.analytics,
    queryFn: adminService.getOverallAnalytics,
  });
}

export function useTestAnalytics(testId: string) {
  return useQuery({
    queryKey: adminQueryKeys.testAnalytics(testId),
    queryFn: () => adminService.getTestAnalytics(testId),
    enabled: !!testId,
  });
}
