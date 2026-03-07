/**
 * Test & Question API – test CRUD, questions, pool.
 * Types from @/integrations/supabase/types.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

const DEFAULT_TESTS_PAGE_SIZE = 1000;

export interface GetTestsResult {
  items: ReturnType<typeof mapTestRow>[];
  total: number;
}

export async function getTests(filters?: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<GetTestsResult> {
  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters?.pageSize ?? DEFAULT_TESTS_PAGE_SIZE));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("tests").select("*", { count: "exact" });
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.search) query = query.ilike("title", `%${filters.search}%`);

  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) throw error;

  const total = count ?? 0;
  const items = (data ?? []).map((row) => mapTestRow(row as Tables<"tests">));
  return { items, total };
}

export async function getQuestionById(questionId: string) {
  const { data: q, error } = await supabase
    .from("questions")
    .select("*")
    .eq("id", questionId)
    .single();
  if (error || !q) return null;
  return mapQuestionRow(q);
}

export async function getTestWithQuestions(testId: string) {
  const { data: test, error: testError } = await supabase
    .from("tests")
    .select("*")
    .eq("id", testId)
    .single();
  if (testError || !test) return null;

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("*")
    .eq("test_id", testId)
    .order("order", { ascending: true });
  if (questionsError) throw questionsError;

  const testRow = test as Tables<"tests">;
  return {
    ...mapTestRow(testRow),
    totalMark: testRow.total_mark ?? 0,
    numberOfQuestions: testRow.number_of_questions ?? undefined,
    questions: (questions ?? []).map((q) => mapQuestionRow(q)),
  };
}

export async function createTest(data: {
  title: string;
  description: string;
  scheduledDate: Date;
  duration: number;
  lessonId?: string;
  status?: string;
  totalMark?: number;
  numberOfQuestions?: number | null;
  conditions?: unknown;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const insert: TablesInsert<"tests"> = {
    title: data.title,
    description: data.description,
    scheduled_date: data.scheduledDate.toISOString(),
    duration: data.duration,
    lesson_id: data.lessonId ?? null,
    created_by: user.id,
    status: data.status ?? "draft",
    question_count: 0,
    total_mark: data.totalMark ?? 0,
    number_of_questions: data.numberOfQuestions ?? null,
    conditions: (data.conditions as TablesInsert<"tests">["conditions"]) ?? null,
  };

  const { data: newTest, error } = await supabase
    .from("tests")
    .insert(insert)
    .select()
    .single();
  if (error) throw error;
  return mapTestRow(newTest as Tables<"tests">);
}

export async function updateTest(testId: string, data: Partial<{
  title: string;
  description: string;
  scheduledDate: Date;
  duration: number;
  lessonId?: string;
  status?: string;
  totalMark?: number;
  numberOfQuestions?: number | null;
  questionCount?: number;
  conditions?: unknown;
}>) {
  if (
    data.numberOfQuestions !== undefined &&
    data.numberOfQuestions !== null &&
    data.numberOfQuestions > 0
  ) {
    // If caller is updating questionCount in the same request, validate against that value.
    // Otherwise validate against the current stored question_count.
    const poolCount =
      typeof data.questionCount === "number"
        ? data.questionCount
        : ((
            await supabase
              .from("tests")
              .select("question_count")
              .eq("id", testId)
              .single()
          ).data as { question_count?: number } | null)?.question_count ?? 0;
    if (data.numberOfQuestions > poolCount) {
      throw new Error("Number of questions cannot exceed selected question count");
    }
  }

  const updates: TablesUpdate<"tests"> = {};
  if (data.title) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.scheduledDate) updates.scheduled_date = data.scheduledDate.toISOString();
  if (data.duration !== undefined) updates.duration = data.duration;
  if (data.status) updates.status = data.status;
  if (data.lessonId !== undefined) updates.lesson_id = data.lessonId;
  if (data.totalMark !== undefined) updates.total_mark = data.totalMark;
  if (data.numberOfQuestions !== undefined) updates.number_of_questions = data.numberOfQuestions;
  if (data.questionCount !== undefined) updates.question_count = data.questionCount;
  if (data.conditions !== undefined) updates.conditions = data.conditions as TablesUpdate<"tests">["conditions"];

  const { data: updatedTest, error } = await supabase
    .from("tests")
    .update(updates)
    .eq("id", testId)
    .select()
    .single();
  if (error) throw error;
  return mapTestRow(updatedTest as Tables<"tests">);
}

export async function deleteTest(testId: string): Promise<void> {
  const { error } = await supabase.from("tests").delete().eq("id", testId);
  if (error) throw error;
}

export async function addQuestion(
  testId: string,
  question: Omit<Tables<"questions">, "id" | "test_id">,
) {
  const { data: newQuestion, error } = await supabase
    .from("questions")
    .insert({
      test_id: testId,
      question_text: question.question_text,
      correct_answer: question.correct_answer,
      order: question.order,
      topic: question.topic,
      concept: question.concept,
      mark: question.mark,
      difficulty: question.difficulty,
      working: question.working,
      difficultyReason: question.difficultyReason,
      hints: question.hints,
      micro_learning: question.micro_learning,
    } as never)
    .select()
    .single();
  if (error) throw error;
  return mapQuestionRow(newQuestion as Tables<"questions">);
}

export async function updateQuestion(
  questionId: string,
  data: Partial<Tables<"questions">>,
) {
  const finalUpdates: TablesUpdate<"questions"> = {};
  if (data.question_text !== undefined) finalUpdates.question_text = data.question_text;
  if (data.correct_answer !== undefined) finalUpdates.correct_answer = data.correct_answer;
  if (data.hints !== undefined) finalUpdates.hints = data.hints;
  if (data.micro_learning !== undefined) finalUpdates.micro_learning = data.micro_learning;
  if (data.order !== undefined) finalUpdates.order = data.order;
  const { data: updatedQuestion, error } = await supabase
    .from("questions")
    .update(finalUpdates)
    .eq("id", questionId)
    .select()
    .single();
  if (error) throw error;
  return mapQuestionRow(updatedQuestion as Tables<"questions">);
}

export async function deleteQuestion(questionId: string): Promise<void> {
  const { error } = await supabase.from("questions").delete().eq("id", questionId);
  if (error) throw error;
}

export async function getUpcomingTests(studentId: string) {
  const { data, error } = await supabase
    .from("tests")
    .select("*")
    .or("status.eq.active,status.eq.scheduled")
    .limit(2);
  if (error) throw error;
  return (data ?? []).map((row) => mapTestRow(row as Tables<"tests">));
}

function parseConditions(conditions: unknown): { topics: string[]; concept: string[]; difficulty: number; numberOfQuestions: number }[] | undefined {
  if (conditions == null || !Array.isArray(conditions)) return undefined;
  const out: { topics: string[]; concept: string[]; difficulty: number; numberOfQuestions: number }[] = [];
  for (const c of conditions) {
    if (c && typeof c === "object" && Array.isArray((c as { topics?: unknown }).topics) && Array.isArray((c as { concept?: unknown }).concept)) {
      const x = c as { topics: string[]; concept: string[]; difficulty?: number; numberOfQuestions?: number };
      out.push({
        topics: x.topics ?? [],
        concept: x.concept ?? [],
        difficulty: typeof x.difficulty === "number" ? x.difficulty : 1,
        numberOfQuestions: typeof x.numberOfQuestions === "number" ? x.numberOfQuestions : 0,
      });
    }
  }
  return out.length ? out : undefined;
}

function mapTestRow(row: Tables<"tests">) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    scheduledDate: new Date(row.scheduled_date),
    duration: row.duration,
    createdAt: new Date(row.created_at),
    createdBy: row.created_by,
    lessonId: row.lesson_id ?? undefined,
    questionCount: row.question_count,
    totalMark: row.total_mark ?? 0,
    numberOfQuestions: row.number_of_questions ?? undefined,
    conditions: parseConditions(row.conditions),
  };
}

function mapQuestionRow(row: Tables<"questions">) {
  return {
    id: row.id,
    testId: row.test_id,
    questionText: row.question_text,
    correctAnswer: row.correct_answer,
    hints: row.hints ?? [],
    microLearning: row.micro_learning ?? "",
    order: row.order,
    maxAttemptsBeforeStudy: row.max_attempts_before_study ?? undefined,
    topic: row.topic ?? "",
    concept: row.concept ?? "",
    mark: row.mark ?? 0,
    difficulty: row.difficulty ?? 1,
    working: row.working ?? "",
    difficultyReason: row.difficultyReason ?? undefined,
  };
}
