import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api-client";
import { API_ROUTES } from "@/config/routes";
import { User } from "@/types/db";

export function useCurrentUser() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ["currentUser", userId],
    queryFn: async () => {
      if (!userId) throw new Error("No token found");
      return apiFetch.get<User>(API_ROUTES.USERS.ME(userId));
    },
    enabled: !!userId,
    retry: false,
  });
}
