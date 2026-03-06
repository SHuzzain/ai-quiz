-- Create question_bank_items table: one row per question with lesson_id and test_ids
CREATE TABLE question_bank_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    test_ids UUID[] NOT NULL DEFAULT '{}',
    question_text TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    working TEXT,
    topic TEXT NOT NULL,
    concept_tested TEXT NOT NULL,
    marks INTEGER NOT NULL DEFAULT 1,
    difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RLS
ALTER TABLE question_bank_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access for authenticated users on question_bank_items"
    ON question_bank_items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_question_bank_items_updated_at
    BEFORE UPDATE ON question_bank_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Index for filtering by lesson
CREATE INDEX idx_question_bank_items_lesson_id ON question_bank_items(lesson_id);

-- Index for searching question text / topic / concept
CREATE INDEX idx_question_bank_items_topic ON question_bank_items(topic);
CREATE INDEX idx_question_bank_items_concept_tested ON question_bank_items(concept_tested);
