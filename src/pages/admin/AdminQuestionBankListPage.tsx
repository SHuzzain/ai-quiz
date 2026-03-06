import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Plus,
    Loader2,
    Search,
    Filter,
    Upload,
    FileText,
    Pencil,
    Trash2,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

import { AdminLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

import {
    useQuestionBankItems,
    useLessons,
    useUploadLesson,
    useCreateQuestionBankItems,
    useUpdateQuestionBankItem,
    useDeleteQuestionBankItem,
} from '@/hooks/useApi';
import * as api from '@/services/api';
import { extractTextFromUrl } from '@/utils/fileParser';
import type { QuestionBankItemRow } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';

const TYPE_UPLOAD = 'UPLOAD';
const TYPE_TEXT = 'TEXT';
const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function AdminQuestionBankListPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [type, setType] = useState<'UPLOAD' | 'TEXT'>(TYPE_TEXT);
    const [documentText, setDocumentText] = useState('');
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<QuestionBankItemRow | null>(null);
    const [editForm, setEditForm] = useState({
        questionText: '',
        correctAnswer: '',
        working: '',
        topic: '',
        conceptTested: '',
        marks: 1,
        difficulty: 1,
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [previewOpen, setPreviewOpen] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState<api.GenerateQuestionBankResponse['questions']>([]);
    const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);
    const [selectedPreviewIndices, setSelectedPreviewIndices] = useState<Set<number>>(new Set());
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewSearchQuery, setPreviewSearchQuery] = useState('');

    const { data: lessons } = useLessons();
    const { data: listData, isLoading: isLoadingItems } = useQuestionBankItems({
        search: searchQuery || undefined,
        page,
        pageSize,
    });
    const items = listData?.items ?? [];
    const total = listData?.total ?? 0;
    const createQuestionBankItems = useCreateQuestionBankItems();
    const uploadLesson = useUploadLesson();
    const updateItem = useUpdateQuestionBankItem();
    const deleteItem = useDeleteQuestionBankItem();

    const canGenerate =
        (type === TYPE_TEXT && documentText.trim().length > 0) ||
        (type === TYPE_UPLOAD && !!selectedLessonId);

    useEffect(() => {
        setPage(1);
    }, [searchQuery]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const endRow = Math.min(page * pageSize, total);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;
        const file = files[0];

        // Format: Demo - 6/03 - 11.18pm
        const now = new Date();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const hours24 = now.getHours();
        const minutes = now.getMinutes();
        const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
        const ampm = hours24 >= 12 ? 'pm' : 'am';
        const paddedMinutes = minutes.toString().padStart(2, '0');
        const formattedDate = `${month}/${day}`;
        const formattedTime = `${hours12}.${paddedMinutes}${ampm}`;
        const formattedTitle = `Demo - ${formattedDate} - ${formattedTime}`;

        try {
            const lesson = await uploadLesson.mutateAsync({
                title: formattedTitle,
                description: formattedTitle,
                files: [file],
            });
            setSelectedLessonId(lesson.id);
            toast.success('Document uploaded and selected.');
        } catch {
            toast.error('Failed to upload document');
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        let content = '';
        if (type === TYPE_TEXT) {
            content = documentText.trim();
            if (!content) return;
        } else {
            if (!selectedLessonId) return;
            const lesson = lessons?.find((l) => l.id === selectedLessonId);
            if (!lesson?.files?.length) {
                toast.error('Selected lesson has no files');
                return;
            }
            try {
                for (const file of lesson.files) {
                    try {
                        const text = await extractTextFromUrl(file.url, file.type, file.name);
                        content += `\n--- File: ${file.name} ---\n${text}`;
                    } catch (e) {
                        console.error('Failed to parse', file.name, e);
                    }
                }
                if (!content.trim()) throw new Error('No text could be extracted');
            } catch {
                toast.error('Failed to extract text from document');
                return;
            }
        }
        try {
            setIsGenerating(true);
            const response = await api.generateQuestionBankFromDocument({ content });
            if (!response.questions?.length) {
                toast.error('No questions were generated');
                return;
            }
            setGeneratedQuestions(response.questions);
            setPreviewLessonId(type === TYPE_UPLOAD ? selectedLessonId : null);
            setSelectedPreviewIndices(new Set(response.questions.map((_, i) => i)));
            setPreviewOpen(true);
            setAddDialogOpen(false);
            setDocumentText('');
            setSelectedLessonId(null);
            toast.success(`Generated ${response.questions.length} question(s). Select which to import.`);
        } catch {
            toast.error('Failed to generate questions');
        } finally {
            setIsGenerating(false);
        }
    };

    const selectedCount = selectedPreviewIndices.size;
    const togglePreviewIndex = (index: number) => {
        setSelectedPreviewIndices((prev) => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };
    const selectAllPreview = () => setSelectedPreviewIndices(new Set(generatedQuestions.map((_, i) => i)));
    const deselectAllPreview = () => setSelectedPreviewIndices(new Set());

    const handleImportSelected = async () => {
        const toImport = generatedQuestions.filter((_, i) => selectedPreviewIndices.has(i));
        if (!toImport.length) {
            toast.error('Select at least one question to import');
            return;
        }
        try {
            await createQuestionBankItems.mutateAsync({
                items: toImport,
                lessonId: previewLessonId,
            });
            toast.success(`Imported ${toImport.length} question(s)`);
            setPreviewOpen(false);
            setGeneratedQuestions([]);
            setSelectedPreviewIndices(new Set());
            setPreviewLessonId(null);
            setPreviewSearchQuery('');
        } catch {
            toast.error('Failed to import questions');
        }
    };

    const previewSearchLower = previewSearchQuery.trim().toLowerCase();
    const filteredPreviewRows = previewSearchLower
        ? generatedQuestions
            .map((q, i) => ({ q, i }))
            .filter(
                ({ q }) =>
                    (q.question && q.question.toLowerCase().includes(previewSearchLower)) ||
                    (q.answer && String(q.answer).toLowerCase().includes(previewSearchLower)) ||
                    (q.working && q.working.toLowerCase().includes(previewSearchLower)) ||
                    (q.topic && q.topic.toLowerCase().includes(previewSearchLower)) ||
                    (q.conceptTested && q.conceptTested.toLowerCase().includes(previewSearchLower)),
            )
        : generatedQuestions.map((q, i) => ({ q, i }));

    const handleCloseAddDialog = (open: boolean) => {
        if (!open) {
            setDocumentText('');
            setSelectedLessonId(null);
        }
        setAddDialogOpen(open);
    };

    const openEditDialog = (row: QuestionBankItemRow) => {
        setEditingItem(row);
        setEditForm({
            questionText: row.questionText,
            correctAnswer: row.correctAnswer,
            working: row.working ?? '',
            topic: row.topic,
            conceptTested: row.conceptTested,
            marks: row.marks,
            difficulty: row.difficulty,
        });
    };

    const handleSaveEdit = async () => {
        if (!editingItem) return;
        try {
            await updateItem.mutateAsync({
                id: editingItem.id,
                updates: {
                    questionText: editForm.questionText,
                    correctAnswer: editForm.correctAnswer,
                    working: editForm.working || null,
                    topic: editForm.topic,
                    conceptTested: editForm.conceptTested,
                    marks: editForm.marks,
                    difficulty: editForm.difficulty,
                },
            });
            toast.success('Question updated');
            setEditingItem(null);
        } catch {
            toast.error('Failed to update question');
        }
    };

    const handleDelete = async (row: QuestionBankItemRow) => {
        if (!confirm(`Delete this question? "${row.questionText.slice(0, 50)}..."`)) return;
        try {
            await deleteItem.mutateAsync(row.id);
            toast.success('Question deleted');
        } catch {
            toast.error('Failed to delete question');
        }
    };

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-6 px-4 py-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Question Bank</h1>
                        <p className="text-muted-foreground">Browse and manage questions. Add new questions via document or text.</p>
                    </div>
                    <Button onClick={() => setAddDialogOpen(true)} className="gap-2 bg-primary hover:bg-primary/90">
                        <Plus className="w-4 h-4" />
                        Add
                    </Button>
                </div>

                <div className="flex items-center gap-2 w-full">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search questions, topic, or concept..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon">
                        <Filter className="w-4 h-4" />
                    </Button>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    {isLoadingItems ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <p>Loading question bank...</p>
                        </div>
                    ) : !items || items.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                                <p>No questions found.</p>
                                <Button variant="link" onClick={() => setAddDialogOpen(true)}>
                                    Add questions
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <div className="overflow-auto max-h-[70vh]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">No</TableHead>
                                            <TableHead>Question</TableHead>
                                            <TableHead>Answer</TableHead>
                                            <TableHead>Working</TableHead>
                                            <TableHead>Topic</TableHead>
                                            <TableHead>Concept Tested</TableHead>
                                            <TableHead className="w-16">Marks</TableHead>
                                            <TableHead className="w-24">Difficulty</TableHead>
                                            <TableHead className="w-[100px] text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((row, index) => (
                                            <TableRow key={row.id}>
                                                <TableCell className="font-muted-foreground">{startRow + index}</TableCell>
                                                <TableCell className="max-w-xs truncate" title={row.questionText}>
                                                    {row.questionText}
                                                </TableCell>
                                                <TableCell>{row.correctAnswer}</TableCell>
                                                <TableCell className="max-w-[200px] truncate whitespace-pre-line" title={row.working ?? ''}>
                                                    {row.working ?? '—'}
                                                </TableCell>
                                                <TableCell>{row.topic}</TableCell>
                                                <TableCell>{row.conceptTested}</TableCell>
                                                <TableCell>{row.marks}</TableCell>
                                                <TableCell>Level {row.difficulty}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                            onClick={() => openEditDialog(row)}
                                                            title="Edit"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            onClick={() => handleDelete(row)}
                                                            title="Delete"
                                                            disabled={deleteItem.isPending}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {total > 0 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <span>
                                            Showing {startRow}–{endRow} of {total}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="page-size" className="text-xs whitespace-nowrap">Per page</Label>
                                            <select
                                                id="page-size"
                                                value={pageSize}
                                                onChange={(e) => {
                                                    setPageSize(Number(e.target.value));
                                                    setPage(1);
                                                }}
                                                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                                            >
                                                {PAGE_SIZE_OPTIONS.map((n) => (
                                                    <option key={n} value={n}>{n}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            disabled={page <= 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                            Previous
                                        </Button>
                                        <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                                            Page {page} of {totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={page >= totalPages}
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    )}
                </motion.div>
            </div>

            <Dialog open={addDialogOpen} onOpenChange={handleCloseAddDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add questions</DialogTitle>
                        <DialogDescription>
                            Provide document content (paste text or select/upload a document), then click Generate. You can preview and select which questions to import.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={type} onValueChange={(v) => setType(v as 'UPLOAD' | 'TEXT')}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={TYPE_TEXT}>TEXT</SelectItem>
                                    <SelectItem value={TYPE_UPLOAD}>UPLOAD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {type === TYPE_TEXT && (
                            <div className="space-y-2">
                                <Label>Document text</Label>
                                <Textarea
                                    placeholder="Paste or type document content (e.g. sample questions with Answer, Working, Topic, Concept Tested, Marks)."
                                    value={documentText}
                                    onChange={(e) => setDocumentText(e.target.value)}
                                    rows={10}
                                    className="resize-y font-mono text-sm"
                                />
                            </div>
                        )}

                        {type === TYPE_UPLOAD && (
                            <div className="space-y-2">
                                <Label>Select document</Label>
                                <div className="flex gap-2">
                                    <Select value={selectedLessonId ?? ''} onValueChange={(v) => setSelectedLessonId(v || null)}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Choose a lesson..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {lessons?.map((l) => (
                                                <SelectItem key={l.id} value={l.id}>
                                                    {l.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button type="button" variant="outline" size="icon" onClick={handleUploadClick} disabled={uploadLesson.isPending}>
                                        <Upload className="w-4 h-4" />
                                    </Button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.docx,.txt"
                                        onChange={handleFileChange}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">Upload saves to lessons and selects it. Click Generate to extract text and create questions.</p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => handleCloseAddDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleGenerate} disabled={!canGenerate || isGenerating}>
                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Generate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={previewOpen}
                onOpenChange={(open) => {
                    if (!open) setPreviewSearchQuery('');
                    setPreviewOpen(open);
                }}
            >
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Preview generated questions</DialogTitle>
                        <DialogDescription>
                            Select the questions you want to import to the question bank. Then click Import selected.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="relative flex items-center gap-2 py-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by question, answer, working, topic, concept..."
                            value={previewSearchQuery}
                            onChange={(e) => setPreviewSearchQuery(e.target.value)}
                            className="pl-9 flex-1 max-w-sm"
                        />
                        <Button type="button" variant="outline" size="sm" onClick={selectAllPreview}>
                            Select all
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={deselectAllPreview}>
                            Deselect all
                        </Button>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {selectedCount} of {generatedQuestions.length} selected
                            {previewSearchLower && ` · ${filteredPreviewRows.length} shown`}
                        </span>
                    </div>
                    <div className="flex-1 overflow-auto rounded-md border min-h-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">Select</TableHead>
                                    <TableHead className="w-12">No</TableHead>
                                    <TableHead className="min-w-[180px]">Question</TableHead>
                                    <TableHead className="w-24">Answer</TableHead>
                                    <TableHead className="min-w-[120px]">Working</TableHead>
                                    <TableHead className="w-28">Topic</TableHead>
                                    <TableHead className="w-28">Concept</TableHead>
                                    <TableHead className="w-16">Marks</TableHead>
                                    <TableHead className="w-20">Difficulty</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPreviewRows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                                            {previewSearchLower ? 'No questions match your search.' : 'No questions.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredPreviewRows.map(({ q, i }) => (
                                        <TableRow key={i}>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={selectedPreviewIndices.has(i)}
                                                    onCheckedChange={() => togglePreviewIndex(i)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-muted-foreground">{i + 1}</TableCell>
                                            <TableCell className="max-w-[220px] truncate text-sm" title={q.question}>
                                                {q.question}
                                            </TableCell>
                                            <TableCell className="text-sm">{q.answer}</TableCell>
                                            <TableCell className="max-w-[140px] truncate text-sm text-muted-foreground" title={q.working}>
                                                {q.working || '—'}
                                            </TableCell>
                                            <TableCell className="text-sm">{q.topic}</TableCell>
                                            <TableCell className="text-sm">{q.conceptTested}</TableCell>
                                            <TableCell>{q.marks}</TableCell>
                                            <TableCell>{q.difficulty}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleImportSelected}
                            disabled={selectedCount === 0 || createQuestionBankItems.isPending}
                        >
                            {createQuestionBankItems.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Import selected ({selectedCount})
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit question</DialogTitle>
                        <DialogDescription>Update the question details below.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Question</Label>
                            <Textarea
                                value={editForm.questionText}
                                onChange={(e) => setEditForm((f) => ({ ...f, questionText: e.target.value }))}
                                rows={3}
                                className="resize-y"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Answer</Label>
                                <Input
                                    value={editForm.correctAnswer}
                                    onChange={(e) => setEditForm((f) => ({ ...f, correctAnswer: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Working</Label>
                                <Input
                                    value={editForm.working}
                                    onChange={(e) => setEditForm((f) => ({ ...f, working: e.target.value }))}
                                    placeholder="e.g. 460 ÷ 10 = 46"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Topic</Label>
                                <Input
                                    value={editForm.topic}
                                    onChange={(e) => setEditForm((f) => ({ ...f, topic: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Concept Tested</Label>
                                <Input
                                    value={editForm.conceptTested}
                                    onChange={(e) => setEditForm((f) => ({ ...f, conceptTested: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Marks</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={editForm.marks}
                                    onChange={(e) => setEditForm((f) => ({ ...f, marks: Number(e.target.value) || 1 }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Difficulty (1–5)</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={5}
                                    value={editForm.difficulty}
                                    onChange={(e) => setEditForm((f) => ({ ...f, difficulty: Math.min(5, Math.max(1, Number(e.target.value) || 1)) }))}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingItem(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={updateItem.isPending}>
                            {updateItem.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
