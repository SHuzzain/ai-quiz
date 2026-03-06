/**
 * View Test Page (Admin)
 * Displays test details and questions in a read-only format.
 */

import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Calendar,
    Clock,
    FileText,
    Edit,
    Trash2,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout';
import { useTestWithQuestions, useDeleteTest, useLessons } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { TestConditionStored } from '@/types';

export function ViewTestPage() {
    const { testId } = useParams<{ testId: string }>();
    const navigate = useNavigate();
    const { data: test, isLoading } = useTestWithQuestions(testId || '');
    const { data: lessons } = useLessons();
    const deleteTest = useDeleteTest();

    // Find associated lesson title
    const lesson = lessons?.find(l => l.id === test?.lessonId);

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this test?')) {
            await deleteTest.mutateAsync(testId!);
            navigate('/admin/tests');
        }
    };

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-[50vh]">
                    <p className="text-muted-foreground">Loading test details...</p>
                </div>
            </AdminLayout>
        );
    }

    if (!test) {
        return (
            <AdminLayout>
                <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                    <p className="text-xl font-semibold">Test not found</p>
                    <Button onClick={() => navigate('/admin/tests')}>Back to Tests</Button>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link to="/admin/tests">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold mb-1">{test.title}</h1>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Badge variant={test.status === 'active' ? 'default' : 'secondary'}>
                                    {test.status}
                                </Badge>
                                {test.createdBy && <span>Created by Admin</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link to={`/admin/tests/${test.id}/edit`}>
                            <Button variant="outline" className="gap-2">
                                <Edit className="w-4 h-4" />
                                Edit Test
                            </Button>
                        </Link>
                        <Button variant="destructive" size="icon" onClick={handleDelete}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                                <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-muted-foreground">Scheduled Date</p>
                                <p className="font-medium">{new Date(test.scheduledDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                <Clock className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-muted-foreground">Duration</p>
                                <p className="font-medium">{test.duration} minutes</p>
                            </div>
                        </div>
                        {/* <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                                <FileText className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-muted-foreground">Associated Lesson</p>
                                <p className="font-medium">{lesson?.title || 'None'}</p>
                            </div>
                        </div> */}
                        <Separator />
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                            <div>
                                <p className="text-muted-foreground">Total Mark</p>
                                <p className="font-medium">{test.totalMark ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Question limit</p>
                                <p className="font-medium">{test.numberOfQuestions ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Questions in bank</p>
                                <p className="font-medium">{test.questionCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Conditions – full width, centered */}
                {test.conditions && test.conditions.length > 0 && (
                    <Card className="w-full">
                        <CardHeader>
                            <CardTitle>Conditions</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Question bank conditions used to build this test.
                            </p>
                        </CardHeader>
                        <CardContent className="flex justify-center">
                            <div className="w-full overflow-auto rounded-md border mx-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">No</TableHead>
                                            <TableHead className="min-w-[140px]">Topics</TableHead>
                                            <TableHead className="min-w-[140px]">Concept</TableHead>
                                            <TableHead className="w-48">Difficulty</TableHead>
                                            <TableHead className="w-48">No. of Questions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(test.conditions as TestConditionStored[]).map((c, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-muted-foreground">{i + 1}</TableCell>
                                                <TableCell className="text-sm">
                                                    {c.topics?.length ? c.topics.join(', ') : 'Any'}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {c.concept?.length ? c.concept.join(', ') : 'Any'}
                                                </TableCell>
                                                <TableCell>{c.difficulty}</TableCell>
                                                <TableCell>{c.numberOfQuestions}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AdminLayout>
    );
}
