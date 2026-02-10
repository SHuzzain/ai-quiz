import * as React from 'react';
import { Upload, Sparkles, Trash2, Eye, FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FileUploadZoneProps {
    uploadedFiles: File[];
    isAnalyzing: boolean;
    isExtracting: boolean;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleAnalyzeFiles: () => void;
    viewFile: (file: File) => void;
    removeFile: (index: number) => void;
    addEmptyQuestion: () => void;
    formatFileSize: (bytes: number) => string;
}

export function FileUploadZone({
    uploadedFiles,
    isAnalyzing,
    isExtracting,
    handleFileUpload,
    handleAnalyzeFiles,
    viewFile,
    removeFile,
    formatFileSize,
}: FileUploadZoneProps) {
    return (
        <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    AI Content Extraction
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-4">
                    <label className="flex-1">
                        <div className="flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-primary/30 rounded-2xl hover:border-primary hover:bg-primary/10 transition-all cursor-pointer bg-white dark:bg-zinc-950">
                            <Upload className="w-8 h-8 text-primary/60" />
                            <div className="text-center">
                                <span className="font-medium text-sm">
                                    {isExtracting ? 'Processing File...' : 'Upload Lesson File'}
                                </span>
                                <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, PPTX or TXT</p>
                            </div>
                        </div>
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx,.txt,.pptx"
                            multiple
                            onChange={handleFileUpload}
                            className="hidden"
                            disabled={isAnalyzing || isExtracting || uploadedFiles.length >= 2}
                        />
                    </label>
                    <div className="flex-1 space-y-4">
                        <div className="grid gap-3">
                            {uploadedFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-muted/40 border rounded-xl group transition-all hover:bg-muted/60">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                            <FileIcon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium truncate max-w-50">{file.name}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase">{formatFileSize(file.size)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                                            onClick={() => viewFile(file)}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            onClick={() => removeFile(idx)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {uploadedFiles.length > 0 && (
                            <Button
                                type="button"
                                onClick={() => handleAnalyzeFiles()}
                                disabled={isAnalyzing || isExtracting}
                                className="w-full font-semibold"
                            >
                                {isAnalyzing ? (
                                    <>Processing...</>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        Analyze & Generate Quiz
                                    </>
                                )}
                            </Button>
                        )}
                    </div>

                </div>
            </CardContent>
        </Card>
    );
}
