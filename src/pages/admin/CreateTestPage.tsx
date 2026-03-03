/**
 * Create/Edit Test Page for Admin
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Loader2,
  Calculator,
  Search,
  Download,
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { MultiSelect } from '@/components/ui/multi-select';
import { toast } from 'sonner';
import { QuestionBankItem } from '@/types';
import { supabase } from '@/integrations/supabase/client';

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

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(15);
  const [scheduledDate, setScheduledDate] = useState('');
  const [totalMarks, setTotalMarks] = useState(0);
  const [numberOfQuestions, setNumberOfQuestions] = useState<number | ''>('');
  const { data: questionBankSets } = useQuestionBankSets();
  const [questions, setQuestions] = useState<QuestionForm[]>([]);

  // Import from Question Bank: 1) Select banks 2) Topics/Concepts from banks (no dupes) 3) Button opens modal
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);
  const [selectedImportTopics, setSelectedImportTopics] = useState<string[]>([]);
  const [selectedImportConcepts, setSelectedImportConcepts] = useState<string[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const MODAL_ANY = '__any__';
  const [modalSearch, setModalSearch] = useState('');
  const [modalDifficulty, setModalDifficulty] = useState<string>('__any__');
  const [modalMark, setModalMark] = useState<string>('__any__');
  const [selectedImportKeys, setSelectedImportKeys] = useState<Set<string>>(new Set());

  // Track initial questions for diffing in edit mode
  const [initialQuestionIds, setInitialQuestionIds] = useState<Set<string>>(new Set());

  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);


  useEffect(() => {
    supabase.auth.stopAutoRefresh();

    return () => {
      supabase.auth.startAutoRefresh();
    }
  }, []);

  // Populate form in Edit Mode
  useEffect(() => {
    if (existingTest && isEditMode) {
      setTitle(existingTest.title);
      setDescription(existingTest.description || '');
      setDuration(existingTest.duration);
      setScheduledDate(new Date(existingTest.scheduledDate).toISOString().split('T')[0]);

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
      setTotalMarks(existingTest.totalMark || 0);
      setNumberOfQuestions(
        existingTest.numberOfQuestions != null ? existingTest.numberOfQuestions : '',
      );
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

  const calculateTotalMarks = () => {
    const total = questions.reduce((sum, q) => sum + (Number(q.mark) || 0), 0);
    setTotalMarks(total);
    toast.success(`Total marks calculated: ${total}`);
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
        documentText: "",
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

  // Questions only from selected question bank(s)
  const questionsFromSelectedBanks = (() => {
    if (!questionBankSets?.length || !selectedBankIds.length) return [];
    const list: { key: string; setTitle: string; item: QuestionBankItem }[] = [];
    questionBankSets
      .filter((s) => selectedBankIds.includes(s.id))
      .forEach((set) => {
        (set.questions || []).forEach((item, i) => {
          list.push({ key: `${set.id}-${i}`, setTitle: set.title, item });
        });
      });
    return list;
  })();

  // Unique topics and concepts from selected banks only (no duplicates)
  const uniqueTopicsFromBanks = (() => {
    const topics = questionsFromSelectedBanks.map((x) => x.item.topic).filter(Boolean);
    return Array.from(new Set(topics)) as string[];
  })();
  const uniqueConceptsFromBanks = (() => {
    const concepts = questionsFromSelectedBanks.map((x) => x.item.concept).filter(Boolean);
    return Array.from(new Set(concepts)) as string[];
  })();

  // Items for modal: selected banks + filter by selected topics/concepts
  const modalBaseItems = questionsFromSelectedBanks.filter(({ item }) => {
    if (selectedImportTopics.length && !selectedImportTopics.includes(item.topic)) return false;
    if (selectedImportConcepts.length && !selectedImportConcepts.includes(item.concept)) return false;
    return true;
  });

  // Inside modal: filter by search, difficulty, mark
  const modalFilteredItems = modalBaseItems.filter(({ item }) => {
    const q = modalSearch.trim().toLowerCase();
    if (q) {
      const match = (item.title || '').toLowerCase().includes(q) || (item.answer || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (modalDifficulty && modalDifficulty !== MODAL_ANY && String(item.difficulty) !== modalDifficulty) return false;
    if (modalMark && modalMark !== MODAL_ANY && String(item.marks) !== modalMark) return false;
    return true;
  });

  const handleSelectAllImport = () => {
    setSelectedImportKeys(new Set(modalFilteredItems.map((x) => x.key)));
  };

  const handleClearImportSelection = () => {
    setSelectedImportKeys(new Set());
  };

  const handleToggleImportItem = (key: string) => {
    setSelectedImportKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleImportSelected = () => {
    const toImport = Array.from(selectedImportKeys)
      .map((key) => questionsFromSelectedBanks.find((x) => x.key === key)?.item)
      .filter((q): q is QuestionBankItem => !!q);
    if (toImport.length === 0) {
      toast.error('Select at least one question to import.');
      return;
    }
    commitGeneratedQuestions(toImport);
    setSelectedImportKeys(new Set());
    setImportModalOpen(false);
  };

  const openImportModal = () => {
    setSelectedImportKeys(new Set());
    setModalSearch('');
    setModalDifficulty(MODAL_ANY);
    setModalMark(MODAL_ANY);
    setImportModalOpen(true);
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
            questionCount: questions.length,
            totalMark: totalMarks,
            numberOfQuestions:
              numberOfQuestions === '' ? undefined : Number(numberOfQuestions),
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
          totalMark: totalMarks,
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
        const numQ =
          numberOfQuestions === '' ? undefined : Number(numberOfQuestions);
        if (numQ != null) {
          await updateTest.mutateAsync({
            testId: test.id,
            data: { numberOfQuestions: numQ },
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalMark">Total Mark</Label>
                    <div className="flex gap-2">
                      <Input
                        id="totalMark"
                        type="number"
                        value={totalMarks}
                        onChange={(e) => setTotalMarks(Number(e.target.value))}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={calculateTotalMarks}
                        title="Calculate Total Marks"
                      >
                        <Calculator className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="numberOfQuestions">Question Limit</Label>
                    <Input
                      id="numberOfQuestions"
                      type="number"
                      min={1}
                      max={Math.max(questions.length, 1)}
                      value={numberOfQuestions === '' ? '' : numberOfQuestions}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNumberOfQuestions(v === '' ? '' : parseInt(v, 10) || '');
                      }}
                      placeholder={`eg: ${String(questions.length || '10')} questions`}
                    />
                  </div>

                </div>

                <div className="space-y-3">
                  <Label>Import from Question Bank</Label>
                  <p className="text-xs text-muted-foreground">
                    Select question bank(s), then topic(s) and concept(s). Open the modal to choose questions and import.
                  </p>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Question Bank</Label>
                    <MultiSelect
                      options={(questionBankSets || []).map((s) => ({ label: `${s.title} (${(s.questions || []).length})`, value: s.id }))}
                      selected={selectedBankIds}
                      onChange={setSelectedBankIds}
                      placeholder="Select question bank(s)..."
                    />
                  </div>
                  {selectedBankIds.length > 0 && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Topic</Label>
                          <MultiSelect
                            options={uniqueTopicsFromBanks.map((t) => ({ label: t, value: t }))}
                            selected={selectedImportTopics}
                            onChange={setSelectedImportTopics}
                            placeholder="All topics"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Concept</Label>
                          <MultiSelect
                            options={uniqueConceptsFromBanks.map((c) => ({ label: c, value: c }))}
                            selected={selectedImportConcepts}
                            onChange={setSelectedImportConcepts}
                            placeholder="All concepts"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={questions.length ? 'secondary' : 'default'}
                        onClick={openImportModal}
                        className="w-full"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        View & Select Questions
                      </Button>
                    </>
                  )}
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

        <Dialog open={importModalOpen} onOpenChange={setImportModalOpen} >
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Import questions</DialogTitle>
              <DialogDescription>
                Search and filter, then select questions to add to your test.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 flex-1 min-h-0 flex flex-col">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by question or answer..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Difficulty</Label>
                  <Select value={modalDifficulty} onValueChange={setModalDifficulty}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={MODAL_ANY}>Any</SelectItem>
                      {Array.from(new Set(modalBaseItems.map((x) => x.item.difficulty))).sort((a, b) => a - b).map((d) => (
                        <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Mark</Label>
                  <Select value={modalMark} onValueChange={setModalMark}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={MODAL_ANY}>Any</SelectItem>
                      {Array.from(new Set(modalBaseItems.map((x) => x.item.marks))).sort((a, b) => a - b).map((m) => (
                        <SelectItem key={m} value={String(m)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {modalFilteredItems.length} question(s) • {selectedImportKeys.size} selected
                </span>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={handleSelectAllImport}>
                    Select all
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={handleClearImportSelection}>
                    Clear
                  </Button>
                </div>
              </div>
              <div className="h-full rounded-md p-2 w-full  ">
                <div className="flex-1 rounded-md border  h-[450px] overflow-auto">
                  {modalFilteredItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No questions match the filters.</p>
                  ) : (
                    <div className="space-y-1">
                      {modalFilteredItems.map(({ key, setTitle, item }) => (
                        <label
                          key={key}
                          className="flex items-start gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={selectedImportKeys.has(key)}
                            onCheckedChange={() => handleToggleImportItem(key)}
                          />
                          <span className="flex-1 min-w-0 line-clamp-2">
                            {item.title || 'Untitled question'}
                            <span className="text-muted-foreground text-xs ml-1">({setTitle}) · D{item.difficulty} M{item.marks}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={handleImportSelected}
                disabled={selectedImportKeys.size === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Import selected ({selectedImportKeys.size})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
