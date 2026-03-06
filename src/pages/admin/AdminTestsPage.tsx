/**
 * Admin Test Management Page
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  FileText,
  Loader2,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout';
import { useTests, useDeleteTest } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Test } from '@/types';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function AdminTestsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: listData, isLoading } = useTests({
    status: statusFilter !== 'all' ? (statusFilter as Test['status']) : undefined,
    search: search || undefined,
    page,
    pageSize,
  });
  const tests = listData?.items ?? [];
  const total = listData?.total ?? 0;
  const deleteTest = useDeleteTest();

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, total);

  const handleDelete = async (e: React.MouseEvent, testId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this test?')) return;
    try {
      await deleteTest.mutateAsync(testId);
    } catch {
      // error handled by mutation
    }
  };

  const getStatusVariant = (status: Test['status']): 'secondary' | 'default' | 'outline' => {
    if (status === 'active') return 'default';
    if (status === 'completed') return 'secondary';
    return 'outline';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Test Management</h1>
            <p className="text-muted-foreground">Create and manage tests for students</p>
          </div>
          <Link to="/admin/tests/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Test
            </Button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p>Loading tests...</p>
          </div>
        ) : tests && tests.length > 0 ? (
          <Card>
            <div className="overflow-auto max-h-[70vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead className="w-20">Title</TableHead>
                    {/* <TableHead className="w-20">Description</TableHead> */}
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-20">Questions</TableHead>
                    <TableHead className="w-20">Duration</TableHead>
                    <TableHead className="w-24">Total Mark</TableHead>
                    <TableHead className="w-28">Scheduled</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((test, index) => (
                    <TableRow
                      key={test.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/admin/tests/${test.id}`)}
                    >
                      <TableCell className="font-muted-foreground">{startRow + index}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate" title={test.title}>
                        {test.title}
                      </TableCell>
                      {/* <TableCell className="max-w-[240px] truncate text-muted-foreground" title={test.description}>
                        {test.description || '—'}
                      </TableCell> */}
                      <TableCell>
                        <Badge variant={getStatusVariant(test.status as Test['status'])} className="capitalize">
                          {test.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{test.questionCount}</TableCell>
                      <TableCell>{test.duration} min</TableCell>
                      <TableCell>{test.totalMark ?? '—'}</TableCell>
                      <TableCell>{new Date(test.scheduledDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/admin/tests/${test.id}`)}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/admin/tests/${test.id}/edit`)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-pretty"
                            onClick={(e) => handleDelete(e, test.id)}
                            title="Delete"
                            disabled={deleteTest.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    Showing {startRow}–{endRow} of {total}
                  </span>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="tests-page-size" className="text-xs whitespace-nowrap">Per page</Label>
                    <select
                      id="tests-page-size"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">No tests found</h3>
              <p className="mb-4">
                {search ? 'Try adjusting your search' : 'Create your first test to get started'}
              </p>
              {!search && (
                <Link to="/admin/tests/new">
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Test
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
