
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Lessons table
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID NOT NULL
);

-- Tests table
CREATE TABLE public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  scheduled_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  question_count INTEGER NOT NULL DEFAULT 0,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL
);

-- Questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  hints TEXT[] NOT NULL DEFAULT '{}',
  micro_learning TEXT NOT NULL DEFAULT '',
  "order" INTEGER NOT NULL DEFAULT 0
);

-- Test attempts table
CREATE TABLE public.test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
  student_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress',
  score NUMERIC,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  hints_used INTEGER NOT NULL DEFAULT 0,
  time_taken_seconds INTEGER
);

-- Question attempts table
CREATE TABLE public.question_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES public.test_attempts(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  student_answer TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  hints_used INTEGER NOT NULL DEFAULT 0,
  micro_learning_viewed BOOLEAN NOT NULL DEFAULT false,
  answered_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || NEW.email
  );
  -- Default role is student
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_timestamp
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update question_count on questions change
CREATE OR REPLACE FUNCTION public.update_question_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.tests SET question_count = (SELECT COUNT(*) FROM public.questions WHERE test_id = OLD.test_id) WHERE id = OLD.test_id;
  ELSE
    UPDATE public.tests SET question_count = (SELECT COUNT(*) FROM public.questions WHERE test_id = NEW.test_id) WHERE id = NEW.test_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_test_question_count
  AFTER INSERT OR DELETE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.update_question_count();

-- =====================
-- RLS POLICIES
-- =====================

-- Profiles: users read own, admins read all
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- User roles: users read own, admins read all
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Lessons: admins manage, students read
CREATE POLICY "Anyone authenticated can read lessons" ON public.lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage lessons" ON public.lessons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Tests: admins manage, students read active
CREATE POLICY "Admins can manage tests" ON public.tests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can read active tests" ON public.tests FOR SELECT TO authenticated USING (status IN ('active', 'scheduled'));

-- Questions: admins manage, students read via test
CREATE POLICY "Admins can manage questions" ON public.questions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can read questions" ON public.questions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.tests WHERE id = test_id AND status = 'active')
);

-- Test attempts: students own, admins read all
CREATE POLICY "Students manage own attempts" ON public.test_attempts FOR ALL TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Admins can read all attempts" ON public.test_attempts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Question attempts: students own, admins read all
CREATE POLICY "Students manage own question attempts" ON public.question_attempts FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.test_attempts WHERE id = attempt_id AND student_id = auth.uid())
);
CREATE POLICY "Admins can read all question attempts" ON public.question_attempts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
