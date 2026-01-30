"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Upload,
  Sparkles,
  Plus,
} from 'lucide-react';
import {
  useCreateTest,
  useExtractQuestions,
  useAddQuestion,
  useLessons,
  useGenerateHints,
  useGenerateMicroLearning
} from '@/features/quiz-creator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QuestionForm {
  id: string;
  questionText: string;
  correctAnswer: string;
  hints: string[];
  microLearning: string;
}

interface GeneratingState {
  [key: string]: boolean;
}

export default function CreateTestPage() {
  const createTest = useCreateTest();
  const extractQuestions = useExtractQuestions();
  const addQuestion = useAddQuestion();
  const { data: lessons } = useLessons();
  const generateHints = useGenerateHints();
  const generateMicroLearning = useGenerateMicroLearning();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(15);
  const [scheduledDate, setScheduledDate] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [questions, setQuestions] = useState<QuestionForm[]>([]);
  const [questionCount, setQuestionCount] = useState(5);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatingHints, setGeneratingHints] = useState<GeneratingState>({});
  const [generatingMicroLearning, setGeneratingMicroLearning] = useState<GeneratingState>({});

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
      const result = await extractQuestions.mutateAsync({ file, questionCount });
      const newQuestions: QuestionForm[] = result.questions.map((q, i) => ({
        id: `temp-${Date.now()}-${i}`,
        questionText: q.questionText,
        correctAnswer: q.correctAnswer,
        hints: q.hints,
        microLearning: q.microLearning,
      }));
      setQuestions(prev => [...prev, ...newQuestions]);
    } catch (error) {
      console.error('Failed to extract questions:', error);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerateHints = async (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question || !question.questionText || !question.correctAnswer) {
      alert("Please provide a question and a correct answer first.");
      return;
    }

    setGeneratingHints(prev => ({ ...prev, [questionId]: true }));
    try {
      const result = await generateHints.mutateAsync({
        questionText: question.questionText,
        correctAnswer: question.correctAnswer
      });
      updateQuestion(questionId, { hints: result.hints });
    } catch (error) {
      console.error('Failed to generate hints:', error);
    } finally {
      setGeneratingHints(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const handleGenerateMicroLearning = async (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question || !question.questionText || !question.correctAnswer) {
      alert("Please provide a question and a correct answer first.");
      return;
    }

    setGeneratingMicroLearning(prev => ({ ...prev, [questionId]: true }));
    try {
      const result = await generateMicroLearning.mutateAsync({
        questionText: question.questionText,
        correctAnswer: question.correctAnswer
      });
      updateQuestion(questionId, { microLearning: result.microLearning });
    } catch (error) {
      console.error('Failed to generate micro-learning:', error);
    } finally {
      setGeneratingMicroLearning(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const addEmptyQuestion = () => {
    setQuestions(prev => [...prev, {
      id: `temp-${Date.now()}`,
      questionText: 'The __BLANK__ is...',
      correctAnswer: '',
      hints: ['', '', ''],
      microLearning: '',
    }]);
  };

  const updateQuestion = (id: string, updates: Partial<QuestionForm>) => {
    setQuestions(prev => prev.map(q =>
      q.id === id ? { ...q, ...updates } : q
    ));
  };

  const updateHint = (questionId: string, hintIndex: number, value: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        const newHints = [...q.hints];
        newHints[hintIndex] = value;
        return { ...q, hints: newHints };
      }
      return q;
    }));
  };

  const deleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleSave = async () => {
    // ... (handleSave implementation remains the same)
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-title">Title</Label>
            <Input
              id="test-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter test title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="test-description">Description</Label>
            <Textarea
              id="test-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter test description"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="test-duration">Duration (minutes)</Label>
              <Input
                id="test-duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-scheduled-date">Public Date</Label>
              <Input
                id="test-scheduled-date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Upload */}

      {/* Question Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <label className="sm:col-span-2">
              <div className="flex items-center justify-center gap-3 p-6 border-2 border-dashed rounded-xl hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer h-full">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {isExtracting ? 'Extracting questions...' : 'Upload question file (PDF/DOC/TXT)'}
                </span>
              </div>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isExtracting}
              />
            </label>
            <div className="space-y-2">
              <Label htmlFor="question-count">Number of Questions</Label>
              <Input
                id="question-count"
                type="number"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                min={1}
                max={10}
              />
              <Button
                variant="outline"
                onClick={addEmptyQuestion}
                className="w-full gap-2 mt-2"
              >
                <Plus className="w-4 h-4" />
                Add Manually
              </Button>
            </div>
          </div>

          {/* ... (isExtracting indicator remains the same) */}

          <div className="space-y-4">
            {questions.map((question, index) => (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 border rounded-xl bg-muted/30"
              >
                {/* ... (Question header remains the same) */}

                <div className="space-y-4">
                  {/* ... (Question and Answer inputs remain the same) */}

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Hints (up to 3)</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGenerateHints(question.id)}
                        disabled={generatingHints[question.id] || !question.questionText || !question.correctAnswer}
                        className="gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        {generatingHints[question.id] ? 'Generating...' : 'Generate'}
                      </Button>
                    </div>
                    <div className="grid gap-2">
                      {[0, 1, 2].map((i) => (
                        <Input
                          key={i}
                          value={question.hints[i] || ''}
                          onChange={(e) => updateHint(question.id, i, e.target.value)}
                          placeholder={`Hint ${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Micro Learning Explanation</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGenerateMicroLearning(question.id)}
                        disabled={generatingMicroLearning[question.id] || !question.questionText || !question.correctAnswer}
                        className="gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        {generatingMicroLearning[question.id] ? 'Generating...' : 'Generate'}
                      </Button>
                    </div>
                    <Textarea
                      value={question.microLearning}
                      onChange={(e) => updateQuestion(question.id, { microLearning: e.target.value })}
                      placeholder="A simple explanation for kids aged 5-10..."
                      rows={3}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ... (Empty state and action buttons remain the same) */}
        </CardContent>
      </Card>

      {/* ... (Footer buttons remain the same) */}
    </div>
  );
}
