import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    PlusCircle,
    Trash2, Loader2, Search,
    Filter, Edit2, BookOpen, Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { AdminLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

import { useQuestionBankSets, useDeleteQuestionBankSet, useLessons } from '@/hooks/useApi';

export default function AdminQuestionBankListPage() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    const { data: lessons } = useLessons();
    const { data: questionSets, isLoading: isLoadingSets } = useQuestionBankSets({
        search: searchQuery
    });
    const deleteMutation = useDeleteQuestionBankSet();

    const getLessonTitle = (id: string | null | undefined) => {
        if (!id || id === 'unassigned') return 'Unassigned Sets';
        const lesson = lessons?.find(l => l.id === id);
        return lesson?.title || `Lesson (ID: ${id.substring(0, 8)}...)`;
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
                            <h1 className="text-3xl font-bold tracking-tight">Question Bank</h1>
                        </div>
                        <p className="text-muted-foreground">Browse and manage question sets organized by lesson.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button onClick={() => navigate('/admin/questions/create')} className="gap-2 bg-primary hover:bg-primary/90">
                            <PlusCircle className="w-4 h-4" />
                            Generate New Set
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center gap-2 w-full sm:max-w-sm">
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

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    {isLoadingSets ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <p>Loading question bank...</p>
                        </div>
                    ) : !questionSets || questionSets.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <Layers className="w-10 h-10 mx-auto mb-3 opacity-50" />
                                <p>No question sets found.</p>
                                <Button variant="link" onClick={() => navigate('/admin/questions/create')}>Start by creating one</Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {questionSets.map((set) => (
                                <Card key={set.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(`/admin/questions/${set.id}`)}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-2">
                                                <Layers className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                                                <CardTitle className="text-base line-clamp-2 leading-tight">{set.title}</CardTitle>
                                            </div>
                                            <div className="flex gap-1 ml-4 flex-shrink-0">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-primary shrink-0"
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/admin/questions/${set.id}`); }}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive/80 shrink-0 hover:bg-destructive/10"
                                                    onClick={(e) => handleDelete(e, set.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-xs font-semibold">
                                                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                                                    {set.questions?.length || 0} Questions
                                                </Badge>
                                                <span className="text-muted-foreground italic flex items-center gap-1">
                                                    <BookOpen className="w-3 h-3" />
                                                    {getLessonTitle(set.lessonId)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground pt-3 border-t">
                                                Updated on {new Date(set.updatedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </AdminLayout>
    );
}
