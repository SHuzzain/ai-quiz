/**
 * Create/Edit Test Page for Admin
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Sparkles,
  Plus,
  Trash2,
  Save,
  Loader2,
  BrainCircuit,
  Settings2,
  Wand2
} from 'lucide-react';
import { AdminLayout } from '@/components/layout';
import {
  useCreateTest,
  useUpdateTest,
  useTestWithQuestions,
  useExtractQuestions,
  useAddQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  useLessons,
  useAnalyzeDocument
} from '@/hooks/useApi';
import { MultiSelect } from '@/components/ui/multi-select';
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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from 'sonner';
import { extractTextFromUrl } from '@/utils/fileParser';
import { DocumentAnalysis } from '@/types';

interface QuestionForm {
  id: string;
  questionText: string;
  correctAnswer: string;
  hints: string[];
  microLearning: string;
  order: number;
}

export function CreateTestPage() {
  const { testId } = useParams<{ testId: string }>();
  const isEditMode = !!testId;
  const navigate = useNavigate();

  // API Hooks
  const createTest = useCreateTest();
  const updateTest = useUpdateTest();
  const { data: existingTest, isLoading: isLoadingTest } = useTestWithQuestions(testId || '');
  const analyzeDocument = useAnalyzeDocument();
  const extractQuestions = useExtractQuestions();
  const addQuestion = useAddQuestion();
  const updateQuestionApi = useUpdateQuestion();
  const deleteQuestionApi = useDeleteQuestion();
  const { data: lessons } = useLessons();

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(15);
  const [scheduledDate, setScheduledDate] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [questions, setQuestions] = useState<QuestionForm[]>([]);

  // Track initial questions for diffing in edit mode
  const [initialQuestionIds, setInitialQuestionIds] = useState<Set<string>>(new Set());

  // UI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Analysis State
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysis | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Generation Options
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(5);

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
        order: q.order
      }));
      setQuestions(formattedQuestions);
      setInitialQuestionIds(new Set(formattedQuestions.map(q => q.id)));
    }
  }, [existingTest, isEditMode]);

  const handleAnalyze = async () => {
    if (!lessonId) {
      toast.error("Please select a lesson first");
      return;
    }

    const lesson = lessons?.find(l => l.id === lessonId);
    if (!lesson || !lesson.files || lesson.files.length === 0) {
      toast.error("Selected lesson has no files to analyze");
      return;
    }

    setIsAnalyzing(true);
    try {
      // 1. Extract text from all files
      let fullText = '';
      for (const file of lesson.files) {
        try {
          const text = await extractTextFromUrl(file.url, file.type, file.name);
          fullText += `\n--- File: ${file.name} ---\n${text}`;
        } catch (e) {
          console.error(`Failed to parse ${file.name}`, e);
          toast.warning(`Skipped ${file.name}: Could not parse content`);
        }
      }

      if (!fullText.trim()) {
        throw new Error("No text could be extracted from the lesson files");
      }

      setExtractedText(fullText);

      // 2. Analyze document
      const analysis = await analyzeDocument.mutateAsync({ content: fullText });
      setAnalysisResult(analysis);
      setIsDrawerOpen(true);

      // Auto-select all topics initially
      if (analysis.topics.length > 0) {
        setSelectedTopics(analysis.topics);
      }

    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error("Failed to analyze lesson content");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!extractedText) return;

    setIsGenerating(true);
    try {
      const result = await extractQuestions.mutateAsync({
        content: extractedText,
        count: questionCount,
        topics: selectedTopics.length > 0 ? selectedTopics : undefined
      });

      const newQuestions: QuestionForm[] = result.questions.map((q, i) => ({
        id: `gen-${Date.now()}-${i}`,
        questionText: q.questionText,
        correctAnswer: q.correctAnswer,
        hints: [],
        microLearning: '',
        order: questions.length + i + 1,
      }));

      setQuestions(prev => [...prev, ...newQuestions]);
      setIsDrawerOpen(false);
      toast.success(`Generated ${newQuestions.length} questions!`);
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error("Failed to generate questions");
    } finally {
      setIsGenerating(false);
    }
  };

  const addEmptyQuestion = () => {
    setQuestions(prev => [...prev, {
      id: `manual-${Date.now()}`,
      questionText: '',
      correctAnswer: '',
      hints: [],
      microLearning: '',
      order: prev.length + 1
    }]);
  };

  const updateQuestion = (id: string, updates: Partial<QuestionForm>) => {
    setQuestions(prev => prev.map(q =>
      q.id === id ? { ...q, ...updates } : q
    ));
  };

  const deleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleSave = async () => {
    if (!title || !scheduledDate || questions.length === 0) {
      toast.error('Please fill in required fields (Title, Date) and add at least one question.');
      return;
    }

    setIsSaving(true);
    try {
      let targetTestId = testId;

      if (isEditMode && testId) {
        // UPDATE MODE
        await updateTest.mutateAsync({
          testId,
          data: {
            title,
            description,
            duration,
            scheduledDate: new Date(scheduledDate),
            lessonId: lessonId || undefined,
            questionCount: questions.length
          }
        });

        // Handle Questions Diff
        const currentIds = new Set(questions.map(q => q.id));

        // 1. Delete removed questions
        const toDelete = Array.from(initialQuestionIds).filter(id => !currentIds.has(id));
        for (const id of toDelete) {
          await deleteQuestionApi.mutateAsync(id);
        }

        // 2. Update existing and Add new
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          const questionData = {
            questionText: q.questionText,
            correctAnswer: q.correctAnswer,
            hints: q.hints,
            microLearning: q.microLearning,
            order: i + 1,
          };

          if (initialQuestionIds.has(q.id)) {
            // Update
            await updateQuestionApi.mutateAsync({
              questionId: q.id,
              data: questionData
            });
          } else {
            // Add new
            await addQuestion.mutateAsync({
              testId,
              question: questionData
            });
          }
        }

        toast.success("Test updated successfully!");

      } else {
        // CREATE MODE
        const test = await createTest.mutateAsync({
          title,
          description,
          duration,
          scheduledDate: new Date(scheduledDate),
          lessonId,
        });
        targetTestId = test.id;

        // Add all questions
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
        {/* Header */}
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
          {/* Main Form Area */}
          <div className="md:col-span-2 space-y-6">

            {/* 1. Test Details */}
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

                {lessonId && (
                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing Lesson Content...
                      </>
                    ) : (
                      <>
                        <BrainCircuit className="w-4 h-4 mr-2" />
                        Analyze Content & Generate Questions
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* 2. Questions List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Questions ({questions.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={addEmptyQuestion}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Manual
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                    <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No questions yet.</p>
                    <p className="text-sm">Select a lesson and click "Analyze" to generate questions with AI.</p>
                  </div>
                ) : (
                  questions.map((q, idx) => (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 border rounded-xl bg-card relative group"
                    >
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => deleteQuestion(q.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>

                      <div className="space-y-3 pr-8">
                        <div className="flex items-center gap-2">
                          <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">
                            Q{idx + 1}
                          </span>
                        </div>
                        <Input
                          value={q.questionText}
                          onChange={(e) => updateQuestion(q.id, { questionText: e.target.value })}
                          placeholder="Question text..."
                          className="font-medium"
                        />
                        <div className="flex items-center gap-2">
                          <Label className="text-xs w-24">Answer:</Label>
                          <Input
                            value={q.correctAnswer}
                            onChange={(e) => updateQuestion(q.id, { correctAnswer: e.target.value })}
                            placeholder="Correct Answer"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Info (e.g. Analysis Summary Preview) */}
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

        {/* AI Generation Drawer */}
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerContent>
            <div className="mx-auto w-full max-w-4xl">
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-2 text-2xl">
                  <Sparkles className="w-6 h-6 text-indigo-500" />
                  AI Content Analysis
                </DrawerTitle>
                <DrawerDescription>
                  Review the lesson content analysis and configure question generation.
                </DrawerDescription>
              </DrawerHeader>

              {analysisResult && (
                <div className="p-4 grid md:grid-cols-2 gap-6">
                  {/* Analysis Results */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Detected Type</Label>
                      <div className="font-semibold">{analysisResult.type}</div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Difficulty</Label>
                      <Badge variant={
                        analysisResult.difficulty === 'Advanced' ? 'destructive' :
                          analysisResult.difficulty === 'Intermediate' ? 'default' : 'secondary'
                      }>
                        {analysisResult.difficulty}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Summary</Label>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {analysisResult.summary}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Key Topics</Label>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.topics.map(topic => (
                          <Badge variant="outline" key={topic}>{topic}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Generation Controls */}
                  <Card className="border-indigo-100 bg-indigo-50/30">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Settings2 className="w-5 h-5" />
                        Generation Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-3">
                        <Label>Focus Topics</Label>
                        <MultiSelect
                          options={analysisResult.topics.map(t => ({ label: t, value: t }))}
                          selected={selectedTopics}
                          onChange={setSelectedTopics}
                          placeholder="Select topics..."
                        />
                        <p className="text-xs text-muted-foreground">
                          AI will generate questions focused on these topics.
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <Label>Number of Questions</Label>
                          <span className="font-bold">{questionCount}</span>
                        </div>
                        <Slider
                          value={[questionCount]}
                          onValueChange={(vals) => setQuestionCount(vals[0])}
                          min={5}
                          max={20}
                          step={5}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground px-1">
                          <span>5</span>
                          <span>10</span>
                          <span>15</span>
                          <span>20</span>
                        </div>
                      </div>

                      <Button
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                        onClick={handleGenerateQuestions}
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-4 h-4 mr-2" />
                            Generate {questionCount} Questions
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              <DrawerFooter>
                <DrawerClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </AdminLayout>
  );
}
