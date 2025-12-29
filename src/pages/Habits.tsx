import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Flame, 
  Check, 
  Trash2, 
  Target,
  Calendar
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Habit {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

interface HabitLog {
  habit_id: string;
  completed_at: string;
}

const COLORS = [
  { name: 'indigo', class: 'bg-primary' },
  { name: 'emerald', class: 'bg-success' },
  { name: 'amber', class: 'bg-accent' },
  { name: 'rose', class: 'bg-destructive' },
  { name: 'sky', class: 'bg-info' },
];

export default function Habits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: '', description: '', color: 'indigo' });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  async function fetchData() {
    setLoading(true);
    
    // Fetch habits
    const { data: habitsData } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user!.id)
      .eq('archived', false)
      .order('created_at', { ascending: true });

    if (habitsData) setHabits(habitsData);

    // Fetch last 30 days of logs
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: logsData } = await supabase
      .from('habit_logs')
      .select('habit_id, completed_at')
      .eq('user_id', user!.id)
      .gte('completed_at', thirtyDaysAgo.toISOString().split('T')[0]);

    if (logsData) setLogs(logsData);
    setLoading(false);
  }

  async function createHabit() {
    if (!newHabit.name.trim()) return;

    const { error } = await supabase.from('habits').insert({
      user_id: user!.id,
      name: newHabit.name.trim(),
      description: newHabit.description.trim() || null,
      color: newHabit.color,
    });

    if (error) {
      toast({ title: 'Error creating habit', variant: 'destructive' });
    } else {
      toast({ title: 'Habit created!' });
      setNewHabit({ name: '', description: '', color: 'indigo' });
      setDialogOpen(false);
      fetchData();
    }
  }

  async function toggleHabitToday(habitId: string) {
    const today = new Date().toISOString().split('T')[0];
    const isCompleted = logs.some(
      (l) => l.habit_id === habitId && l.completed_at === today
    );

    if (isCompleted) {
      // Remove log
      await supabase
        .from('habit_logs')
        .delete()
        .eq('habit_id', habitId)
        .eq('completed_at', today);
      
      setLogs(logs.filter((l) => !(l.habit_id === habitId && l.completed_at === today)));
    } else {
      // Add log
      const { error } = await supabase.from('habit_logs').insert({
        habit_id: habitId,
        user_id: user!.id,
        completed_at: today,
      });

      if (!error) {
        setLogs([...logs, { habit_id: habitId, completed_at: today }]);
      }
    }
  }

  async function deleteHabit(habitId: string) {
    await supabase.from('habits').delete().eq('id', habitId);
    setHabits(habits.filter((h) => h.id !== habitId));
    toast({ title: 'Habit deleted' });
  }

  function getStreak(habitId: string): number {
    const habitLogs = logs
      .filter((l) => l.habit_id === habitId)
      .map((l) => l.completed_at)
      .sort()
      .reverse();

    if (habitLogs.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];

      if (habitLogs.includes(dateStr)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return streak;
  }

  function isCompletedToday(habitId: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return logs.some((l) => l.habit_id === habitId && l.completed_at === today);
  }

  // Get last 7 days for the mini calendar
  function getLast7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  }

  const last7Days = getLast7Days();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Habits"
        description="Build consistency with daily habits"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Habit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Habit</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Habit Name</Label>
                  <Input
                    placeholder="e.g., Morning meditation"
                    value={newHabit.name}
                    onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input
                    placeholder="Brief description"
                    value={newHabit.description}
                    onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => setNewHabit({ ...newHabit, color: color.name })}
                        className={cn(
                          'h-8 w-8 rounded-full transition-all',
                          color.class,
                          newHabit.color === color.name
                            ? 'ring-2 ring-offset-2 ring-primary'
                            : 'opacity-50 hover:opacity-100'
                        )}
                      />
                    ))}
                  </div>
                </div>
                <Button onClick={createHabit} className="w-full">
                  Create Habit
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

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
      ) : habits.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No habits yet"
          description="Start building good habits by adding your first one"
        />
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => {
            const streak = getStreak(habit.id);
            const completedToday = isCompletedToday(habit.id);
            const colorClass = COLORS.find((c) => c.name === habit.color)?.class || 'bg-primary';

            return (
              <Card key={habit.id} className="glass-card group">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Complete button */}
                    <button
                      onClick={() => toggleHabitToday(habit.id)}
                      className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all',
                        completedToday
                          ? `${colorClass} text-white`
                          : 'border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5'
                      )}
                    >
                      {completedToday ? (
                        <Check className="h-6 w-6" />
                      ) : (
                        <Plus className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>

                    {/* Habit info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{habit.name}</h3>
                      {habit.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {habit.description}
                        </p>
                      )}
                    </div>

                    {/* Streak */}
                    {streak > 0 && (
                      <div className="flex items-center gap-1 text-accent">
                        <Flame className="h-4 w-4" />
                        <span className="text-sm font-medium">{streak}</span>
                      </div>
                    )}

                    {/* Mini calendar - last 7 days */}
                    <div className="hidden sm:flex items-center gap-1">
                      {last7Days.map((date) => {
                        const completed = logs.some(
                          (l) => l.habit_id === habit.id && l.completed_at === date
                        );
                        return (
                          <div
                            key={date}
                            className={cn(
                              'h-3 w-3 rounded-sm',
                              completed ? colorClass : 'bg-muted'
                            )}
                          />
                        );
                      })}
                    </div>

                    {/* Delete button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteHabit(habit.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Stats summary */}
      {habits.length > 0 && (
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">
                {logs.filter((l) => l.completed_at === new Date().toISOString().split('T')[0]).length} of {habits.length} completed today
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
