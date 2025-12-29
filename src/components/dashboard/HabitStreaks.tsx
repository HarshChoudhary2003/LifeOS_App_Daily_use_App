import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Flame, Target, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Habit {
  id: string;
  name: string;
  color: string;
}

interface HabitLog {
  habit_id: string;
  completed_at: string;
}

const COLORS: Record<string, string> = {
  indigo: 'bg-primary',
  emerald: 'bg-success',
  amber: 'bg-accent',
  rose: 'bg-destructive',
  sky: 'bg-info',
};

export function HabitStreaks() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  async function fetchData() {
    setLoading(true);

    const { data: habitsData } = await supabase
      .from('habits')
      .select('id, name, color')
      .eq('user_id', user!.id)
      .eq('archived', false)
      .order('created_at', { ascending: true })
      .limit(5);

    if (habitsData) setHabits(habitsData);

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

  async function toggleHabit(habitId: string) {
    const today = new Date().toISOString().split('T')[0];
    const isCompleted = logs.some(
      (l) => l.habit_id === habitId && l.completed_at === today
    );

    if (isCompleted) {
      await supabase
        .from('habit_logs')
        .delete()
        .eq('habit_id', habitId)
        .eq('completed_at', today);
      setLogs(logs.filter((l) => !(l.habit_id === habitId && l.completed_at === today)));
    } else {
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

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="h-20 bg-muted/50 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const todayCompleted = habits.filter((h) => isCompletedToday(h.id)).length;

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          Today's Habits
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/habits" className="text-xs">
            View all <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {habits.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">No habits yet</p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/habits">Create your first habit</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {habits.map((habit) => {
              const streak = getStreak(habit.id);
              const completed = isCompletedToday(habit.id);
              const colorClass = COLORS[habit.color] || 'bg-primary';

              return (
                <div
                  key={habit.id}
                  className="flex items-center gap-3"
                >
                  <button
                    onClick={() => toggleHabit(habit.id)}
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all',
                      completed
                        ? `${colorClass} text-white`
                        : 'border border-muted-foreground/30 hover:border-primary'
                    )}
                  >
                    {completed && <Check className="h-4 w-4" />}
                  </button>
                  <span className={cn(
                    'flex-1 text-sm truncate',
                    completed && 'text-muted-foreground line-through'
                  )}>
                    {habit.name}
                  </span>
                  {streak > 0 && (
                    <div className="flex items-center gap-1 text-accent">
                      <Flame className="h-3 w-3" />
                      <span className="text-xs font-medium">{streak}</span>
                    </div>
                  )}
                </div>
              );
            })}
            
            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
              {todayCompleted}/{habits.length} completed today
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
