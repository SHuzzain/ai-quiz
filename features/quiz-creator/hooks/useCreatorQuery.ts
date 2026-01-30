import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as creatorService from "../services/creator.service";
import { Test, Question } from "@/types";

export const creatorQueryKeys = {
  tests: (filters?: { status?: Test["status"]; search?: string }) =>
    ["tests", filters] as const,
  test: (id: string) => ["test", id] as const,
  testWithQuestions: (id: string) => ["test", id, "questions"] as const,
  lessons: ["lessons"] as const,
};

export function useTests(filters?: {
  status?: Test["status"];
  search?: string;
}) {
  return useQuery({
    queryKey: creatorQueryKeys.tests(filters),
    queryFn: () => creatorService.getTests(filters),
  });
}

export function useTest(testId: string) {
  return useQuery({
    queryKey: creatorQueryKeys.test(testId),
    queryFn: async () => {
      const test = await creatorService.getTestWithQuestions(testId);
      return test as Test | null;
    },
    enabled: !!testId,
  });
}

export function useTestWithQuestions(testId: string) {
  return useQuery({
    queryKey: creatorQueryKeys.testWithQuestions(testId),
    queryFn: () => creatorService.getTestWithQuestions(testId),
    enabled: !!testId,
  });
}

export function useCreateTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: creatorService.createTest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
    },
  });
}

export function useUpdateTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ testId, data }: { testId: string; data: Partial<Test> }) =>
      creatorService.updateTest(testId, data),
    onSuccess: (_, { testId }) => {
      queryClient.invalidateQueries({
        queryKey: creatorQueryKeys.test(testId),
      });
      queryClient.invalidateQueries({ queryKey: ["tests"] });
    },
  });
}

export function useDeleteTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: creatorService.deleteTest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
    },
  });
}

export function useExtractQuestions() {
  return useMutation({
    mutationFn: (data: { file: File; questionCount: number }) =>
      creatorService.extractQuestionsFromFile(data),
  });
}

export function useAddQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      testId,
      question,
    }: {
      testId: string;
      question: Omit<Question, "id" | "testId">;
    }) => creatorService.addQuestion(testId, question),
    onSuccess: (_, { testId }) => {
      queryClient.invalidateQueries({
        queryKey: creatorQueryKeys.testWithQuestions(testId),
      });
    },
  });
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      questionId,
      data,
    }: {
      questionId: string;
      data: Partial<Question>;
    }) => creatorService.updateQuestion(questionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test"] });
    },
  });
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: creatorService.deleteQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test"] });
    },
  });
}

export function useGuessAnswer() {
  return useMutation({
    mutationFn: creatorService.guessAnswer,
  });
}

export function useGenerateHints() {
  return useMutation({
    mutationFn: (data: { questionText: string; correctAnswer: string }) =>
      creatorService.generateHints(data),
  });
}

export function useGenerateMicroLearning() {
  return useMutation({
    mutationFn: (data: { questionText: string; correctAnswer: string }) =>
      creatorService.generateMicroLearning(data),
  });
}

export function useLessons() {
  return useQuery({
    queryKey: creatorQueryKeys.lessons,
    queryFn: creatorService.getLessons,
  });
}

export function useUploadLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: creatorService.uploadLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creatorQueryKeys.lessons });
    },
  });
}

export function useDeleteLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: creatorService.deleteLesson,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creatorQueryKeys.lessons });
    },
  });
}
