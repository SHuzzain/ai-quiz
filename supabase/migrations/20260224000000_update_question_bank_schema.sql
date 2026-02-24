-- Migration to add singular topic and concept fields and difficulty_reason
ALTER TABLE public.question_bank 
ADD COLUMN IF NOT EXISTS topic TEXT,
ADD COLUMN IF NOT EXISTS concept TEXT,
ADD COLUMN IF NOT EXISTS difficulty_reason TEXT;

-- Migrate data from arrays to singular fields where they are NULL
-- We take the first element of the array if it exists, otherwise use 'General'
UPDATE public.question_bank 
SET 
  topic = COALESCE(topics[1], 'General'),
  concept = COALESCE(concepts[1], 'General')
WHERE (topic IS NULL OR concept IS NULL);

-- Setting NOT NULL constraints after migration
ALTER TABLE public.question_bank ALTER COLUMN topic SET NOT NULL;
ALTER TABLE public.question_bank ALTER COLUMN concept SET NOT NULL;

-- Note: We keep topics and concepts arrays for backward compatibility if needed, 
-- but the application will now primarily use the singular fields.
