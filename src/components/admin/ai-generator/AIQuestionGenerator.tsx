import { useState } from 'react';
import {
    Sparkles,
    Loader2,
    BrainCircuit,
    Settings2,
    Wand2,
    Plus,
    Trash2,
    PlusCircle,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { MultiSelect } from '@/components/ui/multi-select';
import { toast } from 'sonner';
import { useLessons, useAnalyzeDocument, useGenerateQuestionVariants } from '@/hooks/useApi';
import { extractTextFromUrl } from '@/utils/fileParser';
import { DocumentAnalysis, QuestionBankItem, VariantConfig } from '@/types';
import { motion } from 'framer-motion';

export function AIQuestionGenerator({
    lessonId,
    onQuestionsCommitted,
    onExtractedText,
    className
}: {
    lessonId: string;
    onQuestionsCommitted: (questions: QuestionBankItem[]) => void;
    onExtractedText?: (text: string) => void;
    className?: string;
}) {
    // API Hooks
    const { data: lessons } = useLessons();
    const analyzeDocument = useAnalyzeDocument();
    const generateVariants = useGenerateQuestionVariants();

    // Internal Logic State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<DocumentAnalysis | null>(null);
    const [extractedText, setExtractedText] = useState('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Generation Options
    const [configurations, setConfigurations] = useState<VariantConfig[]>([{
        topics: [],
        concepts: [],
        difficulty: 1,
        marks: 1,
        variantCount: 5
    }]);

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
            let fullText = '';
            for (const file of lesson.files) {
                try {
                    const text = await extractTextFromUrl(file.url, file.type, file.name);
                    fullText += `\n--- File: ${file.name} ---\n${text}`;
                } catch (e) {
                    console.error(`Failed to parse ${file.name}`, e);
                }
            }

            if (!fullText.trim()) throw new Error("No text could be extracted");
            setExtractedText(fullText);
            onExtractedText?.(fullText);

            const analysis = await analyzeDocument.mutateAsync({ content: fullText });
            setAnalysisResult(analysis);
            setConfigurations([{
                topics: analysis.topics,
                concepts: analysis.concepts || [],
                difficulty: 1,
                marks: 1,
                variantCount: 5
            }]);
            setIsDrawerOpen(true);
        } catch (error) {
            console.error('Analysis failed:', error);
            toast.error("Failed to analyze lesson content");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleGenerateQuestions = async () => {
        if (!extractedText) return;

        const validConfigs = configurations.filter(c => c.topics.length > 0);
        if (validConfigs.length === 0) {
            toast.error("Please select at least one topic for generation");
            return;
        }

        setIsGenerating(true);
        try {
            const response = await generateVariants.mutateAsync({
                documentText: extractedText,
                configurations: validConfigs,
            });

            const newQs: QuestionBankItem[] = response.questions.map(q => ({
                title: q.title || '',
                answer: q.answer || '',
                topic: q.topic || '',
                concept: q.concept || '',
                difficulty: q.difficulty || 1,
                marks: q.marks || 1,
                working: q.working || '',
                difficultyReason: q.difficultyReason || ''
            }));

            onQuestionsCommitted(newQs);
            setIsDrawerOpen(false);
            toast.success(`Generated ${response.questions.length} questions!`);
        } catch (error) {
            console.error('Generation failed:', error);
            toast.error("Failed to generate questions");
        } finally {
            setIsGenerating(false);
        }
    };

    const addConfiguration = () => {
        setConfigurations(prev => [...prev, {
            topics: [],
            concepts: [],
            difficulty: 2,
            marks: 1,
            variantCount: 5
        }]);
    };

    const updateConfiguration = (idx: number, updates: Partial<VariantConfig>) => {
        setConfigurations(prev => prev.map((c, i) => i === idx ? { ...c, ...updates } : c));
    };

    const removeConfiguration = (idx: number) => {
        setConfigurations(prev => prev.filter((_, i) => i !== idx));
    };


    return (
        <div className={className}>
            <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !lessonId}
                className="bg-primary hover:bg-primary/90 h-10 px-6 font-bold shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all rounded-full"
            >
                {isAnalyzing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <BrainCircuit className="w-4 h-4 mr-2" />
                )}
                {analysisResult ? "Adjust AI Generation" : "Analyze Lesson & Generate (AI)"}
            </Button>

            {/* Generation Configuration Drawer */}
            <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <DrawerContent>
                    <div className="mx-auto w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <DrawerHeader>
                            <DrawerTitle className="flex items-center gap-2 text-2xl">
                                <Sparkles className="w-6 h-6 text-primary" />
                                AI Question Configuration
                            </DrawerTitle>
                            <DrawerDescription>
                                Customize how the AI generates questions from the analyzed content.
                            </DrawerDescription>
                        </DrawerHeader>

                        <div className="p-4 flex-1 overflow-y-auto space-y-6">
                            {analysisResult && (
                                <div className="grid md:grid-cols-3 gap-6">
                                    {/* Analysis Summary */}
                                    <div className="md:col-span-1 space-y-4">
                                        <div className="p-4 bg-muted/50 rounded-xl border space-y-3">
                                            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Content Summary</Label>
                                            <p className="text-sm leading-relaxed">{analysisResult.summary}</p>
                                            <div className="pt-2 flex flex-wrap gap-2">
                                                <Badge variant="outline" className="bg-white border-primary/20 text-primary">{analysisResult.difficulty}</Badge>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Config Panels */}
                                    <div className="md:col-span-2 space-y-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Generation Variants</Label>
                                            <Button variant="outline" size="sm" onClick={addConfiguration} className="h-7 text-xs border-primary/20 text-indigo-700 hover:bg-primary/10">
                                                <Plus className="w-3 h-3 mr-1" /> Add Variant
                                            </Button>
                                        </div>

                                        <div className="space-y-4">
                                            {configurations.map((config, idx) => (
                                                <div key={idx} className="p-5 border-2 border-indigo-50 rounded-2xl bg-white space-y-4 relative shadow-sm hover:border-primary/20 transition-colors">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                                                        onClick={() => removeConfiguration(idx)}
                                                        disabled={configurations.length === 1}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>

                                                    <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-xs font-semibold">Select Topics</Label>
                                                            <MultiSelect
                                                                options={analysisResult.topics.map(t => ({ label: t, value: t }))}
                                                                selected={config.topics}
                                                                onChange={(vals) => updateConfiguration(idx, { topics: vals })}
                                                                placeholder="Choose topics..."
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label className="text-xs font-semibold">Select Concepts</Label>
                                                            <MultiSelect
                                                                options={(analysisResult.concepts || []).map(c => ({ label: c, value: c }))}
                                                                selected={config.concepts}
                                                                onChange={(vals) => updateConfiguration(idx, { concepts: vals })}
                                                                placeholder="Choose concepts..."
                                                            />
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-4">
                                                            <div className="space-y-2">
                                                                <Label className="text-xs font-semibold">Difficulty</Label>
                                                                <Select
                                                                    value={String(config.difficulty)}
                                                                    onValueChange={(v) => updateConfiguration(idx, { difficulty: parseInt(v) })}
                                                                >
                                                                    <SelectTrigger className="h-9">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {[1, 2, 3, 4, 5].map(v => (
                                                                            <SelectItem key={v} value={String(v)}>Level {v}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs font-semibold">Marks</Label>
                                                                <Input
                                                                    type="number"
                                                                    min={1}
                                                                    value={config.marks}
                                                                    onChange={(e) => updateConfiguration(idx, { marks: parseInt(e.target.value) })}
                                                                    className="h-9"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs font-semibold">Count</Label>
                                                                <Input
                                                                    type="number"
                                                                    min={1}
                                                                    max={20}
                                                                    value={config.variantCount}
                                                                    onChange={(e) => updateConfiguration(idx, { variantCount: parseInt(e.target.value) })}
                                                                    className="h-9"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <DrawerFooter className="border-t p-4 flex-row gap-4">
                            <Button
                                size="lg"
                                className="flex-1 bg-primary hover:bg-primary/90 h-12 text-lg font-bold shadow-lg shadow-indigo-100"
                                onClick={handleGenerateQuestions}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <><Loader2 className="w-5 h-5 mr-3 animate-spin" /> Generating Questions...</>
                                ) : (
                                    <><Sparkles className="w-5 h-5 mr-3" /> Generate Questions</>
                                )}
                            </Button>
                            <DrawerClose asChild>
                                <Button variant="ghost" size="lg" className="px-8 h-12">Cancel</Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    );
}
