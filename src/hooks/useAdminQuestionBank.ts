import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  useLessons,
  useSaveQuestionBankSet,
  useEvaluateQuestionQuality,
  useRegenerateQuestionVariant,
} from "@/hooks/useApi";
import { QuestionBankItem } from "@/types";
import {
  variantGenerationSchema,
  VariantGenerationForm,
} from "@/schemas/questionBank";

export function useAdminQuestionBank() {
  // Evaluation Loading States
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [lessonContent, setLessonContent] = useState("");

  // API Hooks
  const { data: lessons, isLoading: isLoadingLessons } = useLessons();
  const saveQuestionSet = useSaveQuestionBankSet();
  const evaluateQuestion = useEvaluateQuestionQuality();
  const regenerateQuestion = useRegenerateQuestionVariant();

  // Form setup
  const form = useForm<VariantGenerationForm>({
    resolver: zodResolver(variantGenerationSchema),
    defaultValues: {
      lessonId: "",
      title: "",
      configurations: [],
      generatedQuestions: [],
    },
  });

  // Questions field array
  const {
    fields: questionFields,
    append: appendQuestion,
    remove: removeQuestion,
    update: updateQuestion,
  } = useFieldArray({
    control: form.control,
    name: "generatedQuestions",
  });

  const commitQuestions = (newQuestions: QuestionBankItem[]) => {
    const mapped = newQuestions.map((q) => ({
      ...q,
      evaluateResult: null,
      isDirty: false,
    }));

    mapped.forEach((q) => appendQuestion(q));
    toast.success(`Added ${newQuestions.length} questions to the session.`);
  };

  const handleEvaluateQuestion = async (qId: string) => {
    const idx = questionFields.findIndex((f) => f.id === qId);
    if (idx === -1) return;

    const questions = form.getValues("generatedQuestions");
    const questionToEval = questions[idx];

    if (!questionToEval.title || !questionToEval.answer) {
      toast.error("Question text and answer are required for evaluation.");
      return;
    }

    setEvaluatingId(qId);
    try {
      const result = await evaluateQuestion.mutateAsync({
        question: questionToEval.title,
        answer: questionToEval.answer,
        working: questionToEval.working,
      });

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
      setEvaluatingId(null);
    }
  };

  const handleRegenerateQuestion = async (qId: string) => {
    const idx = questionFields.findIndex((f) => f.id === qId);
    if (idx === -1) return;

    const questions = form.getValues("generatedQuestions");
    const isDirtyFields = form.formState.dirtyFields.generatedQuestions?.[
      idx
    ] as Record<string, boolean>;
    const q = questions[idx];

    if (!lessonContent) {
      toast.error(
        "Lesson content not available. Please re-analyze the lesson.",
      );
      return;
    }

    setRegeneratingId(qId);
    try {
      const result = await regenerateQuestion.mutateAsync({
        documentText: lessonContent,
        currentQuestion: {
          title: q.title,
          answer: q.answer,
          topic: q.topic,
          concept: q.concept,
          difficulty: q.difficulty,
          marks: q.marks,
          working: q.working,
          isDirtyFields: isDirtyFields || {},
        },
      });

      updateQuestion(idx, {
        ...result,
        evaluateResult: null,
        isDirty: false,
      });

      toast.success("Question regenerated successfully!");
      form.reset(undefined, { keepValues: true, keepDirty: false });
    } catch (error) {
      console.error("Regeneration failed", error);
      toast.error("Failed to regenerate question");
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleSave = async () => {
    const questions = form.getValues("generatedQuestions");
    if (questions.length === 0) {
      toast.error("No questions to save");
      return;
    }

    const title = form.getValues("title");
    const lessonId = form.getValues("lessonId");

    if (!title || !lessonId) {
      toast.error("Set title and lesson selection are required");
      return;
    }

    try {
      const cleanQuestions = questions.map((q) => ({
        title: q.title,
        answer: q.answer,
        topic: q.topic,
        concept: q.concept,
        difficulty: q.difficulty,
        marks: q.marks,
        working: q.working,
        difficultyReason: q.difficultyReason,
      }));

      await saveQuestionSet.mutateAsync({
        title,
        lessonId,
        questions: cleanQuestions,
        configurations: [],
      });

      toast.success(`Saved set "${title}" with ${questions.length} questions!`);
      form.reset({
        lessonId: "",
        title: "",
        configurations: [],
        generatedQuestions: [],
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to save to Question Bank");
    }
  };

  return {
    form,
    generatedFields: questionFields,
    lessons,
    isLoadingLessons,
    evaluatingId,
    regeneratingId,
    commitQuestions,
    setLessonContent,
    handleEvaluateQuestion,
    handleRegenerateQuestion,
    handleSaveToBank: handleSave,
    saveItemsPending: saveQuestionSet.isPending,
    addEmptyQuestion: () =>
      appendQuestion({
        title: "",
        answer: "",
        topic: "",
        concept: "",
        marks: 1,
        difficulty: 1,
        working: "",
        evaluateResult: null,
        isDirty: false,
      }),
    removeQuestion,
    updateQuestionById: (
      qId: string,
      updates: Record<string, string | number | boolean | object>,
    ) => {
      const idx = questionFields.findIndex((f) => f.id === qId);
      if (idx !== -1) {
        const current = form.getValues(`generatedQuestions.${idx}`);
        updateQuestion(idx, {
          ...current,
          ...updates,
          isDirty: true,
        });
      }
    },
  };
}
