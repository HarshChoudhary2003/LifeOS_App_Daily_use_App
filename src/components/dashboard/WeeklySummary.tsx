import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeeklyStats {
  tasksCompleted: number;
  tasksTotal: number;
  expensesThisWeek: number;
  expensesLastWeek: number;
}

export function WeeklySummary() {
  const { user } = useAuth();
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchStats();
  }, [user]);

  async function fetchStats() {
    setLoading(true);
    
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    // Tasks completed this week
    const { data: completedTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', user!.id)
      .eq('status', 'completed')
      .gte('updated_at', startOfWeek.toISOString());

    // Total tasks created this week
    const { data: totalTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', user!.id)
      .gte('created_at', startOfWeek.toISOString());

    // Expenses this week
    const { data: thisWeekExpenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', user!.id)
      .gte('created_at', startOfWeek.toISOString());

    // Expenses last week
    const { data: lastWeekExpenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', user!.id)
      .gte('created_at', startOfLastWeek.toISOString())
      .lt('created_at', startOfWeek.toISOString());

    setStats({
      tasksCompleted: completedTasks?.length || 0,
      tasksTotal: totalTasks?.length || 0,
      expensesThisWeek: thisWeekExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0,
      expensesLastWeek: lastWeekExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0,
    });

    setLoading(false);
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

  if (!stats) return null;

  const completionRate = stats.tasksTotal > 0 
    ? Math.round((stats.tasksCompleted / stats.tasksTotal) * 100) 
    : 100;

  const expenseTrend = stats.expensesLastWeek > 0
    ? ((stats.expensesThisWeek - stats.expensesLastWeek) / stats.expensesLastWeek) * 100
    : 0;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          Weekly Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Task completion */}
          <div className="space-y-1">
            <p className="text-2xl font-semibold">{completionRate}%</p>
            <p className="text-xs text-muted-foreground">
              Tasks completed ({stats.tasksCompleted}/{stats.tasksTotal})
            </p>
          </div>

          {/* Spending trend */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-2xl font-semibold">
                ${stats.expensesThisWeek.toFixed(0)}
              </p>
              {expenseTrend !== 0 && (
                <span
                  className={cn(
                    'flex items-center text-xs font-medium',
                    expenseTrend > 0 ? 'text-destructive' : 'text-success'
                  )}
                >
                  {expenseTrend > 0 ? (
                    <TrendingUp className="h-3 w-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-0.5" />
                  )}
                  {Math.abs(expenseTrend).toFixed(0)}%
                </span>
              )}
              {expenseTrend === 0 && stats.expensesLastWeek > 0 && (
                <Minus className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Spent this week
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
