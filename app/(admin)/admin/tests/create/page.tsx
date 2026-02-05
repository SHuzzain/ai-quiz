"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  useCreateTestForm,
  AIConversationDrawer,
  TestSettingsFields,
  FileUploadZone,
  QuestionManager,
} from '@/features/quiz-creator';
import { Button } from '@/components/ui/button';
import { FieldSet } from '@/components/ui/field';

interface TestFormPageProps {
  mode?: 'create' | 'edit';
  testId?: string;
}

export default function TestFormPage({ mode = 'create', testId }: TestFormPageProps) {
  const router = useRouter();
  const {
    form,
    isDrawerOpen,
    setIsDrawerOpen,
    analysisResult,
    uploadedFiles,
    handleFileUpload,
    handleAnalyzeFiles,
    viewFile,
    removeFile,
    handleAIConfirm,
    handleGenerateHints,
    handleGenerateMicroLearning,
    addEmptyQuestion,
    removeQuestion,
    formatFileSize,
    isAnalyzing,
    isExtracting,
    isCreating,
    isUpdating,
    isLoadingTest,
    isGeneratingHints,
    isGeneratingExplanation,
  } = useCreateTestForm({ mode, testId });

  if (mode === 'edit' && isLoadingTest) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading test data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            {mode === 'create' ? 'Create New Test' : 'Edit Test'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {mode === 'create'
              ? 'Design an engaging AI-powered quiz for your students.'
              : 'Update your quiz content and settings.'}
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <FieldSet>
          <TestSettingsFields form={form} />

          <FileUploadZone
            uploadedFiles={uploadedFiles}
            isAnalyzing={isAnalyzing}
            isExtracting={isExtracting}
            handleFileUpload={handleFileUpload}
            handleAnalyzeFiles={handleAnalyzeFiles}
            viewFile={viewFile}
            removeFile={removeFile}
            addEmptyQuestion={addEmptyQuestion}
            formatFileSize={formatFileSize}
          />

          <QuestionManager
            form={form}
            removeQuestion={removeQuestion}
            handleGenerateHints={handleGenerateHints}
            handleGenerateMicroLearning={handleGenerateMicroLearning}
            addEmptyQuestion={addEmptyQuestion}
            isGeneratingHints={isGeneratingHints}
            isGeneratingExplanation={isGeneratingExplanation}
          />

          <div className="flex justify-end gap-4 pt-8 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={isCreating || isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              className="px-8 shadow-lg shadow-primary/20"
              disabled={isCreating || isUpdating}
            >
              {isCreating || isUpdating
                ? (mode === 'create' ? "Creating..." : "Updating...")
                : (mode === 'create' ? "Create Test" : "Update Test")}
            </Button>
          </div>
        </FieldSet>
      </form>

      <AIConversationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        analysis={analysisResult}
        onConfirm={handleAIConfirm}
        onClarify={handleAnalyzeFiles}
        isGenerating={isExtracting || isAnalyzing}
      />
    </div>
  );
}
