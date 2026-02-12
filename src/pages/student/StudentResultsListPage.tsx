import { useNavigate } from "react-router-dom";
import { useStudentAttempts, useCurrentUser } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Trophy, Calendar, ArrowRight, BrainCircuit, Activity } from "lucide-react";

export function StudentResultsListPage() {
    const navigate = useNavigate();
    const { data: user } = useCurrentUser();
    const { data: attempts, isLoading } = useStudentAttempts(user?.id || "");

    // Filter only completed attempts for the main list, or show all? 
    // Let's show all but styling them differently
    const sortedAttempts = attempts?.sort((a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );

    return (
        <div className="container py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-primary">Your History</h1>
                <p className="text-muted-foreground mt-2">Track your progress and review your past achievements.</p>
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    [1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted/50 animate-pulse" />)
                ) : sortedAttempts?.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed rounded-xl">
                        <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-semibold">No tests taken yet</h3>
                        <p className="text-muted-foreground mb-6">Start your first test to see your results here!</p>
                        <Button onClick={() => navigate("/student/tests")}>Go to Tests</Button>
                    </div>
                ) : (
                    sortedAttempts?.map((attempt, index) => (
                        <motion.div
                            key={attempt.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(
                                attempt.status === 'completed'
                                    ? `/student/results/${attempt.id}`
                                    : `/student/test/${attempt.testId}`
                            )}>
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                                        {/* Status Icon/Score */}
                                        <div className="shrink-0">
                                            {attempt.status === 'completed' ? (
                                                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold border-4 ${attempt.score && attempt.score >= 80 ? "border-emerald-500 text-emerald-600 bg-emerald-50" :
                                                        attempt.score && attempt.score >= 60 ? "border-yellow-500 text-yellow-600 bg-yellow-50" :
                                                            "border-red-500 text-red-600 bg-red-50"
                                                    }`}>
                                                    {attempt.score}%
                                                </div>
                                            ) : (
                                                <div className="w-16 h-16 rounded-full bg-indigo-50 border-4 border-indigo-200 flex items-center justify-center">
                                                    <Activity className="w-8 h-8 text-indigo-500" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-xl font-semibold">{attempt.testTitle || "Unknown Test"}</h3>
                                                <Badge variant={attempt.status === 'completed' ? 'outline' : 'secondary'}>
                                                    {attempt.status === 'completed' ? 'Completed' : 'In Progress'}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>{format(attempt.startedAt, "PPP")}</span>
                                                </div>
                                                {attempt.aiScore !== undefined && (
                                                    <div className="flex items-center gap-1 text-purple-600">
                                                        <BrainCircuit className="w-4 h-4" />
                                                        <span>AI Score: {attempt.aiScore}%</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action */}
                                        <div className="shrink-0">
                                            <Button variant="ghost" className="gap-2 group">
                                                {attempt.status === 'completed' ? "View Details" : "Resume Test"}
                                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
