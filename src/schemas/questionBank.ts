import { z } from "zod";

export const variantConfigSchema = z.object({
  id: z.string().optional(),
  topics: z.array(z.string()).min(1, "At least one topic is required"),
  concepts: z.array(z.string()).min(1, "At least one concept is required"),
  difficulty: z.number().min(1).max(5),
  difficultyReason: z.string().optional(),
  marks: z.number().min(1),
  variantCount: z.number().min(1).max(20),
  createdAt: z.string().date().optional(),
  updatedAt: z.string().date().optional(),
  createdBy: z.string().optional(),
});

export const evaluationResultSchema = z.object({
  isCorrect: z.boolean(),
  feedback: z.string(),
  suggestedImprovement: z.string().optional(),
});

export const questionItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Question title is required"),
  answer: z.string().min(1, "Answer is required"),
  topic: z.string().min(1),
  concept: z.string().min(1),
  difficulty: z.number().min(1).max(5),
  marks: z.number().min(1),
  working: z.string().optional(),
  difficultyReason: z.string().optional(),
  evaluateResult: evaluationResultSchema.nullable().optional(),
  isDirty: z.boolean().optional(),
});

export const variantGenerationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  lessonId: z.string().min(1, "Lesson ID is required"),
  configurations: z.array(variantConfigSchema).min(1),
  generatedQuestions: z.array(questionItemSchema).default([]),
});

export type VariantConfigForm = z.infer<typeof variantConfigSchema>;
export type QuestionItemForm = z.infer<typeof questionItemSchema>;
export type VariantGenerationForm = z.infer<typeof variantGenerationSchema>;
