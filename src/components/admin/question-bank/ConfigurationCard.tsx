import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles } from 'lucide-react';
import { Controller, useFormContext } from 'react-hook-form';
import { VariantGenerationForm } from '@/schemas/questionBank';
import { Lesson } from '@/types';

interface ConfigurationCardProps {
    lessons?: Lesson[];
    isLoadingLessons: boolean;
    isAnalyzing: boolean;
    onAnalyze: () => void;
}

export function ConfigurationCard({
    lessons,
    isLoadingLessons,
    isAnalyzing,
    onAnalyze
}: ConfigurationCardProps) {
    const { control, register, watch } = useFormContext<VariantGenerationForm>();

    return (
        <Card className="md:col-span-1 shadow-sm h-fit">
            <CardHeader>
                <CardTitle className="text-lg">Document Source</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Session Title</Label>
                    <Input
                        placeholder="e.g., Intro to Algebra variants"
                        {...register("title")}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Assign Lesson *</Label>
                    <Controller
                        name={"lessonId"}
                        control={control}
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

                <Button
                    onClick={onAnalyze}
                    disabled={!watch("lessonId") || isAnalyzing}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 mt-2"
                >
                    {isAnalyzing ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                    ) : (
                        <><Sparkles className="w-4 h-4 mr-2" /> Analyze Document</>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
