-- Drop existing table
DROP TABLE IF EXISTS question_bank;

-- Create new restructure table
CREATE TABLE question_bank (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RLS
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access for authenticated users on question_bank"
    ON question_bank
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_question_bank_updated_at
    BEFORE UPDATE ON question_bank
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
