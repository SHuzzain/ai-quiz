# Final Score — Complete Calculation Breakdown

This document describes **exactly** how the **Final Score** (0–100) is calculated when a student completes a test. Implementation: `src/services/api/attempts.ts`.

---

## Overview

The final score is computed in **four stages**:

1. **Per-question raw score** (AI score 0–100)
2. **Per-question penalties** (hints, micro-learning, study material) × difficulty
3. **Per-question weighted mark** → **test total weighted marks** → **base score %**
4. **Time penalty** (if test has a duration limit) → **final score**

---

## Stage 1: Per-Question Raw Score (AI Score)

Each question gets a **raw score** between 0 and 100. This is the “unpenalized” performance for that question.

### How the raw score is chosen

| Priority | Condition | Raw score |
|----------|-----------|-----------|
| 1 | Question has `attempt_history` with at least one numeric `aiScore` | **Average** of all `aiScore` values in `attempt_history`, **rounded** to integer |
| 2 | No valid attempt history | Use `ai_score` from the question attempt row |
| 3 | `ai_score` is null/undefined | **100** if `is_correct === true`, otherwise **0** |

### Correctness threshold

- A question is treated as **correct** when **raw score ≥ 60** (used for correct count, first-attempt success, persistence, etc.).
- The same raw score is then used in the penalty and weighted-mark steps below.

### Formula (pseudocode)

```
function getAverageAiScore(questionAttempt):
  if attempt_history exists and has numeric aiScore entries:
    return round( average(aiScore values) )
  return questionAttempt.ai_score ?? (questionAttempt.is_correct ? 100 : 0)
```

---

## Stage 2: Per-Question Penalties

The raw score is reduced by **penalties**. Each penalty type has a **base** value; the **sum** of base penalties is then multiplied by a **difficulty multiplier**.

### Base penalties (before difficulty)

| Penalty type | Field / condition | Base penalty |
|--------------|-------------------|--------------|
| **Hints** | `hints_used` (number of hints used on this question) | **10 × hints_used** |
| **Micro-learning** | `micro_learning_viewed === true` | **20** |
| **Study material** | `study_material_downloaded === true` | **20** |

**Base total penalty** (before difficulty):

```
baseTotalPenalty = (hints_used × 10) + (micro_learning_viewed ? 20 : 0) + (study_material_downloaded ? 20 : 0)
```

### Difficulty multiplier

The **total base penalty** is multiplied by a factor that depends on question difficulty (1 = easiest, 5 = hardest):

| Difficulty | Multiplier |
|------------|------------|
| 1 | 1.0 |
| 2 | 0.9 |
| 3 | 0.75 |
| 4 | 0.6 |
| 5 | 0.5 |
| null / undefined / other | 1.0 |

**Total penalty for the question:**

```
totalPenalty = baseTotalPenalty × difficultyMultiplier
```

### Post-penalty score (per question)

```
postPenaltyScore = max(0, rawScore − totalPenalty)
```

So the per-question score after penalties is between **0** and **100** (capped at 0, raw score can be at most 100).

### Example (one question)

| Item | Value |
|------|--------|
| Raw score | 85 |
| Hints used | 2 → 2 × 10 = 20 |
| Micro-learning viewed | Yes → 20 |
| Study material downloaded | No → 0 |
| Base total penalty | 40 |
| Difficulty | 3 → multiplier 0.75 |
| Total penalty | 40 × 0.75 = 30 |
| **Post-penalty score** | max(0, 85 − 30) = **55** |

---

## Stage 3: Weighted Marks → Base Score (Before Time)

Each question has a **mark** (weight) — `questionMark` — and the test has a **total mark** — `testTotalMark` (or `safeTotalMarks` if total is 0, then 1 is used to avoid division by zero).

### Step 3.1: Weighted mark per question

```
weightedMark = (postPenaltyScore / 100) × questionMark
```

- `postPenaltyScore`: 0–100 (from Stage 2).
- `questionMark`: the mark/weight of that question (from the test/question setup).

So a question with `questionMark = 10` and `postPenaltyScore = 80` gives `weightedMark = 8`.

### Step 3.2: Sum and normalize to test total marks

- **Sum** the weighted marks for all attempted questions:
  - `sumWeightedMarks = Σ weightedMark` (over all questions in the attempt).
- **Sum** the question marks for those same questions:
  - `totalQuestionMarks = Σ questionMark`.
- **Normalize** so the total is on the same scale as the test’s total mark:
  - `totalWeightedMarks = (sumWeightedMarks / totalQuestionMarks) × testTotalMark`
  - If `testTotalMark` is 0, the code uses `safeTotalMarks = 1`.

So if the test is out of 100 and you have 5 questions each with mark 20:
- `totalQuestionMarks = 100`, `testTotalMark = 100`
- `totalWeightedMarks = (sumWeightedMarks / 100) × 100 = sumWeightedMarks`.

### Step 3.3: Base score (percentage)

