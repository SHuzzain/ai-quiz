-- Migration to support multiple files in lessons
-- 1. Add 'files' column
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'::jsonb;

-- 2. Migrate existing data (if any)
-- Construct a JSON object for the existing file and put it in an array
UPDATE lessons 
SET files = jsonb_build_array(
  jsonb_build_object(
    'name', file_name,
    'url', file_url,
    'type', file_type
  )
)
WHERE file_url IS NOT NULL AND files = '[]'::jsonb;

-- 3. Drop old columns
-- Make them nullable first just in case we need to rollback comfortably, 
-- but strictly we can drop them. Let's drop them to enforce the new schema.
ALTER TABLE lessons DROP COLUMN IF EXISTS file_name;
ALTER TABLE lessons DROP COLUMN IF EXISTS file_url;
ALTER TABLE lessons DROP COLUMN IF EXISTS file_type;
