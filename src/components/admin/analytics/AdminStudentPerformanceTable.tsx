import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { Search, HelpCircleIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip as TooltipUI,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSuspensePerformanceMetrics } from '@/hooks/useApi';

export function AdminStudentPerformanceTable() {
    const [page, setPage] = useState(1);
    const pageSize = 8;
    const [searchTerm, setSearchTerm] = useState('');
    const [inputValue, setInputValue] = useState('');
    const [isPending, startTransition] = useTransition();

    const { data: performanceMetrics } = useSuspensePerformanceMetrics(page, pageSize, { search: searchTerm });

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
        >
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Detailed Performance Metrics</CardTitle>
                            <CardDescription>
                                Comprehensive student performance analysis
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search students..."
                                    value={inputValue}
                                    onChange={(e) => {
                                        setInputValue(e.target.value);
                                        startTransition(() => {
                                            setSearchTerm(e.target.value);
                                            setPage(1);
                                        });
                                    }}
                                    className="pl-8"
                                />
                                <div className="absolute right-3 top-2.5">
                                    {isPending && <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Test</TableHead>
                                    <TableHead className="text-center">Avg Score</TableHead>
                                    <TableHead className="text-center">Attempts</TableHead>
                                    <TableHead className="text-center">Improvement</TableHead>
                                    <TableHead className="text-center">
                                        <TooltipProvider>
                                            <TooltipUI>
                                                <TooltipTrigger asChild>
                                                    <div className="flex items-center justify-center gap-1 cursor-help hover:text-foreground/80">
                                                        <span>Avg Hints Usage</span>
                                                        <HelpCircleIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Average number of hints used per test attempt</p>
                                                </TooltipContent>
                                            </TooltipUI>
                                        </TooltipProvider>
                                    </TableHead>
                                    <TableHead className="text-center">Time Efficiency</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {performanceMetrics?.data && performanceMetrics.data.length > 0 ? (
                                    performanceMetrics.data.map((metric) => (
                                        <TableRow key={metric.id}>
                                            <TableCell className="font-medium">{metric.studentName}</TableCell>
                                            <TableCell>{metric.testTitle}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={metric.averageBasicScore >= 80 ? 'default' : metric.averageBasicScore >= 60 ? 'secondary' : 'destructive'}>
                                                    {metric.averageBasicScore}%
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">{metric.totalAttempts}</TableCell>
                                            <TableCell className="text-center">
                                                <div className={`flex items-center justify-center gap-1 ${metric.improvementRate > 0 ? 'text-green-600' : metric.improvementRate < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                                    {metric.improvementRate > 0 ? <ArrowUp className="w-4 h-4" /> : metric.improvementRate < 0 ? <ArrowDown className="w-4 h-4" /> : null}
                                                    {metric.improvementRate}%
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">{metric.averageHintUsage}</TableCell>
                                            <TableCell className="text-center text-muted-foreground">{metric.averageTimeEfficiency}s</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            No results found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination Controls */}
                        {performanceMetrics && performanceMetrics.totalPages > 1 && (
                            <div className="flex items-center justify-end space-x-2 py-4 px-4 border-t">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        startTransition(() => {
                                            setPage((p) => Math.max(1, p - 1));
                                        });
                                    }}
                                    disabled={page === 1 || isPending}
                                >
                                    Previous
                                </Button>
                                <div className="text-sm text-muted-foreground mx-4">
                                    Page {page} of {performanceMetrics.totalPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        startTransition(() => {
                                            setPage((p) => p + 1);
                                        });
                                    }}
                                    disabled={page === performanceMetrics.totalPages || isPending}
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
