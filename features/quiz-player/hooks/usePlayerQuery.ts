import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Test, TestAttempt, AttemptResult, TestWithQuestions } from "@/types";
import * as playerService from "../services/player.service";

export const playerQueryKeys = {
  upcomingTests: (studentId: string) => ["upcomingTests", studentId] as const,
  studentAttempts: (studentId: string) =>
    ["studentAttempts", studentId] as const,
  attemptResult: (attemptId: string) => ["attemptResult", attemptId] as const,
};

export function useUpcomingTests(studentId: string) {
  return useQuery({
    queryKey: playerQueryKeys.upcomingTests(studentId),
    queryFn: () => playerService.getUpcomingTests(studentId),
    enabled: !!studentId,
  });
}

export function useTestWithQuestions(testId: string) {
  return useQuery({
    queryKey: ["test", testId, "questions"], // Consistent key
    queryFn: () => playerService.getTestWithQuestions(testId),
    enabled: !!testId,
  });
}

export function useStudentAttempts(studentId: string) {
  return useQuery({
    queryKey: playerQueryKeys.studentAttempts(studentId),
    queryFn: () => playerService.getStudentAttempts(studentId),
    enabled: !!studentId,
  });
}

export function useStartAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      testId,
      studentId,
    }: {
      testId: string;
      studentId: string;
    }) => playerService.startTestAttempt(testId, studentId),
    onSuccess: (_, { studentId }) => {
      queryClient.invalidateQueries({
        queryKey: playerQueryKeys.studentAttempts(studentId),
      });
    },
  });
}

export function useSubmitAnswer() {
  return useMutation({
    mutationFn: playerService.submitAnswer,
  });
}

export function useHint() {
  return useMutation({
    mutationFn: ({
      attemptId,
      questionId,
      hintIndex,
    }: {
      attemptId: string;
      questionId: string;
      hintIndex: number;
    }) => playerService.useHintRequest(attemptId, questionId, hintIndex),
  });
}

export function useMicroLearning() {
  return useMutation({
    mutationFn: playerService.getMicroLearning,
  });
}

export function useCompleteAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: playerService.completeAttempt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentAttempts"] });
    },
  });
}

export function useAttemptResult(attemptId: string) {
  return useQuery({
    queryKey: playerQueryKeys.attemptResult(attemptId),
    queryFn: () => playerService.getAttemptResult(attemptId),
    enabled: !!attemptId,
  });
}
