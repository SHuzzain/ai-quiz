import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';

interface QuestionCardProps {
    index: number;
    question: any;
    form: any;
    removeQuestion: (index: number) => void;
    handleGenerateHints: (index: number) => void;
    handleGenerateMicroLearning: (index: number) => void;
    isGeneratingHints: boolean;
    isGeneratingExplanation: boolean;
}

export function QuestionCard({
    index,
    question,
    form,
    removeQuestion,
    handleGenerateHints,
    handleGenerateMicroLearning,
    isGeneratingHints,
    isGeneratingExplanation,
}: QuestionCardProps) {
    return (
        <AccordionItem value={question.id} className="border-none">
            <Card className="overflow-hidden">
                <div className="flex items-center gap-2 p-2 pr-4 bg-muted/30">
                    <AccordionTrigger className="flex-1 hover:no-underline py-2 px-4 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                                {index + 1}
                            </div>
                            <span className="font-medium text-sm">
                                {question.questionText || <span className="text-muted-foreground italic">Untitled question</span>}
                            </span>
                        </div>
                    </AccordionTrigger>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            removeQuestion(index);
                        }}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>

                <AccordionContent className="p-0">
                    <CardContent className="pt-6 space-y-6 pb-6">
                        <FieldGroup>
                            <form.Field name={`questions[${index}].questionText`}>
                                {(f: any) => (
                                    <Field>
                                        <FieldLabel htmlFor={f.name}>Question Text</FieldLabel>
                                        <Textarea
                                            id={f.name}
                                            value={f.state.value}
                                            onBlur={f.handleBlur}
                                            onChange={(e) => f.handleChange(e.target.value)}
                                            placeholder="Enter the question with __BLANK__ for the answer..."
                                            rows={2}
                                        />
                                        <FieldDescription>Use __BLANK__ where the student needs to fill in the answer.</FieldDescription>
                                        <FieldError errors={f.state.meta.errors} />
                                    </Field>
                                )}
                            </form.Field>

                            <form.Field name={`questions[${index}].correctAnswer`}>
                                {(f: any) => (
                                    <Field>
                                        <FieldLabel htmlFor={f.name}>Correct Answer</FieldLabel>
                                        <Input
                                            id={f.name}
                                            value={f.state.value}
                                            onBlur={f.handleBlur}
                                            onChange={(e) => f.handleChange(e.target.value)}
                                            placeholder="The exact word students must type"
                                        />
                                        <FieldError errors={f.state.meta.errors} />
                                    </Field>
                                )}
                            </form.Field>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <FieldLabel>Hints</FieldLabel>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleGenerateHints(index)}
                                        disabled={isGeneratingHints}
                                        className="text-primary hover:text-primary hover:bg-primary/10 gap-2"
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        {isGeneratingHints ? 'Generating...' : 'Regenerate Hints'}
                                    </Button>
                                </div>
                                <div className="grid gap-3">
                                    {[0, 1, 2].map(hintIndex => (
                                        <form.Field
                                            key={hintIndex}
                                            name={`questions[${index}].hints[${hintIndex}]`}
                                        >
                                            {(f: any) => (
                                                <div className="relative">
                                                    <Input
                                                        id={f.name}
                                                        value={f.state.value || ""}
                                                        onBlur={f.handleBlur}
                                                        onChange={(e) => f.handleChange(e.target.value)}
                                                        placeholder={`Hint ${hintIndex + 1}`}
                                                        className="pl-10 h-10"
                                                    />
                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                                                        H{hintIndex + 1}
                                                    </div>
                                                </div>
                                            )}
                                        </form.Field>
                                    ))}
                                </div>
                            </div>

                            <form.Field name={`questions[${index}].microLearning`}>
                                {(f: any) => (
                                    <Field>
                                        <div className="flex justify-between items-center mb-2">
                                            <FieldLabel htmlFor={f.name}>Simplified Explanation</FieldLabel>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleGenerateMicroLearning(index)}
                                                disabled={isGeneratingExplanation}
                                                className="text-primary hover:text-primary hover:bg-primary/10 gap-2"
                                            >
                                                <Sparkles className="w-3 h-3" />
                                                {isGeneratingExplanation ? 'Generating...' : 'Regenerate'}
                                            </Button>
                                        </div>
                                        <Textarea
                                            id={f.name}
                                            value={f.state.value}
                                            onBlur={f.handleBlur}
                                            onChange={(e) => f.handleChange(e.target.value)}
                                            placeholder="AI generated explanation for kids..."
                                            rows={3}
                                        />
                                        <FieldDescription>This will be shown to students after they complete the question.</FieldDescription>
                                        <FieldError errors={f.state.meta.errors} />
                                    </Field>
                                )}
                            </form.Field>
                        </FieldGroup>
                    </CardContent>
                </AccordionContent>
            </Card>
        </AccordionItem>
    );
}

interface QuestionManagerProps {
    form: any;
    removeQuestion: (index: number) => void;
    handleGenerateHints: (index: number) => void;
    handleGenerateMicroLearning: (index: number) => void;
    addEmptyQuestion: () => void;
    isGeneratingHints: boolean;
    isGeneratingExplanation: boolean;
}

export function QuestionManager({
    form,
    removeQuestion,
    handleGenerateHints,
    handleGenerateMicroLearning,
    isGeneratingHints,
    isGeneratingExplanation,
}: QuestionManagerProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center justify-between px-1">
                Test Questions
                <span className="text-sm font-normal text-muted-foreground">
                    {form.getFieldValue("questions").length} questions total
                </span>
            </h3>

            <form.Field name="questions">
                {(field: any) => (
                    <Accordion type="multiple" className="w-full space-y-4">
                        <AnimatePresence>
                            {field.state.value.map((q: any, i: number) => (
                                <motion.div
                                    key={q.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="group"
                                >
                                    <QuestionCard
                                        index={i}
                                        question={q}
                                        form={form}
                                        removeQuestion={removeQuestion}
                                        handleGenerateHints={handleGenerateHints}
                                        handleGenerateMicroLearning={handleGenerateMicroLearning}
                                        isGeneratingHints={isGeneratingHints}
                                        isGeneratingExplanation={isGeneratingExplanation}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </Accordion>
                )}
            </form.Field>
        </div>
    );
}
