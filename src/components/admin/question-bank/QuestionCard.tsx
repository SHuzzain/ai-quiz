import { motion } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Sparkles, Loader2, Search, Wand2 } from 'lucide-react';
import { Controller, useFormContext } from 'react-hook-form';
import { VariantGenerationForm } from '@/schemas/questionBank';
import { DocumentAnalysis } from '@/types';

interface QuestionCardProps {
    idx: number;
    analysisResult: DocumentAnalysis | null;
    evaluatingIndex: number | null;
    regeneratingIndex: number | null;
    onEvaluate: (idx: number) => void;
    onRegenerate: (idx: number) => void;
}

export function QuestionCard({
    idx,
    analysisResult,
    evaluatingIndex,
    regeneratingIndex,
    onEvaluate,
    onRegenerate
}: QuestionCardProps) {
    const { control, register, watch, setValue } = useFormContext<VariantGenerationForm>();
    const q = watch(`generatedQuestions.${idx}`);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 border rounded-xl bg-card space-y-3 relative group"
        >
            <div className="flex gap-2 items-start">
                <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded mt-1">Q{idx + 1}</span>
                <div className="flex-1 space-y-4">
                    {/* Row 1: Question (Full) */}
                    <div className="space-y-1">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Question Context</Label>
                        <Textarea
                            {...register(`generatedQuestions.${idx}.title`)}
                            onChange={(e) => {
                                setValue(`generatedQuestions.${idx}.title`, e.target.value);
                                setValue(`generatedQuestions.${idx}.isDirty`, true);
                            }}
                            className="font-medium resize-none min-h-[80px]"
                            placeholder="Question text"
                        />
                    </div>

                    {/* Row 2: Correct Answer (Half) & Marks (Half) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs font-semibold uppercase tracking-wider">Correct Answer</Label>
                            <Input
                                {...register(`generatedQuestions.${idx}.answer`)}
                                onChange={(e) => {
                                    setValue(`generatedQuestions.${idx}.answer`, e.target.value);
                                    setValue(`generatedQuestions.${idx}.isDirty`, true);
                                }}
                                placeholder="Correct Answer"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-semibold uppercase tracking-wider">Marks</Label>
                            <Input
                                type="number"
                                {...register(`generatedQuestions.${idx}.marks`, { valueAsNumber: true })}
                                onChange={(e) => {
                                    setValue(`generatedQuestions.${idx}.marks`, parseInt(e.target.value) || 0);
                                    setValue(`generatedQuestions.${idx}.isDirty`, true);
                                }}
                                className="h-10"
                            />
                        </div>
                    </div>

                    {/* Row 3: Topic (Half) & Concept (Half) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Topic</Label>
                            <Controller
                                name={`generatedQuestions.${idx}.topics`}
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        value={field.value?.[0] || ""}
                                        onValueChange={val => {
                                            field.onChange([val]);
                                            setValue(`generatedQuestions.${idx}.isDirty`, true);
                                        }}
                                    >
                                        <SelectTrigger className="h-10">
                                            <SelectValue placeholder="Select topic" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(analysisResult?.topics || field.value || []).map(t => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Concept</Label>
                            <Controller
                                name={`generatedQuestions.${idx}.concepts`}
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        value={field.value?.[0] || ""}
                                        onValueChange={val => {
                                            field.onChange([val]);
                                            setValue(`generatedQuestions.${idx}.isDirty`, true);
                                        }}
                                    >
                                        <SelectTrigger className="h-10">
                                            <SelectValue placeholder="Select concept" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(analysisResult?.concepts || field.value || []).map(c => (
                                                <SelectItem key={c} value={c}>{c}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                    </div>

                    {/* Row 4: Working / Steps (Full) */}
                    <div className="space-y-1">
                        <Label className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Working / Steps</Label>
                        <Textarea
                            {...register(`generatedQuestions.${idx}.working`)}
                            onChange={(e) => {
                                setValue(`generatedQuestions.${idx}.working`, e.target.value);
                                setValue(`generatedQuestions.${idx}.isDirty`, true);
                            }}
                            className="bg-blue-50/50 border-blue-200 text-blue-900 focus-visible:ring-blue-300 resize-none min-h-[80px]"
                            placeholder="Steps or explanation to solve the question..."
                        />
                    </div>

                    {/* Row 5: AI Difficulty Reason (Full - Accordion) */}
                    {q?.difficultyReason && (
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="difficulty-reason" className="border-none">
                                <AccordionTrigger className="py-2 text-xs font-semibold text-amber-700 uppercase tracking-wider hover:no-underline">
                                    <span className="flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" /> AI Difficulty Reason ({q.difficulty === 1 ? 'Beginner' : q.difficulty === 2 ? 'Intermediate' : q.difficulty === 3 ? 'Advanced' : q.difficulty === 4 ? 'Expert' : 'Master'})
                                    </span>
                                </AccordionTrigger>
                                <AccordionContent className="pb-2">
                                    <div className="p-3 rounded-md bg-amber-50/50 border border-amber-200 text-sm text-amber-900">
                                        {String(q.difficultyReason)}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}

                    {/* Evaluation Results display */}
                    {q?.evaluateResult && (
                        <div className={`mt-3 p-3 rounded-md border text-sm space-y-2 ${q.evaluateResult.isCorrect ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'}`}>
                            <div className="flex items-center gap-2 font-semibold">
                                {q.evaluateResult.isCorrect
                                    ? <span className="text-green-700 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Correct</span>
                                    : <span className="text-red-700">Needs Review</span>}
                            </div>
                            <p className={q.evaluateResult.isCorrect ? "text-green-800" : "text-red-800"}>
                                {q.evaluateResult.feedback}
                            </p>
                            {(!q.evaluateResult.isCorrect && q.evaluateResult.suggestedImprovement) ? (
                                <div className="mt-2 text-xs bg-red-100/50 p-2 rounded border border-red-200/50 text-red-900">
                                    <strong>Suggestion:</strong> {q.evaluateResult.suggestedImprovement}
                                </div>
                            ) : null}
                        </div>
                    )}

                    {/* Actions / Dirty State */}
                    <div className="flex items-center justify-between pt-2 border-t mt-2">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground uppercase">Level:</span>
                                <Controller
                                    name={`generatedQuestions.${idx}.difficulty`}
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            value={String(field.value || 1)}
                                            onValueChange={v => {
                                                field.onChange(parseInt(v));
                                                setValue(`generatedQuestions.${idx}.isDirty`, true);
                                            }}
                                        >
                                            <SelectTrigger className="h-7 w-20 text-xs px-2">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[1, 2, 3, 4, 5].map(v => (
                                                    <SelectItem key={v} value={String(v)} className="text-xs">Lvl {v}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-green-600"
                                    onClick={() => onEvaluate(idx)}
                                    disabled={evaluatingIndex === idx}
                                >
                                    {evaluatingIndex === idx ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Search className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {q?.isDirty && (
                            <Badge
                                variant="default"
                                className="text-xs bg-amber-500 hover:bg-amber-600 flex items-center gap-1 cursor-pointer"
                                onClick={() => onRegenerate(idx)}
                            >
                                {regeneratingIndex === idx ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <Wand2 className="w-3 h-3" />
                                )}
                                {regeneratingIndex === idx ? 'Regenerating...' : 'Re-Generate with AI'}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
