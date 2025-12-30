import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CategoryBadge } from '@/components/ui/category-badge';
import { WeeklySummary } from '@/components/dashboard/WeeklySummary';
import { HabitStreaks } from '@/components/dashboard/HabitStreaks';
import { SmartInsight } from '@/components/dashboard/SmartInsight';
import { SmartNotifications } from '@/components/dashboard/SmartNotifications';
import { LearningProgress } from '@/components/dashboard/LearningProgress';
import { 
  CheckSquare, 
  DollarSign, 
  ArrowRight, 
  Sparkles,
  Circle 
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  category: string;
  status: string;
}

const focusMessages = [
  "Focus on completing your important tasks today. Small wins matter.",
  "Take it one step at a time. Progress is progress, no matter how small.",
  "Your future self will thank you for the decisions you make today.",
  "Clear mind, clear focus. You've got this.",
  "Every task completed is a step toward your goals.",
];

export default function Dashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [focusMessage] = useState(() => 
    focusMessages[Math.floor(Math.random() * focusMessages.length)]
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  async function fetchData() {
    setLoading(true);
    
    // Fetch pending tasks (top 3)
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user!.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(3);

    if (tasksData) {
      setTasks(tasksData);
    }

    // Fetch this month's expenses
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: expensesData } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', user!.id)
      .gte('created_at', startOfMonth.toISOString());

    if (expensesData) {
      const total = expensesData.reduce((sum, exp) => sum + Number(exp.amount), 0);
      setMonthlyExpenses(total);
    }

    setLoading(false);
  }

  async function toggleTask(taskId: string) {
    await supabase
      .from('tasks')
      .update({ status: 'completed' })
      .eq('id', taskId);
    
    setTasks(tasks.filter(t => t.id !== taskId));
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title={greeting()}
        description="Here's your daily overview"
      />

      {/* Smart Notifications */}
      <SmartNotifications />

      {/* Focus Message */}
      <Card className="glass-card overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Daily Focus</p>
              <p className="text-foreground leading-relaxed">{focusMessage}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Insight */}
      <SmartInsight />

      {/* Weekly Summary + Habits + Learning Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <WeeklySummary />
        <HabitStreaks />
        <LearningProgress />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Tasks Overview */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
              Pending Tasks
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/tasks" className="text-xs">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />
                ))}
              </div>
            ) : tasks.length > 0 ? (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-smooth"
                  >
                    <Checkbox
                      checked={false}
                      onCheckedChange={() => toggleTask(task.id)}
                      className="shrink-0"
                    />
                    <span className="flex-1 text-sm truncate">{task.title}</span>
                    <CategoryBadge category={task.category} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-center">
                <Circle className="h-8 w-8 text-success mb-2" />
                <p className="text-sm text-muted-foreground">All caught up!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses Overview */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              This Month
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/expenses" className="text-xs">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-16 bg-muted/50 rounded animate-pulse" />
            ) : (
              <div className="py-4">
                <p className="text-3xl font-semibold tracking-tight">
                  ${monthlyExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Total expenses this month
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
