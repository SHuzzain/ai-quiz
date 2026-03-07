import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Plus, Minus } from 'lucide-react';
import { AdminLayout } from '@/components/layout';
import {
  useCreateTest,
  useUpdateTest,
  useTestWithQuestions,
  useAddQuestion,
  useDeleteQuestion,
  useQuestionBankItems,
} from '@/hooks/useApi';
import {
  resolveConditionsFromBank,
  getRemainingItemsAfterConditions,
  mapBankItemToAddQuestionPayload,
  type TestCondition,
} from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const defaultCondition: TestCondition = {
  topics: [],
  concept: [],
  difficulty: 1,
  numberOfQuestions: 5,
};

export function CreateTestPage() {
  const { testId } = useParams<{ testId: string }>();
  const isEditMode = !!testId;
  const navigate = useNavigate();

  const createTest = useCreateTest();
  const updateTest = useUpdateTest();
  const { data: existingTest, isLoading: isLoadingTest } = useTestWithQuestions(testId || '');
  const addQuestion = useAddQuestion();
  const deleteQuestion = useDeleteQuestion();
  const { data: questionBankList } = useQuestionBankItems({ pageSize: 500 });

  /** Single mapped list (snake_case + id) for resolve and remaining; dedupe works across conditions. */
  const mappedBankItems = useMemo(() => {
    const items = questionBankList?.items ?? [];
    return items.map((x) => ({
      id: x.id,
      topic: x.topic,
      concept_tested: x.conceptTested,
      question_text: x.questionText,
      correct_answer: x.correctAnswer,
      difficulty: x.difficulty,
      marks: x.marks ?? 0,
      working: x.working ?? null,
    }));
  }, [questionBankList]);

  const [title, setTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [duration, setDuration] = useState(15);
  const [totalMarks, setTotalMarks] = useState(0);
  const [conditions, setConditions] = useState<TestCondition[]>([{ ...defaultCondition }]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingTest && isEditMode) {
      setTitle(existingTest.title);
      setScheduledDate(new Date(existingTest.scheduledDate).toISOString().split('T')[0]);
      setDuration(existingTest.duration);
      setTotalMarks(existingTest.totalMark ?? 0);
      const stored = existingTest.conditions;
      if (Array.isArray(stored) && stored.length > 0) {
        setConditions(
          stored.map((c) => ({
            topics: Array.isArray(c.topics) ? c.topics : [],
            concept: Array.isArray(c.concept) ? c.concept : [],
            difficulty: typeof c.difficulty === 'number' ? c.difficulty : 1,
            numberOfQuestions: typeof c.numberOfQuestions === 'number' ? c.numberOfQuestions : 5,
          })),
        );
      } else {
        setConditions([{ ...defaultCondition }]);
      }
    }
  }, [existingTest, isEditMode]);

  const addCondition = () => {
    setConditions((prev) => [...prev, { ...defaultCondition }]);
  };

  const removeCondition = (index: number) => {
    if (conditions.length <= 1) return;
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<TestCondition>) => {
    setConditions((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...updates } : c)),
    );
  };

  /** Count items in pool that match this condition (topic, concept, difficulty). */
  const countMatchingInPool = (
    cond: TestCondition,
    pool: { topic: string; concept_tested: string; difficulty: number }[],
  ) =>
    pool.filter((item) => {
      if (cond.topics.length > 0 && !cond.topics.includes(item.topic)) return false;
      if (cond.concept.length > 0 && !cond.concept.includes(item.concept_tested)) return false;
      if (item.difficulty !== cond.difficulty) return false;
      return true;
    }).length;

  /** Auto-clear topic/concept/difficulty that are no longer in available options after earlier conditions. */
  useEffect(() => {
    if (mappedBankItems.length === 0) return;
    setConditions((prev) => {
      const next = prev.map((cond, i) => {
        const remaining = getRemainingItemsAfterConditions(prev, i, mappedBankItems);
        const availableTopics = Array.from(new Set(remaining.map((x) => x.topic).filter(Boolean)));
        const availableConcepts = Array.from(new Set(remaining.map((x) => x.concept_tested).filter(Boolean)));
        const availableDifficulties = Array.from(new Set(remaining.map((x) => x.difficulty))).sort((a, b) => a - b);
        const topicsOk = cond.topics.filter((t) => availableTopics.includes(t));
        const conceptOk = cond.concept.filter((c) => availableConcepts.includes(c));
        const difficultyOk =
          availableDifficulties.length > 0 && availableDifficulties.includes(cond.difficulty)
            ? cond.difficulty
            : availableDifficulties[0] ?? 1;
        const changed =
          topicsOk.length !== cond.topics.length ||
          conceptOk.length !== cond.concept.length ||
          difficultyOk !== cond.difficulty;
        if (!changed) return cond;
        return { ...cond, topics: topicsOk, concept: conceptOk, difficulty: difficultyOk };
      });
      const same =
        next.length === prev.length &&
        next.every(
          (c, i) =>
            c.topics.length === prev[i].topics.length &&
            c.topics.every((t, j) => t === prev[i].topics[j]) &&
            c.concept.length === prev[i].concept.length &&
            c.concept.every((t, j) => t === prev[i].concept[j]) &&
            c.difficulty === prev[i].difficulty,
        );
      return same ? prev : next;
    });
  }, [conditions, mappedBankItems]);

  const handleSave = async () => {
    if (!title?.trim()) {
      toast.error('Title is required.');
      return;
    }
    if (!scheduledDate) {
      toast.error('Published date is required.');
      return;
    }
    if (conditions.length === 0) {
      toast.error('Add at least one condition.');
      return;
    }
    const invalidCondition = conditions.find(
      (c) =>
        (c.topics.length === 0 && c.concept.length === 0) ||
        Number(c.numberOfQuestions ?? 0) < 1,
    );
    if (invalidCondition) {
      toast.error('Each condition must have Topics or Concept and No. of Questions >= 1.');
      return;
    }

    // Question Limit is auto-calculated from conditions.
    const questionLimitNum = conditions.reduce((sum, c) => sum + Number(c.numberOfQuestions ?? 0), 0);
    if (questionLimitNum < 1) {
      toast.error('Total No. of Questions must be at least 1.');
      return;
    }

    const resolved = resolveConditionsFromBank(conditions, mappedBankItems);

    if (resolved.length === 0) {
      toast.error('No questions match the current conditions. Adjust Topics, Concept, or Difficulty.');
      return;
    }

    const numQ = questionLimitNum;
    if (numQ > resolved.length) {
      toast.error('Question limit cannot be greater than the number of questions from conditions.');
      return;
    }

    setIsSaving(true);
    try {
      const today = new Date();
      const todayString = today.toISOString().slice(0, 10);
      const isToday = scheduledDate === todayString;

      if (isEditMode && testId) {
        await updateTest.mutateAsync({
          testId,
          data: {
            title: title.trim(),
            description: '',
            duration,
            scheduledDate: new Date(scheduledDate),
            totalMark: totalMarks,
            conditions: conditions.map((c) => ({
              topics: c.topics,
              concept: c.concept,
              difficulty: c.difficulty,
              numberOfQuestions: Number(c.numberOfQuestions ?? 0),
            })),
            ...(isToday ? { status: 'active' } : {}),
          },
        });

        const existingIds = (existingTest?.questions ?? []).map((q) => q.id);
        for (const id of existingIds) {
          await deleteQuestion.mutateAsync(id);
        }

        for (let i = 0; i < resolved.length; i++) {
          await addQuestion.mutateAsync({
            testId,
            question: mapBankItemToAddQuestionPayload(resolved[i], i + 1),
          });
        }

        await updateTest.mutateAsync({
          testId,
          data: {
            questionCount: resolved.length,
            numberOfQuestions: numQ,
          },
        });

        toast.success('Test updated successfully.');
      } else {
        const test = await createTest.mutateAsync({
          title: title.trim(),
          description: '',
          duration,
          scheduledDate: new Date(scheduledDate),
          totalMark: totalMarks,
          status: isToday ? 'active' : 'draft',
          numberOfQuestions: numQ,
          conditions,
        });

        for (let i = 0; i < resolved.length; i++) {
          await addQuestion.mutateAsync({
            testId: test.id,
            question: mapBankItemToAddQuestionPayload(resolved[i], i + 1),
          });
        }

        await updateTest.mutateAsync({
          testId: test.id,
          data: {
            questionCount: resolved.length,
            conditions: conditions.map((c) => ({
              topics: c.topics,
              concept: c.concept,
              difficulty: c.difficulty,
              numberOfQuestions: Number(c.numberOfQuestions ?? 0),
            })),
            numberOfQuestions: numQ,
          },
        });

        toast.success('Test created successfully.');
      }

      navigate('/admin/tests');
    } catch (err) {
      console.error('Failed to save test:', err);
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

  const questionLimitNumForSave = conditions.reduce((sum, c) => sum + Number(c.numberOfQuestions ?? 0), 0);
  const canSave =
    title.trim() &&
    scheduledDate &&
    questionLimitNumForSave >= 1 &&
    conditions.length > 0 &&
    !conditions.some(
      (c) => (c.topics.length === 0 && c.concept.length === 0) || Number(c.numberOfQuestions ?? 0) < 1,
    );

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEditMode ? 'Edit Test' : 'Create New Test'}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode
                ? 'Update test details and conditions. Questions will be replaced from the question bank.'
                : 'Define test details and conditions to pull questions from the question bank.'}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Solar System Quiz"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Published date *</Label>
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
                <Input
                  id="totalMark"
                  type="number"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numberOfQuestions">Question Limit *</Label>
                <Input
                  id="numberOfQuestions"
                  type="number"
                  min={1}
                  value={questionLimitNumForSave}
                  disabled
                  placeholder="e.g. 10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conditions</CardTitle>
            <p className="text-sm text-muted-foreground">
              Add conditions to pull questions from the question bank. Each condition filters by Topics, Concept, and Difficulty. Later conditions only see options that still have questions remaining after earlier conditions.
            </p>
            <p className="text-sm font-medium">
              Total available from bank:{' '}
              <span className="text-green-600 dark:text-green-500">
                {mappedBankItems.length} questions
              </span>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {conditions.map((cond, index) => {
              const remaining = getRemainingItemsAfterConditions(conditions, index, mappedBankItems);
              const availableTopics = Array.from(new Set(remaining.map((x) => x.topic).filter(Boolean)));
              const availableConcepts = Array.from(new Set(remaining.map((x) => x.concept_tested).filter(Boolean)));
              const availableDifficulties = Array.from(new Set(remaining.map((x) => x.difficulty))).sort((a, b) => a - b);
              const matchingCount = countMatchingInPool(cond, remaining);
              const isAvailable = matchingCount >= Number(cond.numberOfQuestions ?? 0);
              const noRemaining = remaining.length === 0;

              return (
                <div
                  key={index}
                  className="rounded-lg border bg-muted/30 overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-muted/50">
                    <span className="text-sm font-medium">Condition {index + 1}</span>
                    <span
                      className={`text-xs font-medium ${isAvailable ? 'text-green-600 dark:text-green-500' : 'text-destructive'}`}
                      title={
                        noRemaining
                          ? 'No questions left after earlier conditions'
                          : `${matchingCount} matching in remaining pool; need ${cond.numberOfQuestions}`
                      }
                    >
                      {noRemaining
                        ? 'Not available (0)'
                        : isAvailable
                          ? `Available (${matchingCount})`
                          : `Not available (${matchingCount} / ${cond.numberOfQuestions})`}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-end gap-3 p-4">
                    {noRemaining ? (
                      <>
                        <p className="text-sm text-muted-foreground flex-1">
                          No remaining questions; reduce earlier condition counts or add more to the bank.
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCondition(index)}
                          disabled={conditions.length <= 1}
                          title="Remove condition"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-[140px] space-y-1.5">
                          <Label className="text-xs">Topics</Label>
                          <MultiSelect
                            options={availableTopics.map((t) => ({ label: t, value: t }))}
                            selected={cond.topics.filter((t) => availableTopics.includes(t))}
                            onChange={(v) => updateCondition(index, { topics: v })}
                            placeholder="Select topics"
                          />
                        </div>
                        <div className="flex-1 min-w-[140px] space-y-1.5">
                          <Label className="text-xs">Concept</Label>
                          <MultiSelect
                            options={availableConcepts.map((c) => ({ label: c, value: c }))}
                            selected={cond.concept.filter((c) => availableConcepts.includes(c))}
                            onChange={(v) => updateCondition(index, { concept: v })}
                            placeholder="Select concepts"
                          />
                        </div>
                        <div className="w-[100px] space-y-1.5">
                          <Label className="text-xs">Difficulty</Label>
                          <Select
                            value={
                              availableDifficulties.includes(cond.difficulty)
                                ? String(cond.difficulty)
                                : availableDifficulties[0] != null
                                  ? String(availableDifficulties[0])
                                  : ''
                            }
                            onValueChange={(v) =>
                              updateCondition(index, { difficulty: Number(v) })
                            }
                            disabled={availableDifficulties.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableDifficulties.map((d) => (
                                <SelectItem key={d} value={String(d)}>
                                  {d}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-[120px] space-y-1.5">
                          <Label className="text-xs">No. of Questions</Label>
                          <Input
                            type="number"
                            min={1}
                            value={cond.numberOfQuestions}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateCondition(index, {
                                numberOfQuestions: v === '' ? '' : parseInt(v, 10) || '',
                              })
                            }}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCondition(index)}
                          disabled={conditions.length <= 1}
                          title="Remove condition"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <Button type="button" variant="outline" onClick={addCondition} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Condition
            </Button>
          </CardContent>
        </Card>

        <Button
          size="lg"
          className="w-full"
          onClick={handleSave}
          disabled={!canSave || isSaving}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          {isEditMode ? 'Update Test' : 'Save Test'}
        </Button>
      </div>
    </AdminLayout>
  );
}
