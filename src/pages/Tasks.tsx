import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { CategoryBadge } from '@/components/ui/category-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, CheckSquare, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
}

const categories = ['Work', 'Personal', 'Health'] as const;

export default function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', category: 'Personal' });

  useEffect(() => {
    if (user) fetchTasks();
  }, [user]);

  async function fetchTasks() {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (data) setTasks(data);
    if (error) console.error('Error fetching tasks:', error);
    setLoading(false);
  }

  async function createTask() {
    if (!newTask.title.trim()) {
      toast({ title: 'Please enter a task title', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('tasks').insert({
      user_id: user!.id,
      title: newTask.title.trim(),
      category: newTask.category,
      status: 'pending',
    });

    if (error) {
      toast({ title: 'Failed to create task', variant: 'destructive' });
    } else {
      toast({ title: 'Task created!' });
      setNewTask({ title: '', category: 'Personal' });
      setDialogOpen(false);
      fetchTasks();
    }
  }

  async function toggleTask(task: Task) {
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', task.id);

    if (!error) {
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    }
  }

  async function deleteTask(taskId: string) {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (!error) {
      setTasks(tasks.filter(t => t.id !== taskId));
      toast({ title: 'Task deleted' });
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'pending') return task.status === 'pending';
    if (filter === 'completed') return task.status === 'completed';
    return task.category === filter;
  });

  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <PageHeader
        title="Tasks"
        description={pendingCount === 0 ? "All done! Take a break." : `${pendingCount} thing${pendingCount !== 1 ? 's' : ''} to finish`}
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Add Task</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>What would you like to finish?</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Task</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Finish the report by Friday"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && createTask()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newTask.category}
                    onValueChange={(value) => setNewTask({ ...newTask, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createTask} className="w-full">
                  Save Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Filters - horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
        {['all', 'pending', 'completed', ...categories].map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize shrink-0 h-9"
          >
            {f}
          </Button>
        ))}
      </div>

      {/* Task List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass-card">
              <CardContent className="p-3 sm:p-4">
                <div className="h-6 bg-muted/50 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTasks.length > 0 ? (
        <div className="space-y-2 stagger-children">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="glass-card hover-lift">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Checkbox
                    checked={task.status === 'completed'}
                    onCheckedChange={() => toggleTask(task)}
                    className="shrink-0 h-5 w-5"
                  />
                  <span
                    className={cn(
                      'flex-1 text-sm min-w-0 truncate',
                      task.status === 'completed' && 'line-through text-muted-foreground'
                    )}
                  >
                    {task.title}
                  </span>
                  <CategoryBadge category={task.category} className="hidden sm:flex" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => deleteTask(task.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CheckSquare}
          title="Nothing here yet"
          description="Add something you'd like to finish today"
          action={
            <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Task
            </Button>
          }
        />
      )}
    </div>
  );
}
