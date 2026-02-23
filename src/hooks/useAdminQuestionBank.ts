import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  useLessons,
  useAnalyzeDocument,
  useGenerateQuestionVariants,
  useSaveQuestionBankItems,
  useEvaluateQuestionQuality,
  useRegenerateQuestionVariant,
} from "@/hooks/useApi";
import { extractTextFromUrl } from "@/utils/fileParser";
import { DocumentAnalysis } from "@/types";
import {
  variantGenerationSchema,
  VariantGenerationForm,
} from "@/schemas/questionBank";

export function useAdminQuestionBank() {
  // UI States (Purely for visual toggles, not field values)
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysis | null>(
    null,
  );
  const [extractedText, setExtractedText] = useState("");

  // Evaluation Loading States
  const [evaluatingIndex, setEvaluatingIndex] = useState<number | null>(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(
    null,
  );

  // API Hooks
  const { data: lessons, isLoading: isLoadingLessons } = useLessons();
  const analyzeDocument = useAnalyzeDocument();
  const generateVariants = useGenerateQuestionVariants();
  const saveQuestions = useSaveQuestionBankItems();
  const evaluateQuestion = useEvaluateQuestionQuality();
  const regenerateQuestion = useRegenerateQuestionVariant();

  // Form setup - managing ALL field values
  const form = useForm<VariantGenerationForm>({
    resolver: zodResolver(variantGenerationSchema),
    defaultValues: {
      lessonId: "",
      title: "",
      configurations: [
        {
          topics: [],
          concepts: [],
          difficulty: 1,
          marks: 1,
          variantCount: 5,
        },
      ],
      generatedQuestions: [],
    },
  });

  // Config field array
  const {
    fields: configFields,
    append: appendConfig,
    remove: removeConfig,
  } = useFieldArray({
    control: form.control,
    name: "configurations",
  });

  // Questions field array
  const {
    fields: questionFields,
    replace: replaceQuestions,
    update: updateQuestion,
  } = useFieldArray({
    control: form.control,
    name: "generatedQuestions",
  });

  const handleAnalyze = async () => {
    const lessonId = form.getValues("lessonId");
    if (!lessonId) {
      toast.error("Please select a lesson to analyze");
      return;
    }

    const lesson = lessons?.find((l) => l.id === lessonId);
    if (!lesson || !lesson.files || lesson.files.length === 0) {
      toast.error("Selected lesson has no files");
      return;
    }

    setIsAnalyzing(true);
    try {
      let fullText = "";
      for (const file of lesson.files) {
        try {
          const text = await extractTextFromUrl(file.url, file.type, file.name);
          fullText += `\n--- File: ${file.name} ---\n${text}`;
        } catch (e) {
          console.warn(`Could not parse ${file.name}`, e);
        }
      }

      if (!fullText.trim()) {
        throw new Error("No text could be extracted");
      }
      setExtractedText(fullText);

      const analysis = await analyzeDocument.mutateAsync({ content: fullText });
      setAnalysisResult(analysis);

      setIsDrawerOpen(true);
    } catch (error) {
      console.error(error);
      toast.error("Failed to analyze document");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onSubmitGenerate = async () => {
    if (!extractedText) return;

    const validConfigs = form
      .getValues("configurations")
      .filter((c) => c.topics.length > 0 && c.concepts.length > 0);

    if (validConfigs.length === 0) {
      toast.error(
        "Please ensure you have selected topics and concepts for configuration",
      );
      return;
    }

    try {
      const response = await generateVariants.mutateAsync({
        documentText: extractedText,
        configurations: validConfigs,
      });

      const initQs = response.questions.map((q) => ({
        ...q,
        evaluateResult: null,
        isDirty: false,
      }));

      // Replace the field array content
      replaceQuestions(initQs);

      setIsDrawerOpen(false);
      toast.success(
        `Generated ${response.questions.length} variant questions.`,
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate variants");
    }
  };

  const handleEvaluateQuestion = async (idx: number) => {
    const questions = form.getValues("generatedQuestions");
    const questionToEval = questions[idx];

    if (!questionToEval.title || !questionToEval.answer) {
      toast.error("Question text and answer are required for evaluation.");
      return;
    }

    setEvaluatingIndex(idx);
    try {
      const result = await evaluateQuestion.mutateAsync({
        question: questionToEval.title,
        answer: questionToEval.answer,
        working: questionToEval.working,
      });

      // Update the question in useFieldArray
      updateQuestion(idx, {
        ...questionToEval,
        evaluateResult: result,
      });

      if (result.isCorrect) {
        toast.success("Question looks good according to AI!");
      } else {
        toast.warning("AI flagged some potential issues with this question.");
      }
    } catch (error) {
      console.error("Evaluation failed", error);
      toast.error("Failed to evaluate question");
    } finally {
      setEvaluatingIndex(null);
    }
  };

  const handleRegenerateQuestion = async (idx: number) => {
    const questions = form.getValues("generatedQuestions");
    console.log(form.formState.dirtyFields);
    const q = questions[idx];

    setRegeneratingIndex(idx);
    try {
      const result = await regenerateQuestion.mutateAsync({
        documentText: extractedText,
        currentQuestion: {
          title: q.title,
          answer: q.answer,
          topics: q.topics,
          concepts: q.concepts,
          difficulty: q.difficulty,
          marks: q.marks,
          working: q.working,
        },
      });

      // Update the question in useFieldArray with the new data
      updateQuestion(idx, {
        ...result,
        evaluateResult: null,
        isDirty: false,
      });

      toast.success("Question regenerated successfully!");
    } catch (error) {
      console.error("Regeneration failed", error);
      toast.error("Failed to regenerate question");
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleSave = async () => {
    const questions = form.getValues("generatedQuestions");
    if (questions.length === 0) return;

    const lessonId = form.getValues("lessonId");

    try {
      const payload = questions.map((q) => ({
        ...q,
        lessonId: lessonId || undefined,
      }));

      await saveQuestions.mutateAsync(payload);
      toast.success(`Saved ${questions.length} questions to the bank!`);

      // Reset everything after successful save
      form.reset({
        lessonId: "",
        title: "",
        configurations: [
          {
            topics: [],
            concepts: [],
            difficulty: 1,
            marks: 1,
            variantCount: 5,
          },
        ],
        generatedQuestions: [],
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to save to Question Bank");
    }
  };

  return {
    form,
    configFields,
    appendConfig,
    removeConfig,
    questionFields,
    lessons,
    isLoadingLessons,
    isAnalyzing,
    isDrawerOpen,
    setIsDrawerOpen,
    analysisResult,
    evaluatingIndex,
    regeneratingIndex,
    handleAnalyze,
    onSubmitGenerate,
    handleEvaluateQuestion,
    handleRegenerateQuestion,
    handleSave,
    saveQuestionsPending: saveQuestions.isPending,
    generateVariantsPending: generateVariants.isPending,
  };
}
