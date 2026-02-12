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
    BookOpen
} from 'lucide-react';
import { AdminLayout } from '@/components/layout';
import { useTestWithQuestions, useDeleteTest, useLessons } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
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

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Main Info */}
                    <div className="md:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Description</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                    {test.description || 'No description provided.'}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>Questions</span>
                                    <Badge variant="outline">{test.questions.length} Total</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {test.questions.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No questions added yet.</p>
                                ) : (
                                    test.questions.map((q, index) => (
                                        <div key={q.id} className="group">
                                            <div className="flex items-start gap-4">
                                                <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-muted text-sm font-medium">
                                                    {index + 1}
                                                </span>
                                                <div className="flex-1 space-y-2">
                                                    <p className="font-medium text-lg">{q.questionText}</p>

                                                    <div className="grid sm:grid-cols-2 gap-4 mt-2">
                                                        <div className="p-3 rounded-lg bg-green-50 border border-green-100 dark:bg-green-900/10 dark:border-green-900/20">
                                                            <p className="text-xs text-green-700 dark:text-green-400 font-semibold mb-1">Correct Answer</p>
                                                            <p className="text-sm">{q.correctAnswer}</p>
                                                        </div>
                                                        {q.hints && q.hints.length > 0 && (
                                                            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-900/20">
                                                                <p className="text-xs text-yellow-700 dark:text-yellow-400 font-semibold mb-1">Hints</p>
                                                                <ul className="text-sm list-disc list-inside">
                                                                    {q.hints.map((h, i) => (
                                                                        <li key={i}>{h}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {q.microLearning && (
                                                        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/20 text-sm">
                                                            <BookOpen className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <span className="font-semibold text-blue-700 dark:text-blue-400">Micro-learning: </span>
                                                                <span className="text-blue-800 dark:text-blue-300">{q.microLearning}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {index < test.questions.length - 1 && <Separator className="my-6" />}
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar Meta */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Scheduled Date</p>
                                        <p className="font-medium">{new Date(test.scheduledDate).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Duration</p>
                                        <p className="font-medium">{test.duration} minutes</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Associated Lesson</p>
                                        <p className="font-medium">{lesson?.title || 'None'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
