
/**
 * Admin Test Attempt Detail Page
 * Shows comprehensive details about a specific student's test attempt.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout';
import { useAttemptDetails } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Clock, Award, AlertCircle, CheckCircle2, XCircle, HelpCircle, BrainCircuit, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";

export function AdminTestAttemptDetail() {
    const { attemptId } = useParams<{ attemptId: string }>();
    const navigate = useNavigate();
    const { data, isLoading } = useAttemptDetails(attemptId || '');

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center h-96">
                    <p className="text-muted-foreground">Loading specific attempt details...</p>
                </div>
            </AdminLayout>
        );
    }

    if (!data) {
        return (
            <AdminLayout>
                <div className="flex flex-col items-center justify-center h-96 gap-4">
                    <AlertCircle className="w-12 h-12 text-destructive" />
                    <p className="text-lg font-medium">Attempt not found.</p>
                    <Button onClick={() => navigate('/admin/reports')}>Back to Reports</Button>
                </div>
            </AdminLayout>
        );
    }

    const { attempt, questionResults, test } = data;

    return (
        <AdminLayout>
            <div className="space-y-6 container max-w-5xl mx-auto">
                {/* Header with Back Button */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/admin/reports')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">{test.title}</h1>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <span>Attempt ID: {attempt.id}</span>
                            <span>•</span>
                            <span>{format(new Date(attempt.startedAt), 'PPP p')}</span>
                        </div>
                    </div>
                    <Badge
                        variant={attempt.status === 'completed' ? 'default' : 'secondary'}
                        className="ml-auto text-lg px-4 py-1 capitalize"
                    >
                        {attempt.status.replace('_', ' ')}
                    </Badge>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Final Score</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-2">
                                <span className="text-4xl font-bold">{attempt.score ?? 0}%</span>
                                {attempt.basicScore !== undefined && (
                                    <span className="text-sm text-muted-foreground mb-1">
                                        (Raw: {attempt.basicScore}%)
                                    </span>
                                )}
                            </div>
                            <Progress value={attempt.score ?? 0} className="h-2 mt-4" />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Performance</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm">Correct Answers</span>
                                <span className="font-bold">{attempt.correctAnswers} / {attempt.totalQuestions}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm">Hints Used</span>
                                <span className="font-bold">{attempt.hintsUsed}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm">Time Taken</span>
                                <span className="font-bold">{Math.round((attempt.timeTakenSeconds || 0) / 60)} min</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">AI Insights</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Mastery</span>
                                <Badge variant={attempt.masteryAchieved ? 'default' : 'outline'} className={attempt.masteryAchieved ? 'bg-green-600 hover:bg-green-700' : ''}>
                                    {attempt.masteryAchieved ? 'Achieved' : 'In Progress'}
                                </Badge>
                            </div>
                            <div className="flex justify-between">
                                <span>Engagement</span>
                                <span className="font-medium">{attempt.learningEngagementRate ?? 0}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Persistence</span>
                                <span className="font-medium">{attempt.persistenceScore ?? 0}%</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Question Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>Question Breakdown</CardTitle>
                        <CardDescription>Detailed analysis of each answer</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            {questionResults.map((result, index) => {
                                const question = test.questions.find(q => q.id === result.questionId);
                                return (
                                    <AccordionItem key={result.id} value={result.id}>
                                        <AccordionTrigger className="hover:no-underline">
                                            <div className="flex items-center gap-4 text-left w-full pr-4">
                                                <Badge
                                                    variant={result.isCorrect ? 'outline' : 'destructive'}
                                                    className={result.isCorrect ? 'border-success text-success' : ''}
                                                >
                                                    Q{index + 1}
                                                </Badge>
                                                <span className="font-medium flex-1 truncate">
                                                    {question?.questionText.replace('__BLANK__', '______')}
                                                </span>

                                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                    {result.hintsUsed > 0 && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            {result.hintsUsed} hint{result.hintsUsed !== 1 ? 's' : ''}
                                                        </Badge>
                                                    )}
                                                    {result.viewedMicroLearning && (
                                                        <Badge variant="outline" className="border-kid-blue text-kid-blue text-xs">
                                                            Viewed Learning
                                                        </Badge>
                                                    )}
                                                    {result.aiScore !== undefined && result.aiScore < 100 && result.aiScore > 0 && (
                                                        <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                                                            Partial: {result.aiScore}%
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-4 py-4 bg-muted/30 rounded-lg space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Student Answer</p>
                                                    <div className={`p-3 rounded-md border ${result.isCorrect ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}`}>
                                                        <p className="font-medium">{result.studentAnswer}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Correct Answer</p>
                                                    <div className="p-3 rounded-md border bg-background">
                                                        <p className="font-medium">{question?.correctAnswer}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {result.aiFeedback && (
                                                <div className="flex items-start gap-3 p-3 bg-kid-blue/10 rounded-md text-sm border border-kid-blue/20">
                                                    <BrainCircuit className="w-5 h-5 text-kid-blue flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-bold text-kid-blue mb-1">AI Analysis</p>
                                                        <p>{result.aiFeedback}</p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-2 border-t">
                                                <span>⏱ Time: {result.timeTakenSeconds}s</span>
                                                <span>•</span>
                                                <span>🔄 Attempts: {result.attemptsCount}</span>
                                                {result.answeredOnFirstAttempt && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-success font-medium">First Try!</span>
                                                    </>
                                                )}
                                                {result.studyMaterialDownloaded && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <FileText className="w-3 h-3" /> Downloaded Study Material
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
