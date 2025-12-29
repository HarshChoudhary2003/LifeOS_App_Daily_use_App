import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Tooltip
} from 'recharts';
import { 
  TrendingUp, 
  CheckSquare, 
  DollarSign, 
  Target,
  Calendar
} from 'lucide-react';

interface WeeklyTaskData {
  day: string;
  completed: number;
  created: number;
}

interface CategoryExpense {
  name: string;
  value: number;
}

interface MonthlyExpense {
  month: string;
  amount: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--accent))', 'hsl(var(--info))', 'hsl(var(--destructive))'];

export default function Analytics() {
  const { user } = useAuth();
  const [taskData, setTaskData] = useState<WeeklyTaskData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryExpense[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyExpense[]>([]);
  const [stats, setStats] = useState({
    weeklyCompletion: 0,
    monthlyExpenses: 0,
    habitStreak: 0,
    totalTasks: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchAnalytics();
  }, [user]);

  async function fetchAnalytics() {
    setLoading(true);

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    // Weekly task data
    const { data: tasks } = await supabase
      .from('tasks')
      .select('status, created_at, updated_at')
      .eq('user_id', user!.id)
      .gte('created_at', startOfWeek.toISOString());

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyTasks: WeeklyTaskData[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dayStr = weekDays[date.getDay()];
      const dateStr = date.toISOString().split('T')[0];

      const dayTasks = tasks?.filter((t) => 
        t.created_at.startsWith(dateStr)
      ) || [];
      const completedTasks = tasks?.filter((t) => 
        t.status === 'completed' && t.updated_at.startsWith(dateStr)
      ) || [];

      weeklyTasks.push({
        day: dayStr,
        created: dayTasks.length,
        completed: completedTasks.length,
      });
    }
    setTaskData(weeklyTasks);

    // Calculate weekly completion rate
    const allWeekTasks = tasks || [];
    const completedCount = allWeekTasks.filter((t) => t.status === 'completed').length;
    const completionRate = allWeekTasks.length > 0 
      ? Math.round((completedCount / allWeekTasks.length) * 100) 
      : 0;

    // Monthly expense data (last 6 months)
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, category, created_at')
      .eq('user_id', user!.id)
      .gte('created_at', sixMonthsAgo.toISOString());

    // Group by month
    const monthlyExpenses: Record<string, number> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyExpenses[monthKey] = 0;
    }

    expenses?.forEach((e) => {
      const monthKey = e.created_at.substring(0, 7);
      if (monthlyExpenses[monthKey] !== undefined) {
        monthlyExpenses[monthKey] += Number(e.amount);
      }
    });

    setMonthlyData(
      Object.entries(monthlyExpenses).map(([key, amount]) => {
        const [year, month] = key.split('-');
        return {
          month: monthNames[parseInt(month) - 1],
          amount,
        };
      })
    );

    // Category breakdown (this month)
    const startOfMonth = new Date(now);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthExpenses = expenses?.filter((e) => 
      new Date(e.created_at) >= startOfMonth
    ) || [];

    const categoryTotals: Record<string, number> = {};
    thisMonthExpenses.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
    });

    setCategoryData(
      Object.entries(categoryTotals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
    );

    const monthlyTotal = thisMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Habit streak
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: habitLogs } = await supabase
      .from('habit_logs')
      .select('completed_at')
      .eq('user_id', user!.id)
      .gte('completed_at', thirtyDaysAgo.toISOString().split('T')[0]);

    const uniqueDays = new Set(habitLogs?.map((l) => l.completed_at) || []).size;

    setStats({
      weeklyCompletion: completionRate,
      monthlyExpenses: monthlyTotal,
      habitStreak: uniqueDays,
      totalTasks: allWeekTasks.length,
    });

    setLoading(false);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Analytics"
        description="Insights into your productivity and spending"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <CheckSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.weeklyCompletion}%</p>
                <p className="text-xs text-muted-foreground">Weekly completion</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <DollarSign className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-semibold">${stats.monthlyExpenses.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">This month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <Target className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.habitStreak}</p>
                <p className="text-xs text-muted-foreground">Habit days (30d)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                <Calendar className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.totalTasks}</p>
                <p className="text-xs text-muted-foreground">Tasks this week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Weekly Tasks Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Weekly Task Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-48 bg-muted/50 rounded animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={taskData}>
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Completed" />
                  <Bar dataKey="created" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} name="Created" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly Expenses Trend */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Monthly Spending Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-48 bg-muted/50 rounded animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="hsl(var(--accent))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--accent))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense Categories */}
      {categoryData.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Spending by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {categoryData.map((cat, index) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm">{cat.name}</span>
                    </div>
                    <span className="text-sm font-medium">${cat.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
