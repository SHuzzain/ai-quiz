import { useNavigate } from 'react-router-dom';
import { AIQuestionGenerator } from '@/components/admin/ai-generator/AIQuestionGenerator';
import { QuestionsManager, QuestionEditorData } from '@/components/admin/questions/QuestionsManager';

import { AdminLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, Wand2, ArrowLeft, Loader2, Save } from 'lucide-react';
import { FormProvider, Controller } from 'react-hook-form';
import { motion } from 'framer-motion';

import { useAdminQuestionBank } from '@/hooks/useAdminQuestionBank';

export default function AdminQuestionBankCreatePage() {
    const navigate = useNavigate();
    const {
        form,
        generatedFields,
        lessons,
        isLoadingLessons,
        saveItemsPending,
        regeneratingId,
        evaluatingId,
        commitQuestions,
        setLessonContent,
        handleRegenerateQuestion,
        handleEvaluateQuestion,
        handleSaveToBank,
        addEmptyQuestion,
        removeQuestion,
        updateQuestionById
    } = useAdminQuestionBank();

    const lessonId = form.watch('lessonId');

    const handleBatchSave = async () => {
        await handleSaveToBank();
        navigate('/admin/questions');
    };

    const mappedQuestions: QuestionEditorData[] = generatedFields.map((f) => ({
        id: f.id,
        questionText: f.title,
        correctAnswer: f.answer,
        topic: f.topic,
        concept: f.concept,
        mark: f.marks,
        difficulty: f.difficulty,
        working: f.working || "",
        difficultyReason: f.difficultyReason,
        evaluateResult: f.evaluateResult ? {
            isCorrect: !!f.evaluateResult.isCorrect,
            feedback: f.evaluateResult.feedback || "",
            suggestedImprovement: f.evaluateResult.suggestedImprovement
        } : null,
        isDirty: f.isDirty
    }));

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-6 px-4 py-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            {/* <div className="p-2 bg-primary/100 rounded-lg">
                                <Database className="w-6 h-6 text-primary" />
                            </div> */}
                            <h1 className="text-3xl font-bold tracking-tight">Generate Questions</h1>
                        </div>
                        <p className="text-muted-foreground">Use AI to generate high-quality questions from your lesson materials.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={() => navigate('/admin/questions')} className="gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Back to List
                        </Button>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                >
                    <FormProvider {...form}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Left: Configuration */}
                            <Card className="md:col-span-1 shadow-sm h-fit">
                                <CardHeader>
                                    <CardTitle className="text-lg text-foreground">Document Source</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Session Title</Label>
                                        <Input
                                            placeholder="e.g., Intro to Algebra variants"
                                            {...form.register("title")}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Assign Lesson *</Label>
                                        <Controller
                                            name={"lessonId"}
                                            control={form.control}
                                            render={({ field }) => (
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <SelectTrigger disabled={isLoadingLessons}>
                                                        <SelectValue placeholder="Select a lesson" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {lessons?.map(l => (
                                                            <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                        <p className="text-xs text-muted-foreground">Select a lesson to analyze its documents.</p>
                                    </div>

                                    <div className="pt-2 border-t">
                                        <AIQuestionGenerator
                                            lessonId={lessonId}
                                            onQuestionsCommitted={commitQuestions}
                                            onExtractedText={setLessonContent}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Right: Preview & Actions */}
                            <div className="md:col-span-2 space-y-6">
                                <Card className="border-primary/20 shadow-sm overflow-hidden border-none shadow-none bg-transparent">
                                    <CardHeader className="bg-transparent px-0 py-4 pt-0">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Wand2 className="w-5 h-5 text-primary" />
                                                <CardTitle className="text-lg text-primary">
                                                    Generated Preview
                                                </CardTitle>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {generatedFields.length > 0 && (
                                                    <Button
                                                        onClick={handleBatchSave}
                                                        disabled={saveItemsPending}
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700 shadow-sm"
                                                    >
                                                        {saveItemsPending ? (
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        ) : (
                                                            <Save className="w-4 h-4 mr-2" />
                                                        )}
                                                        Save to Question Bank
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <QuestionsManager
                                            questions={mappedQuestions}
                                            onUpdate={(qId, updates) => {
                                                const mappedUpdates: Record<string, string | number | boolean | object> = {};
                                                if (updates.questionText !== undefined) mappedUpdates.title = updates.questionText;
                                                if (updates.correctAnswer !== undefined) mappedUpdates.answer = updates.correctAnswer;
                                                if (updates.mark !== undefined) mappedUpdates.marks = updates.mark;
                                                if (updates.topic !== undefined) mappedUpdates.topic = updates.topic;
                                                if (updates.concept !== undefined) mappedUpdates.concept = updates.concept;
                                                if (updates.difficulty !== undefined) mappedUpdates.difficulty = updates.difficulty;
                                                if (updates.working !== undefined) mappedUpdates.working = updates.working;
                                                if (updates.evaluateResult !== undefined) mappedUpdates.evaluateResult = updates.evaluateResult;
                                                if (updates.isDirty !== undefined) mappedUpdates.isDirty = updates.isDirty;

                                                updateQuestionById(qId, mappedUpdates);
                                            }}
                                            onDelete={(qId) => {
                                                const idx = generatedFields.findIndex(f => f.id === qId);
                                                if (idx !== -1) removeQuestion(idx);
                                            }}
                                            onAdd={addEmptyQuestion}
                                            onEvaluate={handleEvaluateQuestion}
                                            onRegenerate={handleRegenerateQuestion}
                                            evaluatingId={evaluatingId}
                                            regeneratingId={regeneratingId}
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </FormProvider>
                </motion.div>
            </div>
        </AdminLayout>
    );
}
