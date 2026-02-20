CREATE TABLE public.question_bank (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  topic text NOT NULL,
  concept text NOT NULL,
  title text NOT NULL,
  difficulty integer NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),
  marks integer NOT NULL DEFAULT 1,
  answer text NOT NULL,
  lesson_id uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  created_by uuid NULL,
  CONSTRAINT question_bank_pkey PRIMARY KEY (id),
  CONSTRAINT question_bank_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users (id),
  CONSTRAINT question_bank_lesson_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE SET NULL
);

-- Turn on Row Level Security
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Allow read access for authenticated users" ON public.question_bank
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow write access for admin users
CREATE POLICY "Allow insert/update for admins" ON public.question_bank
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
