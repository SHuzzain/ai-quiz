import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as creatorService from "../services/creator.service";
import { Question, Test } from "@prisma/client";

export const creatorQueryKeys = {
  tests: (filters?: { status?: Test["status"]; search?: string }) =>
    ["tests", filters] as const,
  test: (id: string) => ["test", id] as const,
  testWithQuestions: (id: string) => ["test", id, "questions"] as const,
  lessons: ["lessons"] as const,
};

export function useGetTests(filters?: {
  status?: Test["status"];
  search?: string;
}) {
  return useQuery({
    queryKey: creatorQueryKeys.tests(filters),
    queryFn: () => creatorService.getTests(filters),
  });
}

// Alias for compatibility if needed, but prefer useGetTests
export const useTests = useGetTests;

export function useGetTest(testId: string | null) {
  return useQuery({
    queryKey: creatorQueryKeys.test(testId || ""),
    queryFn: async () => {
      if (!testId) return null;
      const test = await creatorService.getTestWithQuestions(testId);
      return test;
    },
    enabled: !!testId,
  });
}

// Alias for compatibility
export const useTest = useGetTest;

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
    mutationFn: ({ id, data }: { id: string; data: Partial<Test> }) =>
      creatorService.updateTest(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: creatorQueryKeys.test(id),
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
    mutationFn: (data: {
      files: File[];
      questionCount: number;
      topics?: string[];
    }) => creatorService.extractQuestionsFromFile(data),
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

export function useAnalyzeDocument() {
  return useMutation({
    mutationFn: ({
      files,
      clarificationAnswer,
    }: {
      files: (
        | File
        | { name: string; text: string; type: "pdf" }
        | { file: File; name: string; type: "file" }
      )[];
      clarificationAnswer?: string;
    }) => creatorService.analyzeDocument(files, clarificationAnswer),
  });
}
