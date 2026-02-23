import {
    Database, FileText, Save
} from 'lucide-react';
import { FormProvider } from 'react-hook-form';

import { AdminLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminQuestionBank } from '@/hooks/useAdminQuestionBank';

// Sub-components
import { ConfigurationCard } from '@/components/admin/question-bank/ConfigurationCard';
import { QuestionCard } from '@/components/admin/question-bank/QuestionCard';
import { ConfigurationDrawer } from '@/components/admin/question-bank/ConfigurationDrawer';

export function AdminQuestionBankPage() {
    const {
        form,
        configFields,
        appendConfig,
        removeConfig,
        questionFields,
        lessons,
        isLoadingLessons,
        isAnalyzing,
        isDrawerOpen,
        setIsDrawerOpen,
        analysisResult,
        evaluatingIndex,
        regeneratingIndex,
        handleAnalyze,
        onSubmitGenerate,
        handleEvaluateQuestion,
        handleRegenerateQuestion,
        handleSave,
        saveQuestionsPending,
        generateVariantsPending,
    } = useAdminQuestionBank();

    return (
        <AdminLayout>
            <FormProvider {...form}>
                <div className="max-w-7xl mx-auto space-y-6 pb-20">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-2">
                                <Database className="w-8 h-8 text-primary" />
                                Question Bank Generation
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Create varied question sets by uploading lessons and defining configurations.
                            </p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Main Config Area */}
                        <ConfigurationCard
                            lessons={lessons}
                            isLoadingLessons={isLoadingLessons}
                            isAnalyzing={isAnalyzing}
                            onAnalyze={handleAnalyze}
                        />

                        {/* Generated Questions Preview Area */}
                        <Card className="md:col-span-2 shadow-sm min-h-[500px]">
                            <CardHeader className="flex flex-row items-center justify-between py-4">
                                <CardTitle className="text-lg">Generated Questions Preview</CardTitle>
                                {questionFields.length > 0 && (
                                    <Button onClick={handleSave} disabled={saveQuestionsPending}>
                                        {saveQuestionsPending ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save to Bank</>}
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent>
                                {questionFields.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground bg-muted/20 border border-dashed rounded-xl">
                                        <FileText className="w-12 h-12 mb-4 opacity-20" />
                                        <p>No questions generated yet.</p>
                                        <p className="text-sm">Analyze a document and define configurations to see them here.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {questionFields.map((q, idx) => (
                                            <QuestionCard
                                                key={q.id}
                                                idx={idx}
                                                analysisResult={analysisResult}
                                                evaluatingIndex={evaluatingIndex}
                                                regeneratingIndex={regeneratingIndex}
                                                onEvaluate={handleEvaluateQuestion}
                                                onRegenerate={handleRegenerateQuestion}
                                            />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Configuration Drawer */}
                    <ConfigurationDrawer
                        open={isDrawerOpen}
                        onOpenChange={setIsDrawerOpen}
                        configFields={configFields}
                        appendConfig={appendConfig}
                        removeConfig={removeConfig}
                        analysisResult={analysisResult}
                        generateVariantsPending={generateVariantsPending}
                        onSubmit={onSubmitGenerate}
                    />
                </div>
            </FormProvider>
        </AdminLayout>
    );
}
