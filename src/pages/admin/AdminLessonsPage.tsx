/**
 * Admin Lesson Management Page
 */

import { useState } from 'react';
import { AdminLayout } from '@/components/layout';
import { useLessons, useUploadLesson, useDeleteLesson } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { GraduationCap, Plus, Trash2, FileText, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

export function AdminLessonsPage() {
  const { data: lessons, isLoading } = useLessons();
  const uploadLesson = useUploadLesson();
  const deleteLesson = useDeleteLesson();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const handleUpload = async () => {
    if (!title || files.length === 0) return;
    if (files.length > 3) {
      toast({ title: 'Max 3 files allowed', variant: 'destructive' });
      return;
    }
    try {
      await uploadLesson.mutateAsync({ title, description, files });
      setDialogOpen(false);
      setTitle('');
      setDescription('');
      setFiles([]);
      toast({ title: 'Lesson uploaded successfully!' });
    } catch {
      toast({ title: 'Failed to upload lesson', variant: 'destructive' });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      if (selectedFiles.length > 3) {
        toast({ title: 'You can only select up to 3 files', variant: 'destructive' });
        // Optionally truncate or reset
        setFiles(selectedFiles.slice(0, 3));
      } else {
        setFiles(selectedFiles);
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLesson.mutateAsync(id);
      toast({ title: 'Lesson deleted' });
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Lesson Management</h1>
            <p className="text-muted-foreground">Upload and manage lesson files (Max 3 files per lesson)</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Upload Lesson
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload New Lesson</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lesson title" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Files (Max 3) *</Label>
                  <Input
                    type="file"
                    multiple
                    max={3}
                    accept=".pdf,.doc,.docx,.txt,.pptx"
                    onChange={handleFileChange}
                  />
                  {files.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {files.length} file(s) selected: {files.map(f => f.name).join(', ')}
                    </div>
                  )}
                </div>
                <Button onClick={handleUpload} disabled={!title || files.length === 0 || uploadLesson.isPending} className="w-full gap-2">
                  <Upload className="w-4 h-4" />
                  {uploadLesson.isPending ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <p className="text-center py-12 text-muted-foreground">Loading lessons...</p>
        ) : !lessons?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No lessons yet. Upload your first lesson!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lessons.map((lesson) => (
              <Card key={lesson.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-sky-600" />
                      <CardTitle className="text-base">{lesson.title}</CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive/90" onClick={() => handleDelete(lesson.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {lesson.description && <p className="text-sm text-muted-foreground mb-2">{lesson.description}</p>}
                  <div className="space-y-1 mt-2">
                    {lesson.files && lesson.files.length > 0 ? (
                      lesson.files.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FileText className="w-3 h-3" />
                          <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[200px]">
                            {file.name}
                          </a>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No files</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 pt-2 border-t">{format(new Date(lesson.uploadedAt), 'MMM d, yyyy')}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
