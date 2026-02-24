import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QuestionEditorCard, QuestionEditorData } from './QuestionEditorCard';

interface QuestionsManagerProps {
    questions: QuestionEditorData[];
    onUpdate: (id: string, updates: Partial<QuestionEditorData>) => void;
    onDelete: (id: string) => void;
    onAdd: () => void;
    onEvaluate: (id: string) => void;
    onRegenerate: (id: string) => void;
    evaluatingId?: string | null;
    regeneratingId?: string | null;
}

export function QuestionsManager({
    questions,
    onUpdate,
    onDelete,
    onAdd,
    onEvaluate,
    onRegenerate,
    evaluatingId,
    regeneratingId
}: QuestionsManagerProps) {
    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="flex flex-row items-center justify-between px-0 pt-0 pb-6">
                <div className="space-y-1">
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                        Questions List
                        <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {questions.length}
                        </span>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Manage and refine questions for this session.</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onAdd}
                    className="hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all shadow-sm"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Manual Question
                </Button>
            </CardHeader>
            <CardContent className="px-0 space-y-6">
                {questions.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-muted/30">
                        <div className="bg-white p-4 rounded-full shadow-sm w-fit mx-auto mb-4">
                            <Sparkles className="w-8 h-8 text-indigo-400 opacity-50" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">No Questions Yet</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                            Use the AI generator above to create high-quality variants or click "Add Manual Question" to start writing from scratch.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {questions.map((q, idx) => (
                            <QuestionEditorCard
                                key={idx}
                                idx={idx}
                                data={q}
                                onUpdate={onUpdate}
                                onDelete={onDelete}
                                onEvaluate={onEvaluate}
                                onRegenerate={onRegenerate}
                                isEvaluating={evaluatingId === q.id}
                                isRegenerating={regeneratingId === q.id}
                            />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export type { QuestionEditorData };
