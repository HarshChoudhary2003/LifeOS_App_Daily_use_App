import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  GraduationCap, 
  Target, 
  Trash2, 
  Pencil, 
  CheckCircle2,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

interface LearningGoal {
  id: string;
  title: string;
  description: string | null;
  status: string;
  progress: number;
  target_date: string | null;
  created_at: string;
  updated_at: string;
}

export default function Learning() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<LearningGoal | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_date: '',
    progress: 0,
  });

  useEffect(() => {
    if (user) fetchGoals();
  }, [user]);

  async function fetchGoals() {
    setLoading(true);
    const { data, error } = await supabase
      .from('learning_goals')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (data) setGoals(data);
    if (error) console.error('Error fetching learning goals:', error);
    setLoading(false);
  }

  async function saveGoal() {
    if (!formData.title.trim()) {
      toast({ title: 'Please enter a title', variant: 'destructive' });
      return;
    }

    const status = formData.progress >= 100 ? 'completed' : 'in_progress';

    if (editingGoal) {
      const { error } = await supabase
        .from('learning_goals')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          target_date: formData.target_date || null,
          progress: Math.min(100, Math.max(0, formData.progress)),
          status,
        })
        .eq('id', editingGoal.id);

      if (error) {
        toast({ title: 'Failed to update goal', variant: 'destructive' });
      } else {
        toast({ title: 'Goal updated!' });
        closeDialog();
        fetchGoals();
      }
    } else {
      const { error } = await supabase.from('learning_goals').insert({
        user_id: user!.id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        target_date: formData.target_date || null,
        progress: Math.min(100, Math.max(0, formData.progress)),
        status,
      });

      if (error) {
        toast({ title: 'Failed to create goal', variant: 'destructive' });
      } else {
        toast({ title: 'Learning goal created!' });
        closeDialog();
        fetchGoals();
      }
    }
  }

  async function deleteGoal(id: string) {
    const { error } = await supabase.from('learning_goals').delete().eq('id', id);
    if (!error) {
      setGoals(goals.filter(g => g.id !== id));
      toast({ title: 'Goal deleted' });
    }
  }

  async function updateProgress(id: string, progress: number) {
    const status = progress >= 100 ? 'completed' : 'in_progress';
    const { error } = await supabase
      .from('learning_goals')
      .update({ progress, status })
      .eq('id', id);

    if (!error) {
      setGoals(goals.map(g => 
        g.id === id ? { ...g, progress, status } : g
      ));
      if (progress >= 100) {
        toast({ title: 'Congratulations! Goal completed!' });
      }
    }
  }

  function openEditDialog(goal: LearningGoal) {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description || '',
      target_date: goal.target_date || '',
      progress: goal.progress,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingGoal(null);
    setFormData({ title: '', description: '', target_date: '', progress: 0 });
  }

  const activeGoals = goals.filter(g => g.status !== 'completed');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const averageProgress = activeGoals.length > 0 
    ? Math.round(activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length)
    : 0;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <PageHeader
        title="Learning"
        description={goals.length === 0 ? "What do you want to learn?" : `${activeGoals.length} active goal${activeGoals.length !== 1 ? 's' : ''}`}
        action={
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (!open) closeDialog();
            else setDialogOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">New Goal</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingGoal ? 'Edit Goal' : 'What do you want to learn?'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Learning goal</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Learn to play guitar"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Notes (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Resources, milestones, or anything helpful..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_date">Target date (optional)</Label>
                  <Input
                    id="target_date"
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Progress: {formData.progress}%</Label>
                  <Slider
                    value={[formData.progress]}
                    onValueChange={([value]) => setFormData({ ...formData, progress: value })}
                    max={100}
                    step={5}
                  />
                </div>
                <Button onClick={saveGoal} className="w-full">
                  {editingGoal ? 'Save Changes' : 'Start Learning'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Stats Overview */}
      {goals.length > 0 && (
        <div className="grid gap-3 grid-cols-3">
          <Card className="glass-card">
            <CardContent className="p-3 sm:p-4 text-center">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1 text-accent" />
              <p className="text-xl sm:text-2xl font-semibold">{activeGoals.length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-3 sm:p-4 text-center">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1 text-warning" />
              <p className="text-xl sm:text-2xl font-semibold">{averageProgress}%</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Avg Progress</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-3 sm:p-4 text-center">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1 text-success" />
              <p className="text-xl sm:text-2xl font-semibold">{completedGoals.length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Goals */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass-card">
              <CardContent className="p-4">
                <div className="h-16 bg-muted/50 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : activeGoals.length > 0 ? (
        <div className="space-y-3 stagger-children">
          <h3 className="text-sm font-medium text-muted-foreground">In Progress</h3>
          {activeGoals.map((goal) => (
            <Card key={goal.id} className="glass-card hover-lift group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{goal.title}</h4>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {goal.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      <Progress value={goal.progress} className="flex-1" />
                      <span className="text-sm font-medium w-12 text-right">{goal.progress}%</span>
                    </div>
                    {goal.target_date && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Target: {format(new Date(goal.target_date), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateProgress(goal.id, Math.min(100, goal.progress + 10))}
                    >
                      <TrendingUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(goal)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteGoal(goal.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : completedGoals.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Ready to learn something new?"
          description="Set a goal for what you'd like to master"
          action={
            <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Set Your First Goal
            </Button>
          }
        />
      ) : null}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Completed</h3>
          {completedGoals.map((goal) => (
            <Card key={goal.id} className="glass-card opacity-75 group">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    <span className="font-medium truncate">{goal.title}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteGoal(goal.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
