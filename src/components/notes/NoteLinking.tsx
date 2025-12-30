import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Link2, Plus, X, CheckSquare, Target, Lightbulb } from 'lucide-react';

interface NoteLink {
  id: string;
  linked_type: string;
  linked_id: string;
  linked_title?: string;
}

interface LinkableItem {
  id: string;
  title: string;
}

interface NoteLinkingProps {
  noteId: string;
}

const linkTypeIcons = {
  task: CheckSquare,
  habit: Target,
  decision: Lightbulb,
};

const linkTypeLabels = {
  task: 'Task',
  habit: 'Habit',
  decision: 'Decision',
};

export function NoteLinking({ noteId }: NoteLinkingProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [links, setLinks] = useState<NoteLink[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [linkType, setLinkType] = useState<string>('');
  const [linkableItems, setLinkableItems] = useState<LinkableItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (noteId && user) {
      fetchLinks();
    }
  }, [noteId, user]);

  useEffect(() => {
    if (linkType && user) {
      fetchLinkableItems();
    }
  }, [linkType, user]);

  async function fetchLinks() {
    const { data } = await supabase
      .from('note_links')
      .select('*')
      .eq('note_id', noteId);

    if (data) {
      // Fetch titles for linked items
      const linksWithTitles = await Promise.all(
        data.map(async (link) => {
          let title = '';
          if (link.linked_type === 'task') {
            const { data: task } = await supabase
              .from('tasks')
              .select('title')
              .eq('id', link.linked_id)
              .single();
            title = task?.title || 'Deleted task';
          } else if (link.linked_type === 'habit') {
            const { data: habit } = await supabase
              .from('habits')
              .select('name')
              .eq('id', link.linked_id)
              .single();
            title = habit?.name || 'Deleted habit';
          } else if (link.linked_type === 'decision') {
            const { data: decision } = await supabase
              .from('decisions')
              .select('question')
              .eq('id', link.linked_id)
              .single();
            title = decision?.question || 'Deleted decision';
          }
          return { ...link, linked_title: title };
        })
      );
      setLinks(linksWithTitles);
    }
  }

  async function fetchLinkableItems() {
    setLoading(true);
    let items: LinkableItem[] = [];

    if (linkType === 'task') {
      const { data } = await supabase
        .from('tasks')
        .select('id, title')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      items = data || [];
    } else if (linkType === 'habit') {
      const { data } = await supabase
        .from('habits')
        .select('id, name')
        .eq('user_id', user!.id)
        .eq('archived', false)
        .order('created_at', { ascending: false });
      items = data?.map(h => ({ id: h.id, title: h.name })) || [];
    } else if (linkType === 'decision') {
      const { data } = await supabase
        .from('decisions')
        .select('id, question')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      items = data?.map(d => ({ id: d.id, title: d.question })) || [];
    }

    // Filter out already linked items
    const linkedIds = links.filter(l => l.linked_type === linkType).map(l => l.linked_id);
    setLinkableItems(items.filter(i => !linkedIds.includes(i.id)));
    setLoading(false);
  }

  async function addLink() {
    if (!selectedItem || !linkType) return;

    const { error } = await supabase.from('note_links').insert({
      note_id: noteId,
      linked_type: linkType,
      linked_id: selectedItem,
      user_id: user!.id,
    });

    if (error) {
      toast({ title: 'Failed to add link', variant: 'destructive' });
    } else {
      toast({ title: 'Link added!' });
      setDialogOpen(false);
      setLinkType('');
      setSelectedItem('');
      fetchLinks();
    }
  }

  async function removeLink(linkId: string) {
    const { error } = await supabase.from('note_links').delete().eq('id', linkId);
    if (!error) {
      setLinks(links.filter(l => l.id !== linkId));
      toast({ title: 'Link removed' });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Linked Items
        </span>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link to...</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Select value={linkType} onValueChange={(val) => {
                setLinkType(val);
                setSelectedItem('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="habit">Habit</SelectItem>
                  <SelectItem value="decision">Decision</SelectItem>
                </SelectContent>
              </Select>

              {linkType && (
                <Select value={selectedItem} onValueChange={setSelectedItem} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder={loading ? 'Loading...' : `Select ${linkTypeLabels[linkType as keyof typeof linkTypeLabels]}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {linkableItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title}
                      </SelectItem>
                    ))}
                    {linkableItems.length === 0 && !loading && (
                      <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                        No items available
                      </div>
                    )}
                  </SelectContent>
                </Select>
              )}

              <Button onClick={addLink} disabled={!selectedItem} className="w-full">
                Add Link
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {links.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {links.map((link) => {
            const Icon = linkTypeIcons[link.linked_type as keyof typeof linkTypeIcons];
            return (
              <Badge
                key={link.id}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
              >
                {Icon && <Icon className="h-3 w-3" />}
                <span className="max-w-32 truncate">{link.linked_title}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 hover:bg-destructive/20"
                  onClick={() => removeLink(link.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No linked items yet</p>
      )}
    </div>
  );
}
