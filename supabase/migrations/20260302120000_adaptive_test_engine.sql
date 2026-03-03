-- Adaptive Test Engine: test_attempts and tests columns
-- Do not break existing AI evaluation, attempt_history, scoring, or submitAnswer correctness.

-- tests: number of questions student will attempt (<= question_count)
ALTER TABLE public.tests
ADD COLUMN IF NOT EXISTS number_of_questions INTEGER;

COMMENT ON COLUMN public.tests.number_of_questions IS 'How many questions the student attempts; must be <= question_count (pool size).';

-- test_attempts: adaptive state
ALTER TABLE public.test_attempts
ADD COLUMN IF NOT EXISTS selected_question_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS remaining_question_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS current_difficulty INTEGER,
ADD COLUMN IF NOT EXISTS questions_attempted_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_question_id UUID;

COMMENT ON COLUMN public.test_attempts.selected_question_ids IS 'Pre-selected question pool for this attempt.';
COMMENT ON COLUMN public.test_attempts.remaining_question_ids IS 'Question IDs not yet sent; removed as questions are delivered.';
COMMENT ON COLUMN public.test_attempts.current_difficulty IS 'Current adaptive difficulty (1-5).';
COMMENT ON COLUMN public.test_attempts.questions_attempted_count IS 'Number of questions already sent/attempted.';
COMMENT ON COLUMN public.test_attempts.current_question_id IS 'Question currently shown (for resume).';
