"use client";

import { useGetTest } from "@/features/quiz-creator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Calendar, FileText, CheckCircle, HelpCircle, BookOpen, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ViewTestPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { data: test, isLoading, error } = useGetTest(params.id);

    if (isLoading) {
        return <TestSkeleton />;
    }

    if (error || !test) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <p className="text-xl text-destructive font-semibold">Failed to load test</p>
                <Button onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 py-6">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Button
                    variant="ghost"
                    className="w-fit -ml-2 text-muted-foreground"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Tests
                </Button>

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold">{test.title}</h1>
                        <p className="text-muted-foreground text-lg">{test.description}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => router.push(`/admin/tests/${test.id}/edit`)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Test
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                    <Badge variant="outline" className="px-3 py-1 flex gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(test.scheduledDate), "PPP")}
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1 flex gap-1">
                        <Clock className="w-3 h-3" />
                        {test.duration} mins
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1 flex gap-1">
                        <FileText className="w-3 h-3" />
                        {test.questions.length} Questions
                    </Badge>
                    <Badge
                        variant={test.status === 'ACTIVE' ? 'default' : 'secondary'}
                        className="px-3 py-1 uppercase text-xs"
                    >
                        {test.status}
                    </Badge>
                </div>
            </div>

            <Separator />

            {/* Questions */}
            <div className="space-y-6">
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-primary" />
                    Questions & Answers
                </h2>

                <div className="grid gap-6">
                    {test.questions.map((question, index) => (
                        <Card key={question.id} className="overflow-hidden border-none shadow-md bg-card/50">
                            <CardHeader className="bg-muted/30 pb-4">
                                <CardTitle className="text-lg font-medium flex gap-3">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
                                        {index + 1}
                                    </span>
                                    <span>{question.questionText}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                <div>
                                    <h4 className="text-sm font-semibold text-success mb-2 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4" />
                                        Correct Answer
                                    </h4>
                                    <div className="p-3 bg-success/10 text-success-foreground rounded-md border border-success/20">
                                        {question.correctAnswer}
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    {question.hints && question.hints.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                                <HelpCircle className="w-4 h-4" />
                                                Hints
                                            </h4>
                                            <ul className="space-y-2">
                                                {question.hints.map((hint, i) => (
                                                    <li key={i} className="text-sm p-2 bg-muted rounded border border-border/50 text-muted-foreground">
                                                        <span className="font-medium mr-2 text-xs uppercase opacity-70">Hint {i + 1}:</span>
                                                        {hint}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {question.microLearning && (
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                                                <BookOpen className="w-4 h-4" />
                                                Micro-Learning
                                            </h4>
                                            <div className="text-sm p-3 bg-primary/5 rounded-md border border-primary/10 text-foreground/90 leading-relaxed">
                                                {question.microLearning}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

function TestSkeleton() {
    return (
        <div className="max-w-4xl mx-auto space-y-8 py-6">
            <div className="space-y-4">
                <Skeleton className="h-4 w-24" />
                <div className="flex justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-96" />
                        <Skeleton className="h-6 w-[500px]" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="flex gap-4">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-24" />
                </div>
            </div>
            <Separator />
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-64 w-full rounded-xl" />
                ))}
            </div>
        </div>
    );
}
