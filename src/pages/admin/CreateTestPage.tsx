/**
 * Create/Edit Test Page for Admin
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Loader2,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout';
import { QuestionsManager } from '@/components/admin/questions/QuestionsManager';
import {
  useCreateTest,
  useUpdateTest,
  useTestWithQuestions,
  useAddQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useLessons,
  useEvaluateQuestionQuality,
  useRegenerateQuestionVariant,
  useQuestionBankSets,
} from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { AIQuestionGenerator } from '@/components/admin/ai-generator/AIQuestionGenerator';
import { QuestionBankItem } from '@/types';

interface QuestionForm {
  id: string;
  questionText: string;
  correctAnswer: string;
  hints: string[];
  microLearning: string;
  order: number;
  topic: string;
  concept: string;
  mark: number;
  difficulty: number;
  working: string;
  difficultyReason?: string;
  evaluateResult?: {
    isCorrect: boolean;
    feedback: string;
    suggestedImprovement?: string;
  } | null;
  isDirty?: boolean;
}

export function CreateTestPage() {
  const { testId } = useParams<{ testId: string }>();
  const isEditMode = !!testId;
  const navigate = useNavigate();

  // API Hooks
  const createTest = useCreateTest();
  const updateTest = useUpdateTest();
  const { data: existingTest, isLoading: isLoadingTest } = useTestWithQuestions(testId || '');
  const addQuestion = useAddQuestion();
  const updateQuestionApi = useUpdateQuestion();
  const deleteQuestionApi = useDeleteQuestion();
  const evaluateQuestion = useEvaluateQuestionQuality();
  const regenerateQuestion = useRegenerateQuestionVariant();
  const { data: lessons } = useLessons();

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(15);
  const [scheduledDate, setScheduledDate] = useState('');
  const [lessonId, setLessonId] = useState('');
  const { data: questionBankSets } = useQuestionBankSets({ lessonId });
  const [questions, setQuestions] = useState<QuestionForm[]>([]);

  // Track initial questions for diffing in edit mode
  const [initialQuestionIds, setInitialQuestionIds] = useState<Set<string>>(new Set());

  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [lessonContent, setLessonContent] = useState('');

  // Populate form in Edit Mode
  useEffect(() => {
    if (existingTest && isEditMode) {
      setTitle(existingTest.title);
      setDescription(existingTest.description || '');
      setDuration(existingTest.duration);
      setScheduledDate(new Date(existingTest.scheduledDate).toISOString().split('T')[0]);
      setLessonId(existingTest.lessonId || '');

      const formattedQuestions = existingTest.questions.map(q => ({
        id: q.id,
        questionText: q.questionText,
        correctAnswer: q.correctAnswer,
        hints: q.hints || [],
        microLearning: q.microLearning || '',
        order: q.order,
        topic: q.topic || "",
        concept: q.concept || "",
        mark: q.mark || 0,
        difficulty: q.difficulty || 0,
        working: q.working || ""
      }));
      setQuestions(formattedQuestions);
      setInitialQuestionIds(new Set(formattedQuestions.map(q => q.id)));
    }
  }, [existingTest, isEditMode]);

  const addEmptyQuestion = () => {
    setQuestions(prev => [...prev, {
      id: `manual-${Date.now()}`,
      questionText: '',
      correctAnswer: '',
      hints: [],
      microLearning: '',
      topic: '',
      concept: '',
      mark: 1,
      difficulty: 1,
      working: '',
      isDirty: false,
      order: prev.length + 1
    }]);
  };

  const updateQuestion = (id: string, updates: Partial<QuestionForm>) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === id) {
        const hasDirtyChange = 'questionText' in updates || 'correctAnswer' in updates || 'topic' in updates || 'concept' in updates || 'working' in updates;
        return { ...q, ...updates, isDirty: q.isDirty || hasDirtyChange };
      }
      return q;
    }));
  };

  const handleEvaluateQuestion = async (id: string) => {
    const q = questions.find(question => question.id === id);
    if (!q || !q.questionText || !q.correctAnswer) {
      toast.error("Question text and answer are required for evaluation.");
      return;
    }

    setEvaluatingId(id);
    try {
      const result = await evaluateQuestion.mutateAsync({
        question: q.questionText,
        answer: q.correctAnswer,
        working: q.working,
      });

      updateQuestion(id, { evaluateResult: result });

      if (result.isCorrect) {
        toast.success("Question looks good according to AI!");
      } else {
        toast.warning("AI flagged some potential issues with this question.");
      }
    } catch (error) {
      console.error("Evaluation failed", error);
      toast.error("Failed to evaluate question");
    } finally {
      setEvaluatingId(null);
    }
  };

  const handleRegenerateQuestion = async (id: string) => {
    const q = questions.find(question => question.id === id);
    if (!q) return;

    setRegeneratingId(id);
    try {
      const result = await regenerateQuestion.mutateAsync({
        documentText: lessonContent,
        currentQuestion: {
          title: q.questionText,
          answer: q.correctAnswer,
          topic: q.topic,
          concept: q.concept,
          difficulty: q.difficulty,
          marks: q.mark,
          working: q.working,
          isDirtyFields: {
            title: true,
            answer: true,
            working: true
          },
        },
      });

      updateQuestion(id, {
        questionText: result.title,
        correctAnswer: result.answer,
        topic: result.topic,
        concept: result.concept,
        difficulty: result.difficulty,
        mark: result.marks,
        working: result.working,
        difficultyReason: result.difficultyReason,
        evaluateResult: null,
        isDirty: false
      });

      toast.success("Question regenerated successfully!");
    } catch (error) {
      console.error("Regeneration failed", error);
      toast.error("Failed to regenerate question");
    } finally {
      setRegeneratingId(null);
    }
  };

  const deleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const commitGeneratedQuestions = (newGeneratedQuestions: QuestionBankItem[]) => {
    const startOrder = questions.length + 1;
    const finalQuestions: QuestionForm[] = newGeneratedQuestions.map((q, i) => ({
      id: `gen-${Date.now()}-${i}`,
      questionText: q.title,
      correctAnswer: q.answer,
      hints: [],
      microLearning: '',
      topic: q.topic,
      concept: q.concept,
      mark: q.marks,
      difficulty: q.difficulty,
      working: q.working || '',
      difficultyReason: q.difficultyReason || '',
      evaluateResult: null,
      isDirty: false,
      order: startOrder + i,
    }));
    setQuestions(prev => [...prev, ...finalQuestions]);
    toast.success(`Added ${finalQuestions.length} questions to your test!`);
  };

  const handleSave = async () => {
    if (!title || !scheduledDate || questions.length === 0) {
      toast.error('Please fill in required fields (Title, Date) and add at least one question.');
      return;
    }

    setIsSaving(true);
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayString = `${year}-${month}-${day}`;
      const isToday = scheduledDate === todayString;

      if (isEditMode && testId) {
        await updateTest.mutateAsync({
          testId,
          data: {
            title,
            description,
            duration,
            scheduledDate: new Date(scheduledDate),
            lessonId: lessonId || undefined,
            questionCount: questions.length,
            ...(isToday ? { status: 'active' } : {})
          }
        });

        const currentIds = new Set(questions.map(q => q.id));
        const toDelete = Array.from(initialQuestionIds).filter(id => !currentIds.has(id));
        for (const id of toDelete) {
          await deleteQuestionApi.mutateAsync(id);
        }

        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          const questionData = {
            questionText: q.questionText,
            correctAnswer: q.correctAnswer,
            hints: q.hints,
            microLearning: q.microLearning,
            order: i + 1,
            topic: q.topic || '',
            concept: q.concept || '',
            mark: q.mark || 1,
            difficulty: q.difficulty || 1,
            working: q.working || '',
            difficultyReason: q.difficultyReason || '',
          };

          if (initialQuestionIds.has(q.id)) {
            await updateQuestionApi.mutateAsync({
              questionId: q.id,
              data: questionData
            });
          } else {
            await addQuestion.mutateAsync({
              testId,
              question: questionData
            });
          }
        }
        toast.success("Test updated successfully!");
      } else {
        const test = await createTest.mutateAsync({
          title,
          description,
          duration,
          scheduledDate: new Date(scheduledDate),
          lessonId,
          status: isToday ? 'active' : 'draft',
        });

        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          await addQuestion.mutateAsync({
            testId: test.id,
            question: {
              questionText: q.questionText,
              correctAnswer: q.correctAnswer,
              hints: q.hints,
              microLearning: q.microLearning,
              order: i + 1,
              topic: q.topic || '',
              concept: q.concept || '',
              mark: q.mark || 1,
              difficulty: q.difficulty || 1,
              working: q.working || '',
              difficultyReason: q.difficultyReason || '',
            },
          });
        }
        toast.success("Test created successfully!");
      }

      navigate('/admin/tests');
    } catch (error) {
      console.error('Failed to save test:', error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} test`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditMode && isLoadingTest) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{isEditMode ? 'Edit Test' : 'Create New Test'}</h1>
            <p className="text-muted-foreground">
              {isEditMode ? 'Update test details and questions' : 'AI-Powered Test Generation'}
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Solar System Quiz"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (min)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      min={5}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Assign Lesson {isEditMode ? '(Optional)' : '*'}</Label>
                  <Select value={lessonId} onValueChange={setLessonId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a lesson to generate from" />
                    </SelectTrigger>
                    <SelectContent>
                      {lessons?.map((lesson) => (
                        <SelectItem key={lesson.id} value={lesson.id}>
                          {lesson.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Required for AI generation using lesson files.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Import from Question Bank</Label>
                  <Select
                    onValueChange={(setId) => {
                      const selectedSet = questionBankSets?.find(s => s.id === setId);
                      if (selectedSet) {
                        commitGeneratedQuestions(selectedSet.questions);
                        toast.success(`Imported ${selectedSet.questions.length} questions from "${selectedSet.title}"`);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a question set to import" />
                    </SelectTrigger>
                    <SelectContent>
                      {questionBankSets?.length === 0 && (
                        <div className="p-2 text-xs text-center text-muted-foreground">No sets found for this lesson</div>
                      )}
                      {questionBankSets?.map((set) => (
                        <SelectItem key={set.id} value={set.id}>
                          {set.title} ({set.questions.length} questions)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select a pre-generated set to append to your test.
                  </p>
                </div>

                <div className="pt-2">
                  <AIQuestionGenerator
                    lessonId={lessonId}
                    onQuestionsCommitted={commitGeneratedQuestions}
                    onExtractedText={setLessonContent}
                  />
                </div>
              </CardContent>
            </Card>

            <QuestionsManager
              questions={questions}
              onUpdate={updateQuestion}
              onDelete={deleteQuestion}
              onAdd={addEmptyQuestion}
              onEvaluate={handleEvaluateQuestion}
              onRegenerate={handleRegenerateQuestion}
              evaluatingId={evaluatingId}
              regeneratingId={regeneratingId}
            />
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Test description..."
                  rows={5}
                />
              </CardContent>
            </Card>

            <Button
              size="lg"
              className="w-full"
              onClick={handleSave}
              disabled={isSaving || !title || questions.length === 0}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : (isEditMode ? 'Update Test' : 'Save Test')}
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
