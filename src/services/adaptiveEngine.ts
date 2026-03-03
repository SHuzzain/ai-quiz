/**
 * Adaptive Test Engine
 * Uses only pre-selected question pool; never fetches outside pool.
 * Difficulty 1-5; resolves to available difficulties when target does not exist.
 */

export function resolveAvailableDifficulty(
  targetDifficulty: number,
  availableDifficulties: number[],
): number | null {
  if (availableDifficulties.length === 0) return null;
  const clamped = Math.max(1, Math.min(5, targetDifficulty));
  const set = new Set(availableDifficulties);
  if (set.has(clamped)) return clamped;
  for (let offset = 1; offset <= 5; offset++) {
    const lower = Math.max(1, clamped - offset);
    if (set.has(lower)) return lower;
    const higher = Math.min(5, clamped + offset);
    if (set.has(higher)) return higher;
  }
  return availableDifficulties[0];
}

export interface AttemptHistoryItem {
  answer: string;
  aiScore?: number;
  feedback?: string;
  isCorrect: boolean;
  timestamp: string;
}

export function computeNextDifficulty(
  currentDifficulty: number,
  history: AttemptHistoryItem[],
): number {
  if (history.length === 0) return currentDifficulty;
  const bestScore = Math.max(
    ...history.map((h) => h.aiScore ?? 0),
  );
  const attemptsCount = history.length;
  const firstAttemptCorrect = history[0]?.isCorrect ?? false;
  const finalCorrect = history[history.length - 1]?.isCorrect ?? false;

  let next = currentDifficulty;

  if (firstAttemptCorrect && bestScore === 100) {
    next += 2;
  } else if (finalCorrect && attemptsCount <= 1) {
    next += 1;
  } else if (finalCorrect && attemptsCount >= 2) {
    next -= 1;
  } else if (bestScore >= 70 && bestScore < 100) {
    // stays same
  } else if (bestScore >= 40 && bestScore < 70) {
    next -= 1;
  } else if (bestScore < 40) {
    next -= 2;
  }

  return Math.max(1, Math.min(5, next));
}
