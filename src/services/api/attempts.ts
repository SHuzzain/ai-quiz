/**
 * Attempts API – test attempts, adaptive flow, submit answer, hints, complete.
 * Types from @/integrations/supabase/types. test_attempts rows mapped via Tables<"test_attempts">.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables, TablesUpdate } from "@/integrations/supabase/types";
import {
  resolveAvailableDifficulty,
  computeNextDifficulty,
  type AttemptHistoryItem,
} from "@/services/adaptiveEngine";
import type {
  TestAttempt,
  Question,
  Test,
  TestWithQuestions,
  AttemptResult,
} from "@/types";
import { getQuestionById } from "./tests";
import { calculateAndSaveMetrics } from "./analytics";

function mapAttemptRow(row: Tables<"test_attempts">) {
  return {
    id: row.id,
    studentId: row.student_id,
    testId: row.test_id,
    startedAt: new Date(row.started_at),
    status: row.status,
    totalQuestions: row.total_questions ?? 0,
    totalMark: row.total_mark ?? 0,
    correctAnswers: row.correct_answers ?? 0,
    hintsUsed: row.hints_used ?? 0,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    timeTakenSeconds: row.time_taken_seconds ?? 0,
    score: row.score ?? 0,
    basicScore: row.basic_score != null ? Number(row.basic_score) : undefined,
    aiScore: row.ai_score != null ? Number(row.ai_score) : undefined,
    currentQuestionId: row.current_question_id ?? undefined,
    attemptedQuestionsCount: row.attempted_question_ids?.length ?? 0,
  };
}

/**
 * Get student's past attempts
 */