```
baseScore = round( (totalWeightedMarks / safeTotalMarks) × 100 )
```

- `safeTotalMarks = testTotalMark` if `testTotalMark > 0`, else `1`.
- This is the **final score before any time penalty**; the code calls this `finalScoreCalculated` at this stage.

### Summary of Stage 3 (formulas)

| Step | Formula |
|------|--------|
| Per question | `weightedMark = (postPenaltyScore / 100) × questionMark` |
| Sum | `sumWeightedMarks = Σ weightedMark`, `totalQuestionMarks = Σ questionMark` |
| Normalize | `totalWeightedMarks = (sumWeightedMarks / totalQuestionMarks) × testTotalMark` |
| Base score % | `baseScore = round((totalWeightedMarks / safeTotalMarks) × 100)` |

---

## Stage 4: Time Penalty → Final Score

If the test has a **duration limit** (in minutes), the base score can be reduced for going over time.

### Inputs

| Variable | Meaning |
|----------|---------|
| `testDurationMinutesLimit` | Test’s duration in minutes (from test settings). |
| `totalTimeTaken` | Sum of `time_taken_seconds` for all questions in the attempt. |
| `timeTakenMinutesVal` | `totalTimeTaken / 60`. |

### When no time penalty is applied

- If `testDurationMinutesLimit` is 0 or not set: **no time penalty**.
- If `timeTakenMinutesVal ≤ testDurationMinutesLimit`: **no time penalty**.

### When time penalty is applied

**Extra minutes:**

```
extraMinutesCount = floor(timeTakenMinutesVal − testDurationMinutesLimit)
```

Only applies when `extraMinutesCount > 0`.

**Time penalty value:**

| Condition | Time penalty |
|-----------|----------------|
| `extraMinutesCount > 0` | `timePenaltyVal = extraMinutesCount × 1` (1 point per extra minute) |
| If in addition `extraMinutesCount > 5` | Add **10** to `timePenaltyVal` |

So:
- 1–5 extra minutes: penalty = number of extra minutes.
- 6+ extra minutes: penalty = extra minutes + 10.

**Final score after time:**

```
finalScoreCalculated = max(0, baseScore − timePenaltyVal)
```

### Stored final score

The value is then **clamped** to 0–100 and saved as the attempt’s **score**:

```
score = min(100, max(0, finalScoreCalculated))
```

---

## End-to-end formula summary

| Stage | What is computed |
|-------|------------------|
| **1. Raw score** | Per question: average of `attempt_history` aiScores, or `ai_score`, or 100/0 by `is_correct`. |
| **2. Penalties** | `totalPenalty = [(hints×10) + (micro?20:0) + (study?20:0)] × difficultyMultiplier` |
| **2. Post-penalty** | `postPenaltyScore = max(0, rawScore − totalPenalty)` |
| **3. Weighted** | `weightedMark = (postPenaltyScore/100) × questionMark` per question |
| **3. Aggregate** | `totalWeightedMarks = (Σ weightedMark / Σ questionMark) × testTotalMark` |
| **3. Base %** | `baseScore = round((totalWeightedMarks / safeTotalMarks) × 100)` |
| **4. Time** | If over duration: `extraMins = floor(timeTakenMin − durationLimit)`, `penalty = extraMins + (extraMins>5 ? 10 : 0)` |
| **4. Final** | `finalScore = max(0, baseScore − timePenalty)`, then clamp to **0–100** |

---

## Data flow diagram (conceptual)

```
For each question attempt:
  rawScore (0–100)
    → basePenalties (hints, micro, study)
    → totalPenalty = basePenalties × difficultyMultiplier
    → postPenaltyScore = max(0, rawScore − totalPenalty)
    → weightedMark = (postPenaltyScore/100) × questionMark

Across all questions:
  sumWeightedMarks = Σ weightedMark
  totalQuestionMarks = Σ questionMark
  totalWeightedMarks = (sumWeightedMarks / totalQuestionMarks) × testTotalMark
  baseScore = round((totalWeightedMarks / safeTotalMarks) × 100)

If test has duration and time exceeded:
  timePenalty = extraMinutes + (extraMinutes > 5 ? 10 : 0)
  finalScore = max(0, baseScore − timePenalty)
Else:
  finalScore = baseScore

Stored score = clamp(finalScore, 0, 100)
```

---

## Reference: Difficulty and penalty constants

| Constant | Values |
|----------|--------|
| Hint penalty per use | 10 |
| Micro-learning viewed | 20 |
| Study material downloaded | 20 |
| Difficulty 1 | 1.0 |
| Difficulty 2 | 0.9 |
| Difficulty 3 | 0.75 |
| Difficulty 4 | 0.6 |
| Difficulty 5 | 0.5 |
| Time penalty per extra minute | 1 |
| Extra time penalty if > 5 min over | +10 |
| Correctness threshold (raw score) | ≥ 60 |

---

*Source: `src/services/api/attempts.ts` — completion/score calculation logic.*
