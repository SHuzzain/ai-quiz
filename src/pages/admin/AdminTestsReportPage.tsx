
/**
 * Admin Test Reports Page
 * Displays a list of all test attempts with details and status.
 */

import { useState } from 'react';
import { AdminLayout } from '@/components/layout';
import { useAllTestAttempts } from '@/hooks/useApi';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function AdminTestsReportPage() {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const pageSize = 20;
    const { data, isLoading } = useAllTestAttempts(page, pageSize);

    const attempts = data?.data || [];
    const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Test Reports</h1>
                    <p className="text-muted-foreground">Monitor student test performance and history</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            All Attempts ({data?.total ?? 0})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <p className="text-center py-8 text-muted-foreground">Loading reports...</p>
                        ) : attempts.length === 0 ? (
                            <p className="text-center py-8 text-muted-foreground">No test attempts found.</p>
                        ) : (
                            <div className="space-y-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student</TableHead>
                                            <TableHead>Test Title</TableHead>
                                            <TableHead>Score</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {attempts.map((attempt) => (
                                            <TableRow key={attempt.id}>
                                                <TableCell className="font-medium">
                                                    {attempt.studentName || 'Unknown Student'}
                                                </TableCell>
                                                <TableCell>{attempt.testTitle || 'Unknown Test'}</TableCell>
                                                <TableCell>
                                                    {attempt.score !== undefined ? (
                                                        <Badge variant={attempt.score >= 80 ? 'default' : attempt.score >= 50 ? 'secondary' : 'destructive'}>
                                                            {attempt.score || 0}%
                                                        </Badge>
                                                    ) : '—'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize">
                                                        {attempt.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {attempt.startedAt ? format(new Date(attempt.startedAt), 'MMM d, yyyy HH:mm') : '—'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => navigate(`/admin/reports/${attempt.id}`)}
                                                    >
                                                        <Eye className="w-4 h-4 mr-1" />
                                                        Details
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex justify-center gap-2 mt-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <span className="flex items-center text-sm">
                                            Page {page} of {totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
