import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as authService from "../services/auth.service";

export const authQueryKeys = {
  currentUser: ["currentUser"] as const,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: authQueryKeys.currentUser,
    queryFn: authService.getCurrentUser,
    staleTime: Infinity,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.loginUser,
    onSuccess: (user) => {
      queryClient.setQueryData(authQueryKeys.currentUser, user);
    },
  });
}

export function useSignUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.signUpUser,
    onSuccess: (user) => {
      queryClient.setQueryData(authQueryKeys.currentUser, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.logoutUser,
    onSuccess: () => {
      queryClient.setQueryData(authQueryKeys.currentUser, null);
      queryClient.clear();
    },
  });
}
