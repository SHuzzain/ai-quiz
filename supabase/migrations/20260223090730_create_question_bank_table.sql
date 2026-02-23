-- Create question_bank table
CREATE TABLE IF NOT EXISTS public.question_bank (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    answer TEXT NOT NULL,
    topics TEXT[] NOT NULL DEFAULT '{}',
    concepts TEXT[] NOT NULL DEFAULT '{}',
    difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),
    marks INTEGER NOT NULL DEFAULT 1,
    working TEXT,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Setup RLS
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- Policies for question_bank
CREATE POLICY "Users can view their own question bank items"
    ON public.question_bank FOR SELECT
    USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own question bank items"
    ON public.question_bank FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own question bank items"
    ON public.question_bank FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own question bank items"
    ON public.question_bank FOR DELETE
    USING (auth.uid() = created_by);

-- Create updated_at trigger
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.question_bank
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
