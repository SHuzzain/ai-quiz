-- Store test conditions (Topics, Concept, Difficulty, No. of Questions per condition) for edit binding and re-resolve.
-- Shape: JSONB array of { "topics": string[], "concept": string[], "difficulty": number, "numberOfQuestions": number }
ALTER TABLE tests
ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT NULL;

COMMENT ON COLUMN tests.conditions IS 'Array of condition configs used to resolve questions from question bank; each has topics, concept, difficulty, numberOfQuestions';
