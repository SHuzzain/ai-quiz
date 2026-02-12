/**
 * Admin User Management Page
 */

import { useState } from 'react';
import { AdminLayout } from '@/components/layout';
import { useUsers } from '@/hooks/useApi';
import { UserRole } from '@/types';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
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
import { Search, Users, Eye } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User } from '@/types';

export function AdminUsersPage() {
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [search, setSearch] = useState('');

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { data, isLoading } = useUsers({
    role: roleFilter === 'all' ? undefined : roleFilter,
    search: search || undefined,
  });

  const users = data?.data || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">View and manage platform users</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val as UserRole | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="student">Student</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Users ({data?.total ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading users...</p>
            ) : users.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No users found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                            alt={user.name}
                            className="w-8 h-8 rounded-full bg-muted"
                          />
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.grade ?? '—'}</TableCell>
                      <TableCell>{format(new Date(user.createdAt), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{format(new Date(user.lastActiveAt), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsDetailsOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* User Details Modal */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                Full profile information for {selectedUser?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="grid gap-4 py-4">
                {/* Avatar & Name */}
                <div className="flex flex-col items-center gap-2 mb-4">
                  <img
                    src={selectedUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.email}`}
                    alt={selectedUser.name}
                    className="w-24 h-24 rounded-full bg-muted border-4 border-background shadow-sm"
                  />
                  <div className="text-center">
                    <h3 className="font-bold text-xl">{selectedUser.name}</h3>
                    <p className="text-muted-foreground">{selectedUser.email}</p>
                    <Badge className="mt-2" variant={selectedUser.role === 'admin' ? 'default' : 'secondary'}>
                      {selectedUser.role}
                    </Badge>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Grade</span>
                    <p className="font-medium">{selectedUser.grade ?? 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">User ID</span>
                    <p className="font-medium text-xs break-all">{selectedUser.id}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Joined</span>
                    <p className="font-medium">{format(new Date(selectedUser.createdAt), 'PP p')}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Last Active</span>
                    <p className="font-medium">{format(new Date(selectedUser.lastActiveAt), 'PP p')}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
