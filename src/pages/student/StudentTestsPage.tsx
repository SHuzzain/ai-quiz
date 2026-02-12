import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTests, useStudentAttempts, useCurrentUser, useStartAttempt } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Play, RotateCw, Clock, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";

export function StudentTestsPage() {
    const navigate = useNavigate();
    const { data: user } = useCurrentUser();
    const { data: tests, isLoading: testsLoading } = useTests({ status: "active" });
    const { data: attempts, isLoading: attemptsLoading } = useStudentAttempts(user?.id || "");
    const startAttempt = useStartAttempt();

    const [search, setSearch] = useState("");

    const handleStartTest = async (testId: string) => {
        if (!user) return;

        // Check if there is already an active attempt
        const activeAttempt = attempts?.find(a => a.testId === testId && a.status === "in_progress");

        if (activeAttempt) {
            navigate(`/student/test/${testId}`);
            return;
        }

        try {
            await startAttempt.mutateAsync({ testId, studentId: user.id });
            navigate(`/student/test/${testId}`);
        } catch (error) {
            console.error("Failed to start test:", error);
        }
    };

    const filteredTests = tests?.filter(test =>
        test.title.toLowerCase().includes(search.toLowerCase()) ||
        test.description?.toLowerCase().includes(search.toLowerCase())
    );

    const getTestStatus = (testId: string) => {
        if (!attempts) return "start";
        const activeResult = attempts.find(a => a.testId === testId && a.status === "in_progress");
        if (activeResult) return "resume";
        const completedResult = attempts.find(a => a.testId === testId && a.status === "completed");
        if (completedResult) return "reattempt";
        return "start";
    };

    return (
        <div className="container py-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Explore Tests</h1>
                    <p className="text-muted-foreground mt-2">Discover new challenges and grow your knowledge!</p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search tests..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid */}
            {testsLoading || attemptsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-64 rounded-xl bg-muted/50 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTests?.map((test, index) => {
                        const status = getTestStatus(test.id);
                        const isResume = status === "resume";
                        const isReattempt = status === "reattempt";

                        return (
                            <motion.div
                                key={test.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className={`h-full flex flex-col hover:shadow-lg transition-all border-l-4 ${isResume ? "border-l-indigo-500" : isReattempt ? "border-l-emerald-500" : "border-l-primary"
                                    }`}>
                                    <CardHeader>
                                        <div className="flex justify-between items-start gap-4">
                                            <CardTitle className="line-clamp-2 text-xl">{test.title}</CardTitle>
                                            {isResume && <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">In Progress</Badge>}
                                            {isReattempt && <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Completed</Badge>}
                                        </div>
                                        <CardDescription className="line-clamp-3 mt-2">
                                            {test.description || "No description provided."}
                                        </CardDescription>
                                    </CardHeader>

                                    <div className="flex-1" /> {/* Spacer */}

                                    <CardContent>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                <span>{test.duration}m</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <HelpCircle className="w-4 h-4" />
                                                <span>{test.questionCount || "?"} Qs</span>
                                            </div>
                                        </div>
                                    </CardContent>

                                    <CardFooter>
                                        <Button
                                            onClick={() => handleStartTest(test.id)}
                                            className={`w-full gap-2 ${isResume ? "bg-indigo-600 hover:bg-indigo-700" :
                                                    isReattempt ? "bg-emerald-600 hover:bg-emerald-700" : ""
                                                }`}
                                        >
                                            {isResume ? (
                                                <>
                                                    <Play className="w-4 h-4" /> Resume Test
                                                </>
                                            ) : isReattempt ? (
                                                <>
                                                    <RotateCw className="w-4 h-4" /> Retake Test
                                                </>
                                            ) : (
                                                <>
                                                    <Play className="w-4 h-4" /> Start Test
                                                </>
                                            )}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {!testsLoading && filteredTests?.length === 0 && (
                <div className="text-center py-20">
                    <p className="text-xl text-muted-foreground">No tests found matching your search.</p>
                </div>
            )}
        </div>
    );
}
