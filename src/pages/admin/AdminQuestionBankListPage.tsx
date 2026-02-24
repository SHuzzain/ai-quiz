import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Database, PlusCircle, FileText,
    Trash2, Loader2, Search,
    Filter, Edit2, ChevronDown, ChevronRight,
    BookOpen, GraduationCap, Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { AdminLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

import { useQuestionBankSets, useDeleteQuestionBankSet, useLessons } from '@/hooks/useApi';
import { QuestionBankSet } from '@/types';

interface GroupedSets {
    lessonId: string;
    lessonTitle: string;
    sets: QuestionBankSet[];
}

export default function AdminQuestionBankListPage() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>({});

    const { data: lessons } = useLessons();
    const { data: questionSets, isLoading: isLoadingSets } = useQuestionBankSets({
        search: searchQuery
    });
    const deleteMutation = useDeleteQuestionBankSet();

    const groupedData = useMemo(() => {
        if (!questionSets) return [];

        const groups: Record<string, GroupedSets> = {};

        // Helper to get lesson title
        const getLessonTitle = (id: string | null | undefined) => {
            if (!id || id === 'unassigned') return 'Unassigned Sets';
            const lesson = lessons?.find(l => l.id === id);
            return lesson?.title || `Lesson (ID: ${id.substring(0, 8)}...)`;
        };

        questionSets.forEach(set => {
            const lid = set.lessonId || 'unassigned';
            if (!groups[lid]) {
                groups[lid] = {
                    lessonId: lid,
                    lessonTitle: getLessonTitle(set.lessonId),
                    sets: []
                };
            }
            groups[lid].sets.push(set);
        });

        return Object.values(groups).sort((a, b) => {
            if (a.lessonId === 'unassigned') return 1;
            if (b.lessonId === 'unassigned') return -1;
            return a.lessonTitle.localeCompare(b.lessonTitle);
        });
    }, [questionSets, lessons]);

    const toggleLesson = (id: string) => {
        setExpandedLessons(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this question set?')) return;
        try {
            await deleteMutation.mutateAsync(id);
            toast.success('Question set deleted successfully');
        } catch {
            toast.error('Failed to delete question set');
        }
    };

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto space-y-6 px-4 py-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <Database className="w-6 h-6 text-indigo-600" />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight">Question Bank</h1>
                        </div>
                        <p className="text-muted-foreground">Browse and manage question sets organized by lesson.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button onClick={() => navigate('/admin/questions/create')} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                            <PlusCircle className="w-4 h-4" />
                            Generate New Set
                        </Button>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl">Question Sets by Lesson</CardTitle>
                                <div className="flex items-center gap-2 w-full max-w-sm">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search sets or lessons..."
                                            className="pl-10"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <Button variant="outline" size="icon">
                                        <Filter className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoadingSets ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                    <p>Loading question bank...</p>
                                </div>
                            ) : groupedData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                                    <div className="p-4 bg-muted rounded-full">
                                        <Layers className="w-8 h-8 opacity-50" />
                                    </div>
                                    <p>No question sets found.</p>
                                    <Button variant="link" onClick={() => navigate('/admin/questions/create')}>Start by creating one</Button>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {groupedData.map((group) => (
                                        <div key={group.lessonId} className="group/lesson">
                                            {/* Lesson Header Row */}
                                            <div
                                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors bg-muted/20"
                                                onClick={() => toggleLesson(group.lessonId)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-white rounded-md border border-border">
                                                        {group.lessonId === 'unassigned' ? <BookOpen className="w-4 h-4 text-muted-foreground" /> : <GraduationCap className="w-4 h-4 text-indigo-500" />}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-base flex items-center gap-2">
                                                            {group.lessonTitle}
                                                            <Badge variant="secondary" className="text-[10px] h-5">{group.sets.length} Sets</Badge>
                                                        </h3>
                                                        <p className="text-xs text-muted-foreground font-mono">
                                                            ID: {group.lessonId === 'unassigned' ? 'N/A' : group.lessonId}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Button variant="ghost" size="sm" className="text-xs gap-1">
                                                        {expandedLessons[group.lessonId] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                        {expandedLessons[group.lessonId] ? 'Hide' : 'Show'} Sets
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Sets Table (Collapsible) */}
                                            {expandedLessons[group.lessonId] && (
                                                <div className="p-2 bg-white">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="bg-muted/30 border-none hover:bg-muted/30">
                                                                <TableHead className="py-2 text-xs uppercase font-bold text-muted-foreground w-[450px]">Set Title</TableHead>
                                                                <TableHead className="py-2 text-xs uppercase font-bold text-muted-foreground">Question Count</TableHead>
                                                                <TableHead className="py-2 text-xs uppercase font-bold text-muted-foreground">Last Updated</TableHead>
                                                                <TableHead className="py-2 text-xs uppercase font-bold text-muted-foreground text-right border-none">Actions</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {group.sets.map((set) => (
                                                                <TableRow
                                                                    key={set.id}
                                                                    className="hover:bg-indigo-50/30 transition-colors cursor-pointer border-indigo-100/30"
                                                                    onClick={() => navigate(`/admin/questions/${set.id}`)}
                                                                >
                                                                    <TableCell className="py-3">
                                                                        <div className="font-medium line-clamp-1">{set.title}</div>
                                                                        <div className="text-[10px] text-muted-foreground mt-0.5 truncate italic">Contains curriculum questions</div>
                                                                    </TableCell>
                                                                    <TableCell className="py-3">
                                                                        <div className="flex items-center gap-1">
                                                                            <Layers className="w-3 h-3 text-indigo-500" />
                                                                            <span className="text-xs font-semibold">{set.questions?.length || 0} Questions</span>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="py-3">
                                                                        <div className="text-xs text-muted-foreground">
                                                                            {new Date(set.updatedAt).toLocaleDateString()}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="py-3 text-right">
                                                                        <div className="flex items-center justify-end gap-1">
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-7 w-7 text-indigo-600"
                                                                                onClick={(e) => { e.stopPropagation(); navigate(`/admin/questions/${set.id}`); }}
                                                                            >
                                                                                <Edit2 className="w-3.5 h-3.5" />
                                                                            </Button>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-7 w-7 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                                                                onClick={(e) => handleDelete(e, set.id)}
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </Button>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </AdminLayout>
    );
}
