"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import * as z from "zod";
import { toast } from "sonner";
import {
  useCreateTest,
  useUpdateTest,
  useGetTest,
  useExtractQuestions,
  useGenerateHints,
  useGenerateMicroLearning,
  useAnalyzeDocument,
  AIConversationDrawer,
} from "@/features/quiz-creator";
import { useAuth } from "@clerk/nextjs";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

const questionSchema = z.object({
  id: z.string().optional(),
  questionText: z.string().min(1, "Question text is required"),
  correctAnswer: z.string().min(1, "Correct answer is required"),
  hints: z.array(z.string()).min(1, "At least one hint is recommended"),
  microLearning: z.string().min(1, "Micro-learning explanation is required"),
});

const testSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  scheduledDate: z.date(),
  questions: z
    .array(questionSchema)
    .min(1, "At least one question is required"),
});

export type TestFormValues = z.infer<typeof testSchema>;

interface UseCreateTestFormProps {
  mode?: "create" | "edit";
  testId?: string;
}

export function useCreateTestForm({
  mode = "create",
  testId,
}: UseCreateTestFormProps = {}) {
  const router = useRouter();
  const { data } = useCurrentUser();
  const createTestMutation = useCreateTest();
  const updateTestMutation = useUpdateTest();
  const extractQuestionsMutation = useExtractQuestions();
  const generateHintsMutation = useGenerateHints();
  const generateMicroLearningMutation = useGenerateMicroLearning();
  const analyzeDocumentMutation = useAnalyzeDocument();

  // Fetch test data if in edit mode
  const { data: existingTest, isLoading: isLoadingTest } = useGetTest(
    mode === "edit" && testId ? testId : null,
  );

  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [analysisResult, setAnalysisResult] =
    React.useState<
      React.ComponentProps<typeof AIConversationDrawer>["analysis"]
    >(null);
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([]);

  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
      duration: 30,
      scheduledDate: new Date(),
      questions: [] as TestFormValues["questions"],
    },
    validators: {
      onSubmit: testSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        if (mode === "edit" && testId) {
          await updateTestMutation.mutateAsync({
            id: testId,
            data: {
              ...value,
              scheduledDate: new Date(value.scheduledDate),
            },
          });
          toast.success("Test updated successfully");
        } else {
          await createTestMutation.mutateAsync({
            ...value,
            scheduledDate: new Date(value.scheduledDate),
            createdBy: data?._id,
          });
          toast.success("Test created successfully");
        }
        router.push("/admin/tests");
        router.refresh();
      } catch (error) {
        toast.error(
          mode === "create" ? "Failed to create test" : "Failed to update test",
        );
        console.error(error);
      }
    },
  });

  // Populate form with existing data when loaded
  React.useEffect(() => {
    if (existingTest && mode === "edit") {
      form.setFieldValue("title", existingTest.title);
      form.setFieldValue("description", existingTest.description);
      form.setFieldValue("duration", existingTest.duration);
      form.setFieldValue("scheduledDate", new Date(existingTest.scheduledDate));

      // Map questions
      if (existingTest.questions) {
        const formattedQuestions = existingTest.questions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          correctAnswer: q.correctAnswer,
          hints: q.hints,
          microLearning: q.microLearning,
        }));
        form.setFieldValue("questions", formattedQuestions);
      }
    }
  }, [existingTest, mode, form]);

  const addEmptyQuestion = () => {
    const id = crypto.randomUUID();
    form.pushFieldValue("questions", {
      id,
      questionText: "",
      correctAnswer: "",
      hints: ["", "", ""],
      microLearning: "",
    });
  };

  const removeQuestion = (index: number) => {
    form.removeFieldValue("questions", index);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    if (uploadedFiles.length + selectedFiles.length > 2) {
      toast.error("You can upload a maximum of 2 files.");
      return;
    }

    setUploadedFiles((prev) => [...prev, ...selectedFiles]);
    e.target.value = "";
  };

  const handleAnalyzeFiles = async (clarificationAnswer?: string) => {
    if (uploadedFiles.length === 0) return;

    try {
      const processedFiles = await Promise.all(
        uploadedFiles.map(async (file) => {
          if (file.type === "application/pdf") {
            try {
              const { extractTextFromPDF } = await import("@/lib/pdf-utils");
              const text = await extractTextFromPDF(file);
              return { name: file.name, text, type: "pdf" as const };
            } catch (error) {
              console.error(`Failed to extract text from ${file.name}`, error);
              return { file, name: file.name, type: "file" as const }; // Fallback to server-side if client fails
            }
          }
          return { file, name: file.name, type: "file" as const };
        }),
      );

      const result = await analyzeDocumentMutation.mutateAsync({
        files: processedFiles,
        clarificationAnswer,
      });
      setAnalysisResult(result);
      setIsDrawerOpen(true);
      if (!clarificationAnswer) {
        toast.success("Documents analyzed successfully!");
      } else {
        toast.success("Analysis updated with your clarification!");
      }
    } catch (error) {
      toast.error("Failed to analyze documents");
      console.error(error);
    }
  };

  const viewFile = (file: File) => {
    const url = URL.createObjectURL(file);
    window.open(url, "_blank");
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAIConfirm = async (
    selectedTopics: string[],
    questionCount: number,
  ) => {
    if (uploadedFiles.length === 0) return;

    try {
      const result = await extractQuestionsMutation.mutateAsync({
        files: uploadedFiles,
        questionCount,
        topics: selectedTopics,
      });

      const newQuestions = result.questions.map((q) => ({
        ...q,
        id: crypto.randomUUID(),
      }));

      newQuestions.forEach((q) => form.pushFieldValue("questions", q));
      setIsDrawerOpen(false);
      toast.success(
        `Generated ${newQuestions.length} questions from selected topics!`,
      );
    } catch (error) {
      toast.error("Failed to generate questions");
      console.error(error);
    }
  };

  const handleGenerateHints = async (index: number) => {
    const question = form.getFieldValue(`questions[${index}]`);
    if (!question.questionText || !question.correctAnswer) {
      toast.warning(
        "Question text and correct answer are required for hint generation",
      );
      return;
    }

    try {
      const result = await generateHintsMutation.mutateAsync({
        questionText: question.questionText,
        correctAnswer: question.correctAnswer,
      });
      form.setFieldValue(`questions[${index}].hints`, result.hints);
      toast.success("Hints generated");
    } catch {
      toast.error("Failed to generate hints");
    }
  };

  const handleGenerateMicroLearning = async (index: number) => {
    const question = form.getFieldValue(`questions[${index}]`);
    if (!question.questionText || !question.correctAnswer) {
      toast.warning(
        "Question text and correct answer are required for micro-learning generation",
      );
      return;
    }

    try {
      const result = await generateMicroLearningMutation.mutateAsync({
        questionText: question.questionText,
        correctAnswer: question.correctAnswer,
      });
      form.setFieldValue(
        `questions[${index}].microLearning`,
        result.microLearning,
      );
      toast.success("Explanation generated");
    } catch {
      toast.error("Failed to generate explanation");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return {
    form,
    isDrawerOpen,
    analysisResult,
    uploadedFiles,
    isAnalyzing: analyzeDocumentMutation.isPending,
    isExtracting: extractQuestionsMutation.isPending,
    isCreating: createTestMutation.isPending,
    isUpdating: updateTestMutation.isPending,
    isLoadingTest,
    isGeneratingHints: generateHintsMutation.isPending,
    isGeneratingExplanation: generateMicroLearningMutation.isPending,
    setIsDrawerOpen,
    handleFileUpload,
    handleAnalyzeFiles,
    viewFile,
    removeFile,
    handleAIConfirm,
    handleGenerateHints,
    handleGenerateMicroLearning,
    addEmptyQuestion,
    removeQuestion,
    formatFileSize,
  };
}
