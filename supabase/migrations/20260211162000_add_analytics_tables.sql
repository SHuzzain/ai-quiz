-- Migration to add Analytics Tables and Update Existing Schema
-- Generated based on mapping requirements

-- 1. Updates for 'profiles'
ALTER TABLE IF EXISTS profiles 
ADD COLUMN IF NOT EXISTS grade INTEGER,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 2. Updates for 'tests'
ALTER TABLE IF EXISTS tests 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 3. Updates for 'questions'
ALTER TABLE IF EXISTS questions 
ADD COLUMN IF NOT EXISTS max_attempts_before_study INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 4. Updates for 'test_attempts'
ALTER TABLE IF EXISTS test_attempts 
ADD COLUMN IF NOT EXISTS basic_score NUMERIC,
ADD COLUMN IF NOT EXISTS ai_score NUMERIC,
ADD COLUMN IF NOT EXISTS ai_score_breakdown JSONB,
ADD COLUMN IF NOT EXISTS learning_engagement_rate NUMERIC,
ADD COLUMN IF NOT EXISTS average_time_per_question NUMERIC,
ADD COLUMN IF NOT EXISTS first_attempt_success_rate NUMERIC,
ADD COLUMN IF NOT EXISTS hint_dependency_rate NUMERIC,
ADD COLUMN IF NOT EXISTS persistence_score NUMERIC,
ADD COLUMN IF NOT EXISTS confidence_indicator NUMERIC,
ADD COLUMN IF NOT EXISTS forced_study_breaks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mastery_achieved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS questions_requiring_study INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 5. Updates for 'question_attempts'
ALTER TABLE IF EXISTS question_attempts 
ADD COLUMN IF NOT EXISTS attempts_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS time_taken_seconds INTEGER,
ADD COLUMN IF NOT EXISTS time_before_first_attempt INTEGER,
ADD COLUMN IF NOT EXISTS hint_sequence INTEGER[],
ADD COLUMN IF NOT EXISTS time_spent_on_hints INTEGER,
ADD COLUMN IF NOT EXISTS micro_learning_viewed_before BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS micro_learning_time_spent INTEGER,
ADD COLUMN IF NOT EXISTS answered_on_first_attempt BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS used_no_hints BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS showed_persistence BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS study_material_downloaded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS downloaded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS retries_after_study INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS must_study_before_retry BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS generated_hints TEXT[],
ADD COLUMN IF NOT EXISTS micro_learning_content TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 6. Updates for 'lessons'
ALTER TABLE IF EXISTS lessons 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 7. Create 'courses' table
CREATE TABLE IF NOT EXISTS courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Create 'performance_metrics' table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
  average_basic_score NUMERIC DEFAULT 0,
  average_ai_score NUMERIC DEFAULT 0,
  total_attempts INTEGER DEFAULT 0,
  improvement_rate NUMERIC DEFAULT 0,
  consistency_score NUMERIC DEFAULT 0,
  average_hint_usage NUMERIC DEFAULT 0,
  average_learning_engagement NUMERIC DEFAULT 0,
  average_time_efficiency NUMERIC DEFAULT 0,
  strong_topics TEXT[],
  weak_topics TEXT[],
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Auto-update trigger function (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_tests_updated_at ON tests;
CREATE TRIGGER update_tests_updated_at BEFORE UPDATE ON tests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_questions_updated_at ON questions;
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_attempts_updated_at ON test_attempts;
CREATE TRIGGER update_test_attempts_updated_at BEFORE UPDATE ON test_attempts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_question_attempts_updated_at ON question_attempts;
CREATE TRIGGER update_question_attempts_updated_at BEFORE UPDATE ON question_attempts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_lessons_updated_at ON lessons;
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_performance_metrics_updated_at ON performance_metrics;
CREATE TRIGGER update_performance_metrics_updated_at BEFORE UPDATE ON performance_metrics FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
