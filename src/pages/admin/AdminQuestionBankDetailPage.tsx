import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Database, ArrowLeft, Save, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FormProvider, useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { AIQuestionGenerator } from "@/components/admin/ai-generator/AIQuestionGenerator";
import { QuestionsManager, QuestionEditorData } from "@/components/admin/questions/QuestionsManager";

import { AdminLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    useQuestionBankSet,
    useUpdateQuestionBankSet,
    useDeleteQuestionBankSet,
    useLessons,
    useEvaluateQuestionQuality,
    useRegenerateQuestionVariant
} from "@/hooks/useApi";
import {
    VariantGenerationForm,
    variantGenerationSchema,
} from "@/schemas/questionBank";
import { QuestionBankItem } from "@/types";

export default function AdminQuestionBankDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: set, isLoading } = useQuestionBankSet(id || "");
    const updateMutation = useUpdateQuestionBankSet();
    const deleteMutation = useDeleteQuestionBankSet();
    const { data: lessons } = useLessons();
    const evaluateMutation = useEvaluateQuestionQuality();
    const regenerateMutation = useRegenerateQuestionVariant();

    const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
    const [lessonContent, setLessonContent] = useState("");

    const form = useForm<VariantGenerationForm>({
        resolver: zodResolver(variantGenerationSchema),
        defaultValues: {
            lessonId: "",
            title: "",
            configurations: [],
            generatedQuestions: [],
        },
    });

    const { fields, append, remove, update } = useFieldArray({
        control: form.control,
        name: "generatedQuestions",
    });

    const handleUpdateQuestion = (qId: string, updates: Partial<QuestionEditorData>) => {
        const index = fields.findIndex(f => f.id === qId);
        if (index === -1) return;

        const current = fields[index];
        update(index, {
            ...current,
            ...(updates.questionText !== undefined && { title: updates.questionText }),
            ...(updates.correctAnswer !== undefined && { answer: updates.correctAnswer }),
            ...(updates.mark !== undefined && { marks: updates.mark }),
            ...(updates.topic !== undefined && { topic: updates.topic }),
            ...(updates.concept !== undefined && { concept: updates.concept }),
            ...(updates.difficulty !== undefined && { difficulty: updates.difficulty }),
            ...(updates.working !== undefined && { working: updates.working }),
            ...(updates.difficultyReason !== undefined && { difficultyReason: updates.difficultyReason }),
            ...(updates.evaluateResult !== undefined && { evaluateResult: updates.evaluateResult }),
            isDirty: true
        });
    };

    const handleEvaluateQuestion = async (qId: string) => {
        const index = fields.findIndex(f => f.id === qId);
        if (index === -1) return;

        const q = fields[index];
        if (!q.title || !q.answer) {
            toast.error("Question title and answer are required for evaluation");
            return;
        }

        setEvaluatingId(qId);
        try {
            const result = await evaluateMutation.mutateAsync({
                question: q.title,
                answer: q.answer,
                working: q.working,
            });
            update(index, { ...q, evaluateResult: result });
            toast.success("Question evaluated successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to evaluate question");
        } finally {
            setEvaluatingId(null);
        }
    };

    const handleRegenerateQuestion = async (qId: string) => {
        const index = fields.findIndex(f => f.id === qId);
        if (index === -1) return;

        const q = fields[index];
        if (!lessonContent) {
            toast.error("Lesson content is required for regeneration. Please re-analyze the lesson.");
            return;
        }

        setRegeneratingId(qId);
        try {
            const result = await regenerateMutation.mutateAsync({
                documentText: lessonContent,
                currentQuestion: {
                    title: q.title,
                    answer: q.answer,
                    topic: q.topic,
                    concept: q.concept,
                    difficulty: q.difficulty,
                    marks: q.marks,
                    working: q.working,
                    isDirtyFields: {
                        title: true,
                        answer: true,
                        working: true
                    },
                },
            });

            update(index, { ...result, evaluateResult: null, isDirty: false });
            toast.success("Question regenerated successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to regenerate question");
        } finally {
            setRegeneratingId(null);
        }
    };

    useEffect(() => {
        if (set) {
            form.reset({
                lessonId: set.lessonId || "",
                title: set.title,
                configurations: [],
                generatedQuestions: set.questions.map((q) => ({
                    ...q,
                    evaluateResult: null,
                    isDirty: false,
                })),
            });
        }
    }, [set, form]);

    const handleSave = async (data: VariantGenerationForm) => {
        if (!id) return;
        try {
            await updateMutation.mutateAsync({
                id,
                updates: {
                    title: data.title,
                    lessonId: data.lessonId,
                    questions: data.generatedQuestions.map((q) => ({
                        title: q.title,
                        answer: q.answer,
                        topic: q.topic,
                        concept: q.concept,
                        difficulty: q.difficulty,
                        marks: q.marks,
                        working: q.working,
                        difficultyReason: q.difficultyReason,
                    })),
                },
            });
            toast.success("Question set updated successfully");
            navigate("/admin/questions");
        } catch (error) {
            console.error(error);
            toast.error("Failed to update question set");
        }
    };

    const handleDelete = async () => {
        if (!id || !confirm("Are you sure you want to delete this set?")) return;
        try {
            await deleteMutation.mutateAsync(id);
            toast.success("Question set deleted successfully");
            navigate("/admin/questions");
        } catch {
            toast.error("Failed to delete question set");
        }
    };

    const mappedQuestions: QuestionEditorData[] = fields.map((f) => ({
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
        isDirty: !!f.isDirty
    }));

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            </AdminLayout>
        );
    }

    if (!set) {
        return (
            <AdminLayout>
                <div className="text-center py-20">
                    <h2 className="text-2xl font-bold">Question set not found</h2>
                    <Button variant="link" onClick={() => navigate("/admin/questions")}>
                        Return to List
                    </Button>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="max-w-5xl mx-auto space-y-6 px-4 py-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate("/admin/questions")}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">Edit Question Set</h1>
                            <p className="text-muted-foreground text-sm flex items-center gap-1">
                                <Database className="w-3 h-3" /> Set ID: {id}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={handleDelete}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Set
                        </Button>
                        <Button
                            onClick={form.handleSubmit(handleSave)}
                            disabled={updateMutation.isPending}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {updateMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Save Changes
                        </Button>
                    </div>
                </div>

                <FormProvider {...form}>
                    <div className="grid grid-cols-1 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Set Settings</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Set Title</Label>
                                        <Input {...form.register("title")} placeholder="Set title" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Lesson</Label>
                                        <Controller
                                            name="lessonId"
                                            control={form.control}
                                            render={({ field }) => (
                                                <Select
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select lesson" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {lessons?.map((l) => (
                                                            <SelectItem key={l.id} value={l.id}>
                                                                {l.title}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t">
                                    <h3 className="text-sm font-semibold mb-4">Add Questions via AI</h3>
                                    <AIQuestionGenerator
                                        lessonId={form.watch("lessonId")}
                                        onQuestionsCommitted={(newQs) => {
                                            newQs.forEach(q => append({
                                                ...q,
                                                evaluateResult: null,
                                                isDirty: false
                                            }));
                                        }}
                                        onExtractedText={setLessonContent}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <QuestionsManager
                            questions={mappedQuestions}
                            onUpdate={handleUpdateQuestion}
                            onDelete={(qId) => {
                                const index = fields.findIndex(f => f.id === qId);
                                if (index !== -1) remove(index);
                            }}
                            onAdd={() => append({
                                title: "",
                                answer: "",
                                topic: "",
                                concept: "",
                                marks: 1,
                                difficulty: 1,
                                working: "",
                                evaluateResult: null,
                                isDirty: false
                            })}
                            onEvaluate={handleEvaluateQuestion}
                            onRegenerate={handleRegenerateQuestion}
                            evaluatingId={evaluatingId}
                            regeneratingId={regeneratingId}
                        />
                    </div>
                </FormProvider>
            </div>
        </AdminLayout>
    );
}
