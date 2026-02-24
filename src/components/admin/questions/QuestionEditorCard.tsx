import { motion } from 'framer-motion';
import { TOPIC, CONCEPT } from '@/constant';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Sparkles, Loader2, Trash2, Wand2, Calculator, CheckCircle2, XCircle } from 'lucide-react';

export interface QuestionEditorData {
    id: string;
    questionText: string;
    correctAnswer: string;
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

interface QuestionEditorCardProps {
    idx: number;
    data: QuestionEditorData;
    onUpdate: (id: string, updates: Partial<QuestionEditorData>) => void;
    onDelete: (id: string) => void;
    onEvaluate: (id: string) => void;
    onRegenerate: (id: string) => void;
    isEvaluating?: boolean;
    isRegenerating?: boolean;
}

export function QuestionEditorCard({
    idx,
    data,
    onUpdate,
    onDelete,
    onEvaluate,
    onRegenerate,
    isEvaluating,
    isRegenerating
}: QuestionEditorCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 border rounded-xl bg-card space-y-4 relative group hover:border-indigo-200 transition-colors shadow-sm"
        >
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">Q{idx + 1}</span>
                    {data.isDirty && (
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-600 border-amber-200 uppercase tracking-tighter">Modified</Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        onClick={() => onEvaluate(data.id)}
                        disabled={isEvaluating}
                    >
                        {isEvaluating ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        AI Evaluate
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(data.id)}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div className="flex-1 space-y-4">
                {/* Question Text */}
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Question Context</Label>
                    <Textarea
                        value={data.questionText}
                        onChange={(e) => onUpdate(data.id, { questionText: e.target.value })}
                        className="font-medium min-h-[80px] resize-none"
                        placeholder="Type your question here..."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Topic</Label>
                        <Select
                            value={data.topic}
                            onValueChange={(val) => onUpdate(data.id, { topic: val })}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select topic" />
                            </SelectTrigger>
                            <SelectContent>
                                {TOPIC.map(t => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Concept</Label>
                        <Select
                            value={data.concept}
                            onValueChange={(val) => onUpdate(data.id, { concept: val })}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select concept" />
                            </SelectTrigger>
                            <SelectContent>
                                {CONCEPT.map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Correct Answer</Label>
                        <Input
                            value={data.correctAnswer}
                            onChange={(e) => onUpdate(data.id, { correctAnswer: e.target.value })}
                            placeholder="Correct answer"
                            className="h-9"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Marks</Label>
                            <Input
                                type="number"
                                value={data.mark}
                                onChange={(e) => onUpdate(data.id, { mark: parseInt(e.target.value) || 0 })}
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Level</Label>
                            <Select
                                value={String(data.difficulty)}
                                onValueChange={(val) => onUpdate(data.id, { difficulty: parseInt(val) })}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5].map((lvl) => (
                                        <SelectItem key={lvl} value={String(lvl)}>
                                            Level {lvl}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Working / Steps */}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <Calculator className="w-3.5 h-3.5 text-blue-600" />
                        <Label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Working / Steps</Label>
                    </div>
                    <Textarea
                        value={data.working}
                        onChange={(e) => onUpdate(data.id, { working: e.target.value })}
                        className="bg-blue-50/30 border-blue-100 text-blue-900 focus-visible:ring-blue-200 min-h-[80px] text-sm resize-none"
                        placeholder="Steps to solve the question..."
                    />
                </div>

                {/* AI Difficulty Reason */}
                {data.difficultyReason && (
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="difficulty-reason" className="border-none">
                            <AccordionTrigger className="py-2 text-[10px] font-bold text-amber-700 uppercase tracking-wider hover:no-underline">
                                <span className="flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3" /> AI Difficulty Reason ({data.difficulty === 1 ? 'Beginner' : data.difficulty === 2 ? 'Intermediate' : data.difficulty === 3 ? 'Advanced' : 'Expert'})
                                </span>
                            </AccordionTrigger>
                            <AccordionContent className="pb-2">
                                <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-100 text-sm text-amber-900 leading-relaxed shadow-sm">
                                    {data.difficultyReason}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}

                {/* Evaluation Results */}
                {data.evaluateResult && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={`p-4 rounded-xl border text-sm space-y-2.5 shadow-sm ${data.evaluateResult.isCorrect ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}
                    >
                        <div className="flex items-center gap-2 font-bold">
                            {data.evaluateResult.isCorrect ? (
                                <span className="text-green-700 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4" /> Correct Formulation
                                </span>
                            ) : (
                                <span className="text-red-700 flex items-center gap-1.5">
                                    <XCircle className="w-4 h-4" /> AI Feedback
                                </span>
                            )}
                        </div>
                        <p className={data.evaluateResult.isCorrect ? "text-green-800" : "text-red-800"}>
                            {data.evaluateResult.feedback}
                        </p>
                        {!data.evaluateResult.isCorrect && data.evaluateResult.suggestedImprovement && (
                            <div className="mt-2 text-xs bg-white/60 p-3 rounded-lg border border-red-100 text-red-900 leading-relaxed">
                                <strong className="text-red-700 mr-1">Suggestion:</strong> {data.evaluateResult.suggestedImprovement}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Regeneration Action */}
                {data.isDirty && (
                    <div className="flex justify-end pt-2">
                        <Button
                            size="sm"
                            className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm h-8"
                            onClick={() => onRegenerate(data.id)}
                            disabled={isRegenerating}
                        >
                            {isRegenerating ? (
                                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                            ) : (
                                <Wand2 className="w-3.5 h-3.5 mr-2" />
                            )}
                            {isRegenerating ? 'Regenerating...' : 'Re-Generate with AI'}
                        </Button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
