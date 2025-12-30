import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, Search, Trash2, Pencil, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { NoteLinking } from '@/components/notes/NoteLinking';
import { KnowledgeRecall } from '@/components/knowledge/KnowledgeRecall';
interface Note {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export default function Notes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });

  useEffect(() => {
    if (user) fetchNotes();
  }, [user]);

  async function fetchNotes() {
    setLoading(true);
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user!.id)
      .order('updated_at', { ascending: false });

    if (data) setNotes(data);
    if (error) console.error('Error fetching notes:', error);
    setLoading(false);
  }

  async function saveNote() {
    if (!formData.title.trim()) {
      toast({ title: 'Please enter a title', variant: 'destructive' });
      return;
    }

    if (editingNote) {
      // Update existing note
      const { error } = await supabase
        .from('notes')
        .update({
          title: formData.title.trim(),
          content: formData.content.trim() || null,
        })
        .eq('id', editingNote.id);

      if (error) {
        toast({ title: 'Failed to update note', variant: 'destructive' });
      } else {
        toast({ title: 'Note updated!' });
        closeDialog();
        fetchNotes();
      }
    } else {
      // Create new note
      const { error } = await supabase.from('notes').insert({
        user_id: user!.id,
        title: formData.title.trim(),
        content: formData.content.trim() || null,
      });

      if (error) {
        toast({ title: 'Failed to create note', variant: 'destructive' });
      } else {
        toast({ title: 'Note created!' });
        closeDialog();
        fetchNotes();
      }
    }
  }

  async function deleteNote(id: string) {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (!error) {
      setNotes(notes.filter(n => n.id !== id));
      toast({ title: 'Note deleted' });
    }
  }

  function openEditDialog(note: Note) {
    setEditingNote(note);
    setFormData({ title: note.title, content: note.content || '' });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingNote(null);
    setFormData({ title: '', content: '' });
  }

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Notes"
        description={`${notes.length} note${notes.length !== 1 ? 's' : ''}`}
        action={
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (!open) closeDialog();
            else setDialogOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingNote ? 'Edit Note' : 'New Note'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Note title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Write your note..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={8}
                    className="resize-none"
                  />
                </div>
                {editingNote && (
                  <div className="border-t pt-4">
                    <NoteLinking noteId={editingNote.id} />
                  </div>
                )}
                <Button onClick={saveNote} className="w-full">
                  {editingNote ? 'Update Note' : 'Create Note'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Search */}
      {notes.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Notes List */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="glass-card">
              <CardContent className="p-4">
                <div className="h-20 bg-muted/50 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredNotes.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 stagger-children">
          {filteredNotes.map((note) => (
            <Card key={note.id} className="glass-card hover-lift cursor-pointer group">
              <CardContent className="p-4" onClick={() => openEditDialog(note)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate">{note.title}</h3>
                    {note.content && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {note.content}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(note.updated_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(note);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(note.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : search ? (
        <EmptyState
          icon={Search}
          title="No results"
          description={`No notes matching "${search}"`}
        />
      ) : (
        <EmptyState
          icon={FileText}
          title="No notes yet"
          description="Create your first note to get started"
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Note
            </Button>
          }
        />
      )}

      {/* AI Knowledge Recall */}
      {notes.length > 0 && <KnowledgeRecall />}
    </div>
  );
}
