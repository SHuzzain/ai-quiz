import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Wand2, Trash2, PlusCircle, Loader2 } from 'lucide-react';
import { Controller, FieldArrayWithId, UseFieldArrayAppend, useFormContext } from 'react-hook-form';
import { TOPIC, CONCEPT } from '@/constant';
import { VariantGenerationForm } from '@/schemas/questionBank';
import { DocumentAnalysis } from '@/types';

interface ConfigurationDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    configFields: FieldArrayWithId<VariantGenerationForm>[];
    appendConfig: UseFieldArrayAppend<VariantGenerationForm, "configurations">;
    removeConfig: (idx: number) => void;
    analysisResult: DocumentAnalysis | null;
    generateVariantsPending: boolean;
    onSubmit: () => Promise<void>;
}

export function ConfigurationDrawer({
    open,
    onOpenChange,
    configFields,
    appendConfig,
    removeConfig,
    analysisResult,
    generateVariantsPending,
    onSubmit
}: ConfigurationDrawerProps) {
    const { control, register, watch, setValue } = useFormContext<VariantGenerationForm>();

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent>
                <div className="mx-auto w-full max-w-3xl max-h-[90vh] flex flex-col">
                    <DrawerHeader>
                        <DrawerTitle className="flex items-center gap-2 text-2xl">
                            <Wand2 className="w-6 h-6 text-indigo-500" />
                            Generation Configurations
                        </DrawerTitle>
                        <DrawerDescription>
                            Define the configurations for generating questions from the selected document.
                        </DrawerDescription>
                    </DrawerHeader>

                    <div className="p-4 flex-1 overflow-y-auto">
                        <div className="space-y-6">
                            {configFields.map((field, index) => (
                                <div key={field.id} className="p-6 border rounded-xl bg-muted/5 space-y-4 relative">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-semibold text-lg flex items-center gap-2">
                                            <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-sm">{index + 1}</span>
                                            Configuration
                                        </h4>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => removeConfig(index)}
                                            disabled={configFields.length === 1}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Topics (extracted from doc)</Label>
                                            <MultiSelect
                                                options={TOPIC.map(t => ({ label: t, value: t }))}
                                                selected={watch(`configurations.${index}.topics`) || []}
                                                onChange={vals => setValue(`configurations.${index}.topics`, vals)}
                                                placeholder="Select topics..."
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Concepts (extracted from doc)</Label>
                                            <MultiSelect
                                                options={CONCEPT.map(c => ({ label: c, value: c }))}
                                                selected={watch(`configurations.${index}.concepts`) || []}
                                                onChange={vals => setValue(`configurations.${index}.concepts`, vals)}
                                                placeholder="Select concepts..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>Difficulty (1-5)</Label>
                                                <Controller
                                                    name={`configurations.${index}.difficulty`}
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Select
                                                            value={field.value.toString()}
                                                            onValueChange={v => field.onChange(parseInt(v))}
                                                        >
                                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                {[1, 2, 3, 4, 5].map(v => <SelectItem key={v} value={v.toString()}>Level {v}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Marks</Label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    {...register(`configurations.${index}.marks`, { valueAsNumber: true })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Question Count</Label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={20}
                                                    {...register(`configurations.${index}.variantCount`, { valueAsNumber: true })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <Button
                                variant="outline"
                                className="w-full h-12 border-dashed"
                                onClick={() => appendConfig({ topics: [], concepts: [], difficulty: 1, marks: 1, variantCount: 5 })}
                            >
                                <PlusCircle className="w-4 h-4 mr-2" /> Add Another Configuration
                            </Button>
                        </div>
                    </div>

                    <DrawerFooter className="pt-4 border-t mt-4 flex-row gap-4">
                        <Button
                            onClick={onSubmit}
                            disabled={generateVariantsPending}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-12 text-lg"
                        >
                            {generateVariantsPending ? (
                                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating Questions...</>
                            ) : (
                                <><Wand2 className="w-5 h-5 mr-2" /> Generate Questions</>
                            )}
                        </Button>
                        <DrawerClose asChild>
                            <Button variant="ghost" className="h-12 px-8">Cancel</Button>
                        </DrawerClose>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