export async function getStudentAttempts(
  studentId: string,
) {
  const { data, error } = await supabase
    .from("test_attempts")
    .select("*, tests(title)")
    .eq("student_id", studentId)
    .order("started_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? [])

  return rows.map((a) => ({
    ...mapAttemptRow(a),
    testTitle: a.tests?.title,
  }));
}

/**
 * Get single test attempt by ID (with test title and duration for UI).
 */
export async function getTestAttempt(
  attemptId: string,
) {
  const { data: row, error } = await supabase
    .from("test_attempts")
    .select("*, tests(title, duration)")
    .eq("id", attemptId)
    .single();

  if (error || !row) return null;

  const attempt = row as Tables<"test_attempts"> & { tests?: { title?: string; duration?: number } | null };
  const { tests, ...attemptRow } = attempt;
  return {
    ...mapAttemptRow(attemptRow),
    testTitle: tests?.title,
    durationMinutes: tests?.duration ?? 0,
  };
}

/**
 * Get attempt detail by student id and test id
 */
export async function getAttemptDetailByStudentIdAndTestId(studentId: string, testId: string) {
  const { data: attempt, error: attemptError } = await supabase
    .from("test_attempts")
    .select("*")
    .eq("student_id", studentId)
    .eq("test_id", testId)
    .single();
  if (attemptError || !attempt) throw attemptError;
  return mapAttemptRow(attempt);
}

/**
 * Get detailed attempt result with question breakdown
 */
export async function getAttemptDetails(attemptId: string) {
  const { data: attempt, error: attemptError } = await supabase
    .from("test_attempts")
    .select("*")
    .eq("id", attemptId)
    .single();

  if (attemptError || !attempt) return null;

  const { data: test, error: testError } = await supabase
    .from("tests")
    .select("*")
    .eq("id", attempt.test_id)
    .single();

  if (testError || !test) throw testError;

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("*")
    .eq("test_id", attempt.test_id)
    .order("order", { ascending: true });

  if (questionsError) throw questionsError;

  const { data: questionAttempts, error: qaError } = await supabase
    .from("question_attempts")
    .select("*")
    .eq("attempt_id", attemptId);

  if (qaError) throw qaError;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email")
    .eq("user_id", attempt.student_id)
    .maybeSingle();

  const attemptRow = attempt as Tables<"test_attempts">;
  const totalHintsUsed = (questionAttempts ?? []).reduce(
    (acc, qa) => acc + (Number((qa as { hints_used?: number }).hints_used) || 0),
    0,
  );
  const mappedAttempt = {
    id: attemptRow.id,
    studentId: attemptRow.student_id,
    testId: attemptRow.test_id,
    startedAt: new Date(attemptRow.started_at),
    completedAt: attemptRow.completed_at
      ? new Date(attemptRow.completed_at)
      : undefined,
    status: attemptRow.status,
    totalQuestions: attemptRow.total_questions,
    correctAnswers: attemptRow.correct_answers,
    hintsUsed: totalHintsUsed,
    timeTakenSeconds: attemptRow.time_taken_seconds || 0,
    score: attemptRow.score || 0,
    basicScore: Number(attemptRow.basic_score) || undefined,
    aiScore: Number(attemptRow.ai_score) || undefined,
    masteryAchieved: attemptRow.mastery_achieved || false,
    firstAttemptSuccessRate: Number(attemptRow.first_attempt_success_rate) || undefined,
    learningEngagementRate: attemptRow.learning_engagement_rate || 0,
    persistenceScore: attemptRow.persistence_score,
    totalMark: attemptRow.total_mark || 0,
  };

  const testRow = test as Tables<"tests">;
  const mappedTest = {
    id: testRow.id,
    title: testRow.title,
    description: testRow.description,
    status: testRow.status as Test["status"],
    scheduledDate: new Date(testRow.scheduled_date),
    duration: testRow.duration,
    createdAt: new Date(testRow.created_at),
    createdBy: testRow.created_by,
    lessonId: testRow.lesson_id || undefined,
    questionCount: testRow.question_count,
    questions: (questions ?? []).map((q) => ({
      id: q.id,
      testId: q.test_id,
      questionText: q.question_text,
      correctAnswer: q.correct_answer,
      order: q.order,
    })),
  };

  const mappedQuestionAttempts = (questionAttempts ?? []).map((qa) => ({
    id: qa.id,
    attemptId: qa.attempt_id,
    questionId: qa.question_id,
    studentAnswer: qa.student_answer,
    isCorrect: qa.is_correct,
    mark: (qa.mark as number) || 0,
    attemptsCount: qa.attempts_count ?? 1,
    hintsUsed: (qa.hints_used as number) || 0,
    viewedMicroLearning: (qa.micro_learning_viewed as boolean) || false,
    timeTakenSeconds: (qa.time_taken_seconds as number) || 0,
    answeredAt: new Date(qa.answered_at as string),
    aiScore: qa.ai_score,
    aiFeedback: qa.ai_feedback,
    generatedHints: qa.generated_hints,
    usedNoHints: qa.used_no_hints,
    microLearningContent: qa.micro_learning_content,
    answeredOnFirstAttempt: (qa.answered_on_first_attempt as boolean) || false,
    studyMaterialDownloaded: (qa.study_material_downloaded as boolean) || false,
  }));

  return {
    attempt: mappedAttempt,
    test: mappedTest,
    questionResults: mappedQuestionAttempts,
    student: profile
      ? { name: (profile as { name: string }).name, email: (profile as { email: string }).email }
      : null,
  };
}

/**
 * Determine starting difficulty for adaptive test from performance_metrics
 */
export async function determineStartingDifficulty(
  studentId: string,
  testId: string | null,
): Promise<number> {
  let query = supabase
    .from("performance_metrics")
    .select("average_ai_score")
    .eq("student_id", studentId)
    .order("calculated_at", { ascending: false })
    .limit(1);
  if (testId) {
    query = query.eq("test_id", testId);
  }
  const { data: rows } = await query;
  const score = rows?.[0]?.average_ai_score;
  if (score == null || typeof score !== "number") return 3;
  const accuracy = Number(score);
  if (accuracy >= 80) return 4;
  if (accuracy >= 60) return 3;
  if (accuracy >= 40) return 2;
  return 1;
}

/**
 * Map a test attempt score (0–100) to a difficulty level (1–5) for next attempt.
 */
function scoreToDifficulty(score: number): number {
  const s = Number(score);
  if (s >= 80) return 4;
  if (s >= 60) return 3;
  if (s >= 40) return 2;
  return 1;
}

/**
 * Choose the first question for a new attempt: use previous attempt score (if any) to set difficulty,
 * then pick one question from the pool at that difficulty.
 */
async function getFirstQuestionForNewAttempt(
  testId: string,
  studentId: string,
  poolIds: string[],
): Promise<{ questionId: string; difficulty: number }> {
  if (poolIds.length === 0) throw new Error("No questions in pool");

  let targetDifficulty = 3;
  const { data: previousAttempt } = await supabase
    .from("test_attempts")
    .select("score")
    .eq("test_id", testId)
    .eq("student_id", studentId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (previousAttempt?.score != null) {
    const score = Number(previousAttempt.score);
    if (!Number.isNaN(score)) targetDifficulty = scoreToDifficulty(score);
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("id, difficulty")
    .in("id", poolIds);

  if (!questions?.length) {
    return { questionId: poolIds[0], difficulty: targetDifficulty };
  }

  const norm = (d: number) => Math.max(1, Math.min(5, Number(d) || 3));
  const idToDifficulty = new Map(questions.map((q) => [q.id, norm(q.difficulty)]));
  const availableDifficulties = Array.from(
    new Set(questions.map((q) => norm(q.difficulty))),
  );
  const resolved = resolveAvailableDifficulty(targetDifficulty, availableDifficulties) ?? availableDifficulties[0];
  const candidates = poolIds.filter((id) => idToDifficulty.get(id) === resolved);
  const pool = candidates.length > 0 ? candidates : poolIds;
  const chosenId = pool[Math.floor(Math.random() * pool.length)] ?? poolIds[0];
  const difficulty = idToDifficulty.get(chosenId) ?? targetDifficulty;

  return { questionId: chosenId, difficulty };
}

/**
 * Update current_difficulty on test_attempts after an answer using attempt history
 */
export async function updateDifficultyAfterAnswer(
  attemptId: string,
  questionId: string,
): Promise<void> {
  const { data: qa } = await supabase
    .from("question_attempts")
    .select("attempt_history")
    .eq("attempt_id", attemptId)
    .eq("question_id", questionId)
    .single();
  const history = (qa?.attempt_history as unknown as AttemptHistoryItem[] | null) ?? [];
  const { data: att } = await supabase
    .from("test_attempts")
    .select("current_difficulty")
    .eq("id", attemptId)
    .single();
  const current = att?.current_difficulty ?? 3;
  const next = computeNextDifficulty(current, history);
  await supabase
    .from("test_attempts")
    .update({ current_difficulty: next })
    .eq("id", attemptId);
}

/**
 * Get next adaptive question and advance attempt state
 */
export async function getNextAdaptiveQuestion(
  attemptId: string,
  aiHistory?: AttemptHistoryItem[],
) {
  const { data: attempt, error: attemptError } = await supabase
    .from("test_attempts")
    .select(
      "total_questions, questions_attempted_count, current_difficulty, attempted_question_ids, selected_question_ids",
    )
    .eq("id", attemptId)
    .single();

  if (attemptError || !attempt) return null;

  const poolIds = attempt.selected_question_ids?.filter((id) => !attempt.attempted_question_ids?.includes(id));

  const { data: questions } = await supabase
    .from("questions")
    .select("id, difficulty")
    .in("id", poolIds);

  if (!questions?.length) return null;

  const norm = (d: number) => Math.max(1, Math.min(5, Number(d) || 3));
  const idToDifficulty = new Map(questions.map((q) => [q.id, norm(q.difficulty)]));
  const availableDifficulties = Array.from(
    new Set(questions.map((q) => norm(q.difficulty))),
  );


  const targetDifficulty = computeNextDifficulty(attempt.current_difficulty, aiHistory);
  const resolved = resolveAvailableDifficulty(
    targetDifficulty,
    availableDifficulties,
  );

  let candidates = poolIds.filter((id) => idToDifficulty.get(id) === resolved);
  if (candidates.length === 0) candidates = poolIds;
  const chosenId =
    candidates[Math.floor(Math.random() * candidates.length)] ?? poolIds[0];

  // Only set current question (do NOT remove from remaining or increment count here).
  // Consumption happens in submitAnswer when the user actually submits an answer.
  await supabase
    .from("test_attempts")
    .update({
      current_difficulty: resolved,
      current_question_id: chosenId,
      attempted_question_ids: [...(attempt.attempted_question_ids ?? []), chosenId],
    })
    .eq("id", attemptId);

  const question = await getQuestionById(chosenId);
  return question;
}

/**
 * Start a test attempt (or resume existing one)
 */
export async function startTestAttempt(
  testId: string,
  studentId: string,
) {
  const { data: existingAttempt } = await supabase
    .from("test_attempts")
    .select("*")
    .eq("test_id", testId)
    .eq("student_id", studentId)
    .eq("status", "in_progress")
    .maybeSingle();

  if (existingAttempt) {
    return existingAttempt.id;
  }

  const { data: test } = await supabase
    .from("tests")
    .select("question_count, total_mark, number_of_questions")
    .eq("id", testId)
    .single();

  const { data: questionIds } = await supabase
    .from("questions")
    .select("id")
    .eq("test_id", testId);
  const ids = questionIds?.map((q) => q.id) ?? [];
  const totalToAttempt =
    test?.number_of_questions != null && test.number_of_questions > 0
      ? Math.min(test.number_of_questions, ids.length)
      : test?.question_count ?? ids.length;

  const { questionId: firstQuestionId, difficulty: firstDifficulty } =
    await getFirstQuestionForNewAttempt(testId, studentId, ids);

  const { data: attempt, error } = await supabase
    .from("test_attempts")
    .insert({
      test_id: testId,
      student_id: studentId,
      status: "in_progress",
      total_questions: totalToAttempt,
      total_mark: test?.total_mark || 0,
      correct_answers: 0,
      hints_used: 0,
      selected_question_ids: ids,
      attempted_question_ids: [firstQuestionId],
      current_question_id: firstQuestionId,
      current_difficulty: firstDifficulty,
      questions_attempted_count: 0,
    })
    .select()
    .single();

  if (error) throw error;

  if (attempt) {
    try {
      await calculateAndSaveMetrics(attempt.student_id, attempt.test_id);
    } catch (metricError) {
      console.error("Failed to update performance metrics:", metricError);
    }
  }

  return attempt.id;
}

/**
 * Submit answer for a question
 */
export async function submitAnswer(data: {
  attemptId: string;
  questionId: string;
  answer: string;
  timeTaken?: number;
  attemptsCount?: number;
  hintsUsed?: number;
  viewedMicroLearning?: boolean;
}) {
  const { data: question } = await supabase
    .from("questions")
    .select("question_text, correct_answer, mark")
    .eq("id", data.questionId)
    .single();

  if (!question) throw new Error("Question not found");

  let isCorrect =
    data.answer.toLowerCase().trim() ===
    (question as { correct_answer: string }).correct_answer.toLowerCase().trim();

  let feedback = isCorrect ? "Correct!" : undefined;
  let score = isCorrect ? 100 : 0;
  let aiScore: number | undefined = isCorrect ? 100 : undefined;

  if (!isCorrect && data.answer.trim().length > 0) {
    try {
      const { data: evaluation, error: aiError } =
        await supabase.functions.invoke("evaluate-answer", {
          body: {
            questionText: (question as { question_text: string }).question_text,
            correctAnswer: (question as { correct_answer: string }).correct_answer,
            studentAnswer: data.answer,
          },
        });

      if (!aiError && evaluation) {
        if (evaluation.isCorrect === true) {
          isCorrect = true;
          score = 100;
        }
        aiScore = evaluation.score;
        feedback = evaluation.feedback;
      } else {
        console.warn("AI Evaluation failed or returned empty", aiError);
      }
    } catch (err) {
      console.error("Failed to call evaluate-answer:", err);
    }
  }

  const { data: existingAttempt } = await supabase
    .from("question_attempts")
    .select("attempt_history, ai_score")
    .eq("attempt_id", data.attemptId)
    .eq("question_id", data.questionId)
    .maybeSingle();

  let history: Json[] = [];
  if (
    existingAttempt?.attempt_history &&
    Array.isArray(existingAttempt.attempt_history)
  ) {
    history = existingAttempt.attempt_history as Json[];
  }

  const newHistoryItem = {
    answer: data.answer,
    isCorrect,
    aiScore,
    feedback,
    timestamp: new Date().toISOString(),
  };
  history.push(newHistoryItem as unknown as Json);

  const allAiScores = history
    .map((h) =>
      typeof h === "object" && h !== null && "aiScore" in h
        ? (h as { aiScore?: number }).aiScore
        : undefined,
    )
    .filter((s): s is number => typeof s === "number");

  const bestAiScore =
    allAiScores.length > 0 ? Math.max(...allAiScores) : aiScore;

  const { data: questionAttempt, error: upsertError } = await supabase.from("question_attempts").upsert(
    {
      attempt_id: data.attemptId,
      question_id: data.questionId,
      student_answer: data.answer,
      is_correct: isCorrect,
      answered_at: new Date().toISOString(),
      time_taken_seconds: data.timeTaken || 0,
      attempts_count: data.attemptsCount || 1,
      hints_used: data.hintsUsed || 0,
      micro_learning_viewed: data.viewedMicroLearning || false,
      ai_feedback: feedback,
      ai_score: bestAiScore,
      attempt_history: history,
      mark: question.mark || 0,
      answered_on_first_attempt: isCorrect && data.attemptsCount === 1,
      used_no_hints: (data.hintsUsed || 0) === 0,
      showed_persistence: isCorrect && (data.attemptsCount || 1) > 1,
    },
    { onConflict: "attempt_id, question_id" },
  ).select().single();



  if (upsertError) throw upsertError;

  const aiHistory = questionAttempt?.attempt_history as unknown as AttemptHistoryItem[] | null;


  if (isCorrect) {
    const { data: attemptRow } = await supabase
      .from("test_attempts")
      .select("questions_attempted_count, total_questions")
      .eq("id", data.attemptId)
      .single();

    if (attemptRow) {
      const newCount = (attemptRow.questions_attempted_count ?? 0) + 1;
      await supabase.from("test_attempts").update({ questions_attempted_count: newCount }).eq("id", data.attemptId);
      const totalQuestions = attemptRow.total_questions ?? 0;
      const isLastQuestion = totalQuestions > 0 && newCount >= totalQuestions;
      if (!isLastQuestion) {
        await getNextAdaptiveQuestion(data.attemptId, aiHistory);
      }
    } else {
      await getNextAdaptiveQuestion(data.attemptId, aiHistory);
    }
  }


  return {
    isCorrect,
    correctAnswer: question.correct_answer,
    feedback,
    score,
  };
}

/**
 * Use a hint (with AI fallback)
 */
export async function useHint(
  attemptId: string,
  questionId: string,
  hintIndex: number,
  studentAnswer?: string,
): Promise<string> {
  const { data: question } = await supabase
    .from("questions")
    .select("question_text, correct_answer, hints")
    .eq("id", questionId)
    .single();

  if (!question) throw new Error("Question not found");

  const q = question as { hints?: string[]; question_text: string; correct_answer: string };
  const staticHints = q.hints || [];

  if (hintIndex < staticHints.length) {
    return staticHints[hintIndex];
  }

  const generatedIndex = hintIndex - staticHints.length;

  const { data: qAttempt } = await supabase
    .from("question_attempts")
    .select("generated_hints")
    .eq("attempt_id", attemptId)
    .eq("question_id", questionId)
    .maybeSingle();

  const generatedHints = (qAttempt as { generated_hints?: string[] } | null)?.generated_hints || [];

  if (generatedHints[generatedIndex]) {
    return generatedHints[generatedIndex];
  }

  try {
    const { data: generatedData, error: funcError } =
      await supabase.functions.invoke("generate-hint", {
        body: {
          questionText: q.question_text,
          correctAnswer: q.correct_answer,
          studentAnswer: studentAnswer,
        },
      });

    if (funcError) throw funcError;
    const newHint = (generatedData as { hint?: string }).hint;

    const updatedHints = [...generatedHints, newHint ?? ""];

    const { error: upsertError } = await supabase
      .from("question_attempts")
      .upsert(
        {
          attempt_id: attemptId,
          question_id: questionId,
          generated_hints: updatedHints,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "attempt_id, question_id" },
      );

    if (upsertError) {
      console.error("Failed to store generated hint", upsertError);
    }

    return newHint ?? "Think about the logic carefully! You can do it!";
  } catch (err) {
    console.error("AI Hint Generation failed:", err);
    return "Think about the logic carefully! You can do it!";
  }
}

/**
 * Get micro learning content (with AI fallback)
 */
export async function getMicroLearning(
  questionId: string,
  attemptId?: string,
  studentQuestion?: string,
): Promise<string> {
  const { data: question } = await supabase
    .from("questions")
    .select("question_text, correct_answer, micro_learning")
    .eq("id", questionId)
    .single();

  if (!question) return "";

  const q = question as { micro_learning?: string; question_text: string; correct_answer: string };

  if (
    !q.micro_learning ||
    q.micro_learning.trim() === "" ||
    studentQuestion
  ) {
    if (attemptId) {
      const { data: qAttempt } = await supabase
        .from("question_attempts")
        .select("micro_learning_content")
        .eq("attempt_id", attemptId)
        .eq("question_id", questionId)
        .maybeSingle();

      if ((qAttempt as { micro_learning_content?: string } | null)?.micro_learning_content && !studentQuestion) {
        return (qAttempt as { micro_learning_content: string }).micro_learning_content;
      }

      try {
        const { data: generatedData, error: funcError } =
          await supabase.functions.invoke("generate-micro-learning", {
            body: {
              questionText: q.question_text,
              correctAnswer: q.correct_answer,
              studentQuestion: studentQuestion,
            },
          });

        if (funcError) throw funcError;
        const newContent = (generatedData as { content?: string }).content;

        const { error: upsertError } = await supabase
          .from("question_attempts")
          .upsert(
            {
              attempt_id: attemptId,
              question_id: questionId,
              micro_learning_content: newContent,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "attempt_id, question_id" },
          );

        if (upsertError) {
          console.error("Failed to store micro-learning", upsertError);
        }

        return newContent ?? "";
      } catch (err) {
        console.error("AI Micro-learning Generation failed:", err);
        return "Learning is fun! Keep exploring this topic.";
      }
    }

    return "";
  }

  return q.micro_learning;
}

/**
 * Track study material download
 */
export async function trackStudyMaterialDownload(
  attemptId: string,
  questionId: string,
): Promise<void> {
  const { error } = await supabase.from("question_attempts").upsert(
    {
      attempt_id: attemptId,
      question_id: questionId,
      study_material_downloaded: true,
      downloaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "attempt_id, question_id" },
  );

  if (error) {
    console.error("Failed to track study material download", error);
  }
}

/**
 * Complete test attempt and compute final metrics
 */
export async function completeAttempt(
  attemptId: string,
  metrics?: Partial<TestAttempt>,
): Promise<AttemptResult> {

  const { data: attemptData, error: attemptError } = await supabase
    .from("test_attempts")
    .select("test_id, student_id, total_questions")
    .eq("id", attemptId)
    .single();

  if (attemptError || !attemptData)
    throw attemptError || new Error("Attempt not found");

  const { data: testData, error: testError } = await supabase
    .from("tests")
    .select("number_of_questions, duration, total_mark")
    .eq("id", attemptData.test_id)
    .single();

  if (testError || !testData) throw testError || new Error("Test not found");

  const { data: qAttempts, error: countError } = await supabase
    .from("question_attempts")
    .select("*")
    .eq("attempt_id", attemptId);

  if (countError) throw countError;

  const attemptTotal = (attemptData as { total_questions?: number }).total_questions;
  const questionsAnsweredCount = qAttempts?.length ?? 0;
  const totalQuestionsForAttempt =
    (attemptTotal != null && attemptTotal > 0 ? attemptTotal : questionsAnsweredCount) || 1;

  interface ScoreBreakdown {
    questions: Array<{
      questionId: string;
      rawScore: number;
      penalties: {
        hints: number;
        microLearning: number;
        studyMaterial: number;
        totalPenalty: number;
      };
      difficultyMultiplier: number;
      finalQuestionScore: number;
      weightedMark: number;
      isConsideredCorrect: boolean;
    }>;
    timePenalty: number;
    finalScore: number;
    totalWeightedMarks: number;
    totalQuestionMarks: number;
    totalTestMarks: number;
  }

  const aiScoreBreakdown: ScoreBreakdown = {
    questions: [],
    timePenalty: 0,
    finalScore: 0,
    totalWeightedMarks: 0,
    totalQuestionMarks: 0,
    totalTestMarks: testData.total_mark || 0,
  };

  const totalTestMarks = testData.total_mark || 0;
  const safeTotalMarks = totalTestMarks > 0 ? totalTestMarks : 1;

  let totalWeightedMarks = 0;
  let totalQuestionMarks = 0;
  let correctCount = 0;
  let totalHintsUsedCount = 0;

  type QARow = {
    attempt_history?: Array<{ aiScore?: number }>;
    ai_score?: number | null;
    is_correct?: boolean;
    hints_used?: number;
    micro_learning_viewed?: boolean;
    study_material_downloaded?: boolean;
    difficulty?: number | null;
    mark?: number | null;
    time_taken_seconds?: number | null;
    question_id: string;
    answered_on_first_attempt?: boolean;
    attempts_count?: number | null;
  };

  const getAverageAiScore = (qa: QARow): number => {
    if (
      qa.attempt_history &&
      Array.isArray(qa.attempt_history) &&
      qa.attempt_history.length > 0
    ) {
      const scores = qa.attempt_history
        .map((h) => h?.aiScore)
        .filter((s): s is number => typeof s === "number");

      if (scores.length > 0)
        return Math.round(
          scores.reduce((a: number, b: number) => a + b, 0) / scores.length,
        );
    }
    return qa.ai_score ?? (qa.is_correct ? 100 : 0);
  };

  const getDifficultyMultiplier = (difficulty: number | null | undefined) => {
    if (difficulty === null || difficulty === undefined) return 1.0;
    switch (difficulty) {
      case 1: return 1.0;
      case 2: return 0.9;
      case 3: return 0.75;
      case 4: return 0.6;
      case 5: return 0.5;
      default: return 1.0;
    }
  };

  const totalTimeTaken = (qAttempts ?? []).reduce(
    (sum, qa) => sum + ((qa as QARow).time_taken_seconds || 0),
    0,
  );

  for (const qa of qAttempts ?? []) {
    const row = qa as QARow;
    const rawScore = getAverageAiScore(row);
    const isQuestionCorrect = rawScore >= 60;
    if (isQuestionCorrect) correctCount++;
    if (row.hints_used) totalHintsUsedCount += row.hints_used;

    const baseHintPenalty = (row.hints_used || 0) * 10;
    const baseMicroPenalty = row.micro_learning_viewed ? 20 : 0;
    const baseStudyPenalty = row.study_material_downloaded ? 20 : 0;

    const diffMultiplier = getDifficultyMultiplier(row.difficulty);
    const totalPenalty =
      (baseHintPenalty + baseMicroPenalty + baseStudyPenalty) * diffMultiplier;

    const postPenaltyScore = Math.max(0, rawScore - totalPenalty);
    const questionMark = row.mark || 0;
    const weightedMark = (postPenaltyScore / 100) * questionMark;

    totalWeightedMarks += weightedMark;
    totalQuestionMarks += questionMark;

    aiScoreBreakdown.questions.push({
      questionId: row.question_id,
      rawScore,
      penalties: {
        hints: baseHintPenalty,
        microLearning: baseMicroPenalty,
        studyMaterial: baseStudyPenalty,
        totalPenalty,
      },
      difficultyMultiplier: diffMultiplier,
      finalQuestionScore: postPenaltyScore,
      weightedMark,
      isConsideredCorrect: isQuestionCorrect,
    });
  }
  totalWeightedMarks = (totalWeightedMarks / totalQuestionMarks) * safeTotalMarks;
  aiScoreBreakdown.totalWeightedMarks = totalWeightedMarks;

  let finalScoreCalculated = Math.round(
    (totalWeightedMarks / safeTotalMarks) * 100,
  );

  const testDurationMinutesLimit = testData.duration || 0;
  let appliedTimePenaltyScore = 0;
  if (testDurationMinutesLimit > 0) {
    const timeTakenMinutesVal = totalTimeTaken / 60;
    const extraMinutesCount = Math.floor(
      timeTakenMinutesVal - testDurationMinutesLimit,
    );
    if (extraMinutesCount > 0) {
      let timePenaltyVal = extraMinutesCount * 1;
      if (extraMinutesCount > 5) timePenaltyVal += 10;
      appliedTimePenaltyScore = timePenaltyVal;
      finalScoreCalculated = Math.max(0, finalScoreCalculated - timePenaltyVal);
    }
  }

  aiScoreBreakdown.timePenalty = appliedTimePenaltyScore;
  aiScoreBreakdown.finalScore = finalScoreCalculated;

  const engagedQuestionsCountVal = (qAttempts ?? []).filter(
    (qa) => ((qa as QARow).hints_used || 0) > 0 || (qa as QARow).micro_learning_viewed,
  ).length;
  const learningEngagementRateVal =
    (qAttempts ?? []).length > 0
      ? Math.round((engagedQuestionsCountVal / (qAttempts ?? []).length) * 100)
      : 0;

  const averageTimePerQuestionVal =
    (qAttempts ?? []).length > 0 ? Math.round(totalTimeTaken / (qAttempts ?? []).length) : 0;

  const firstAttemptCorrectCountVal = (qAttempts ?? []).filter(
    (qa) => (qa as QARow).is_correct && (qa as QARow).answered_on_first_attempt,
  ).length;
  const firstAttemptSuccessRateVal =
    (qAttempts ?? []).length > 0
      ? Math.round((firstAttemptCorrectCountVal / (qAttempts ?? []).length) * 100)
      : 0;

  const multiAttemptQuestionsVal = (qAttempts ?? []).filter(
    (qa) => ((qa as QARow).attempts_count || 1) > 1,
  );
  const persistedCorrectCountVal = multiAttemptQuestionsVal.filter((qa) => {
    const score = getAverageAiScore(qa as QARow);
    return score >= 60;
  }).length;
  const persistenceScoreVal =
    multiAttemptQuestionsVal.length > 0
      ? Math.round(
        (persistedCorrectCountVal / multiAttemptQuestionsVal.length) * 100,
      )
      : 100;

  const masteryAchievedVal =
    finalScoreCalculated >= 90 && firstAttemptSuccessRateVal >= 80;

  const basicScoreVal = Math.round((totalWeightedMarks / safeTotalMarks) * 100);

  const fastCorrectCountVal = (qAttempts ?? []).filter((qa) => {
    const score = getAverageAiScore(qa as QARow);
    return score >= 60 && ((qa as QARow).time_taken_seconds || 0) < 30;
  }).length;
  const confidenceIndicatorVal =
    correctCount > 0
      ? Math.round((fastCorrectCountVal / correctCount) * 100)
      : 0;

  const questionsRequiringStudyCountVal = aiScoreBreakdown.questions.filter(
    (q) => q.finalQuestionScore < 60,
  ).length;

  const hintDependencyRateVal =
    correctCount > 0
      ? Math.round(
        (qAttempts ?? []).filter(
          (qa) =>
            (Number((qa as QARow).ai_score) || 0) >= 60 && ((qa as QARow).hints_used || 0) > 0,
        ).length /
        correctCount *
        100,
      )
      : 0;



  const scoreWithPenalties = Math.min(
    100,
    Math.max(0, finalScoreCalculated),
  );

  const updates: TablesUpdate<"test_attempts"> = {
    status: "completed",
    completed_at: new Date().toISOString(),
    score: scoreWithPenalties,
    correct_answers: correctCount,
    total_questions: totalQuestionsForAttempt,
    hints_used: totalHintsUsedCount,
    learning_engagement_rate: learningEngagementRateVal,
    average_time_per_question: averageTimePerQuestionVal,
    first_attempt_success_rate: firstAttemptSuccessRateVal,
    persistence_score: persistenceScoreVal,
    mastery_achieved: masteryAchievedVal,
    basic_score: basicScoreVal,
    confidence_indicator: confidenceIndicatorVal,
    questions_requiring_study: questionsRequiringStudyCountVal,
    hint_dependency_rate: hintDependencyRateVal,
    ai_score_breakdown: aiScoreBreakdown as unknown as Json,
  };

  if (metrics?.timeTakenSeconds !== undefined)
    updates.time_taken_seconds = metrics.timeTakenSeconds;

  const { data: attempt, error } = await supabase
    .from("test_attempts")
    .update(updates)
    .eq("id", attemptId)
    .select()
    .single();

  if (error) throw error;

  await calculateAndSaveMetrics(attemptData.student_id, attemptData.test_id);

  const { data: fullTest } = await supabase
    .from("tests")
    .select("*")
    .eq("id", attemptData.test_id)
    .single();

  const attemptRow = attempt as Tables<"test_attempts">;

  return {
    attempt: {
      id: attemptRow.id,
      studentId: attemptRow.student_id,
      testId: attemptRow.test_id,
      startedAt: new Date(attemptRow.started_at),
      completedAt: new Date(attemptRow.completed_at!),
      status: attemptRow.status as TestAttempt["status"],
      totalQuestions: attemptRow.total_questions,
      correctAnswers: attemptRow.correct_answers,
      hintsUsed: attemptRow.hints_used,
      timeTakenSeconds: attemptRow.time_taken_seconds || 0,
      score: attemptRow.score || 0,
      basicScore: Number(attemptRow.basic_score) || undefined,
      aiScore: Number(attemptRow.ai_score) || undefined,
      currentQuestionId: attemptRow.current_question_id ?? undefined,
      questionsAttemptedCount: attemptRow.questions_attempted_count ?? 0,
      learningEngagementRate:
        Number(attemptRow.learning_engagement_rate) || undefined,
      averageTimePerQuestion:
        Number(attemptRow.average_time_per_question) || undefined,
      firstAttemptSuccessRate:
        Number(attemptRow.first_attempt_success_rate) || undefined,
      hintDependencyRate: Number(attemptRow.hint_dependency_rate) || undefined,
      persistenceScore: Number(attemptRow.persistence_score) || undefined,
      confidenceIndicator: Number(attemptRow.confidence_indicator) || undefined,
      forcedStudyBreaks: attemptRow.forced_study_breaks || 0,
      masteryAchieved: attemptRow.mastery_achieved || false,
      questionsRequiringStudy: attemptRow.questions_requiring_study || 0,
    },
    questionResults: [],
    test: fullTest
      ? ({
        id: (fullTest as Tables<"tests">).id,
        title: (fullTest as Tables<"tests">).title,
        description: (fullTest as Tables<"tests">).description,
        status: (fullTest as Tables<"tests">).status as Test["status"],
        scheduledDate: new Date((fullTest as Tables<"tests">).scheduled_date),
        duration: (fullTest as Tables<"tests">).duration,
        createdAt: new Date((fullTest as Tables<"tests">).created_at),
        createdBy: (fullTest as Tables<"tests">).created_by,
        lessonId: (fullTest as Tables<"tests">).lesson_id || undefined,
        questionCount: (fullTest as Tables<"tests">).question_count,
        questions: [],
      } as TestWithQuestions)
      : undefined as unknown as TestWithQuestions,
  };
}
