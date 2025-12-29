import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, TrendingUp, Clock, DollarSign, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Insight {
  icon: typeof Lightbulb;
  message: string;
  type: 'info' | 'success' | 'warning';
}

export function SmartInsight() {
  const { user } = useAuth();
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) generateInsight();
  }, [user]);

  async function generateInsight() {
    setLoading(true);

    // Fetch data for analysis
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('status, created_at, updated_at')
      .eq('user_id', user!.id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, created_at, category')
      .eq('user_id', user!.id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get habits
    const { data: habitLogs } = await supabase
      .from('habit_logs')
      .select('completed_at')
      .eq('user_id', user!.id)
      .gte('completed_at', thirtyDaysAgo.toISOString().split('T')[0]);

    // Generate insights based on data
    const insights: Insight[] = [];

    // Task completion insights
    if (tasks && tasks.length > 0) {
      const completed = tasks.filter((t) => t.status === 'completed').length;
      const rate = (completed / tasks.length) * 100;

      if (rate >= 80) {
        insights.push({
          icon: TrendingUp,
          message: `Great job! You've completed ${rate.toFixed(0)}% of your tasks this month.`,
          type: 'success',
        });
      } else if (rate < 50) {
        insights.push({
          icon: Target,
          message: `Try breaking down larger tasks into smaller, manageable pieces.`,
          type: 'info',
        });
      }

      // Check if tasks are completed at specific times
      const completedTasks = tasks.filter((t) => t.status === 'completed');
      const eveningCompletions = completedTasks.filter((t) => {
        const hour = new Date(t.updated_at).getHours();
        return hour >= 18;
      });

      if (eveningCompletions.length > completedTasks.length * 0.6) {
        insights.push({
          icon: Clock,
          message: `You seem most productive in the evenings. Schedule important tasks accordingly!`,
          type: 'info',
        });
      }
    }

    // Expense insights
    if (expenses && expenses.length > 0) {
      const weekendExpenses = expenses.filter((e) => {
        const day = new Date(e.created_at).getDay();
        return day === 0 || day === 6;
      });
      const weekendTotal = weekendExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

      if (weekendTotal > total * 0.4) {
        insights.push({
          icon: DollarSign,
          message: `Weekend spending is higher than weekdays. Consider budgeting for leisure.`,
          type: 'warning',
        });
      }

      // Category insights
      const categoryTotals: Record<string, number> = {};
      expenses.forEach((e) => {
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
      });
      const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
      if (topCategory) {
        insights.push({
          icon: DollarSign,
          message: `${topCategory[0]} is your top spending category this month.`,
          type: 'info',
        });
      }
    }

    // Habit insights
    if (habitLogs && habitLogs.length > 0) {
      const uniqueDays = new Set(habitLogs.map((l) => l.completed_at)).size;
      if (uniqueDays >= 7) {
        insights.push({
          icon: Target,
          message: `You've been consistent with habits for ${uniqueDays} days this month. Keep it up!`,
          type: 'success',
        });
      }
    }

    // Default insight if no data
    if (insights.length === 0) {
      insights.push({
        icon: Lightbulb,
        message: `Start tracking your habits and expenses to get personalized insights.`,
        type: 'info',
      });
    }

    // Pick one random insight
    setInsight(insights[Math.floor(Math.random() * insights.length)]);
    setLoading(false);
  }

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="h-12 bg-muted/50 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!insight) return null;

  const IconComponent = insight.icon;

  return (
    <Card className={cn(
      'glass-card border-l-4',
      insight.type === 'success' && 'border-l-success',
      insight.type === 'warning' && 'border-l-accent',
      insight.type === 'info' && 'border-l-primary'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            insight.type === 'success' && 'bg-success/10 text-success',
            insight.type === 'warning' && 'bg-accent/10 text-accent',
            insight.type === 'info' && 'bg-primary/10 text-primary'
          )}>
            <IconComponent className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Insight</p>
            <p className="text-sm leading-relaxed">{insight.message}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
