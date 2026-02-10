"use client";

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  FileText,
  Clock,
  MoreVertical,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { useGetTests, useDeleteTest } from '@/features/quiz-creator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Test } from '@/types/db';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';

export default function AdminTestsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Test['status']>('DRAFT');
  const { data: user } = useCurrentUser();
  console.log({ user })
  const { data, isLoading } = useGetTests({
    status: statusFilter !== 'DRAFT' ? statusFilter : undefined,
    search: search || undefined,
    userId: user?._id
  });
  const deleteTest = useDeleteTest();
  const tests = data || [];

  const handleDelete = async (testId: string) => {
    if (confirm('Are you sure you want to delete this test?')) {
      await deleteTest.mutateAsync(testId);
    }
  };

  const getStatusBadge = (status: Test['status']) => {
    const styles = {
      DRAFT: 'bg-muted text-muted-foreground',
      SCHEDULED: 'bg-warning/10 text-warning',
      ACTIVE: 'bg-success/10 text-success',
      COMPLETED: 'bg-primary/10 text-primary',
    };
    return styles[status] || styles.DRAFT;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Test Management</h1>
          <p className="text-muted-foreground">Create and manage tests for students</p>
        </div>
        <Link href="/admin/tests/create">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Create Test
          </Button>
        </Link>
      </div>

      {/* Filters */}
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
        <Select value={statusFilter} onValueChange={(e) => setStatusFilter(e as Test['status'])}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tests Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : tests && tests.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((test, index) => (
            <motion.div
              key={test.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card-elevated group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/tests/${test.id}`}>
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/tests/${test.id}/edit`}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(test.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <h3 className="font-semibold text-lg mb-1 line-clamp-1">{test.title}</h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {test.description}
              </p>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {test.questionCount} Q
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {test.duration} min
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(test.status)}`}>
                  {test.status}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(test.scheduledDate).toLocaleDateString()}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-muted/30 rounded-xl">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tests found</h3>
          <p className="text-muted-foreground mb-4">
            {search ? 'Try adjusting your search' : 'Create your first test to get started'}
          </p>
          {!search && (
            <Link href="/admin/tests/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Test
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
