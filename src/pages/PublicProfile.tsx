import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Target, CheckSquare, DollarSign, TrendingUp } from 'lucide-react';

interface PublicProfileData {
  username: string;
  display_name: string | null;
  bio: string | null;
  show_task_stats: boolean;
  show_habit_streaks: boolean;
  show_expense_summary: boolean;
  user_id: string;
}

interface ProfileStats {
  taskCompletionRate: number;
  totalTasksCompleted: number;
  habitStreaks: { name: string; streak: number }[];
  monthlyExpenseCategories: string[];
}

export default function PublicProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchPublicProfile();
  }, [username]);

  const fetchPublicProfile = async () => {
    if (!username) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const { data: profileData, error } = await supabase
      .from('public_profiles')
      .select('*')
      .eq('username', username)
      .eq('is_public', true)
      .single();

    if (error || !profileData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setProfile(profileData);

    // Fetch stats based on privacy settings
    const statsData: ProfileStats = {
      taskCompletionRate: 0,
      totalTasksCompleted: 0,
      habitStreaks: [],
      monthlyExpenseCategories: [],
    };

    if (profileData.show_task_stats) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('status')
        .eq('user_id', profileData.user_id);

      if (tasks) {
        const completed = tasks.filter(t => t.status === 'completed').length;
        statsData.totalTasksCompleted = completed;
        statsData.taskCompletionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
      }
    }

    if (profileData.show_habit_streaks) {
      const { data: habits } = await supabase
        .from('habits')
        .select('id, name')
        .eq('user_id', profileData.user_id)
        .eq('archived', false);

      if (habits) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const { data: logs } = await supabase
          .from('habit_logs')
          .select('habit_id')
          .eq('user_id', profileData.user_id)
          .gte('completed_at', thirtyDaysAgo);

        if (logs) {
          statsData.habitStreaks = habits.map(h => ({
            name: h.name,
            streak: logs.filter(l => l.habit_id === h.id).length,
          })).filter(h => h.streak > 0).slice(0, 5);
        }
      }
    }

    if (profileData.show_expense_summary) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: expenses } = await supabase
        .from('expenses')
        .select('category')
        .eq('user_id', profileData.user_id)
        .gte('created_at', startOfMonth.toISOString());

      if (expenses) {
        const categories = [...new Set(expenses.map(e => e.category))];
        statsData.monthlyExpenseCategories = categories.slice(0, 5);
      }
    }

    setStats(statsData);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
            <p className="text-muted-foreground">
              This profile doesn't exist or is set to private.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasAnyStats = profile.show_task_stats || profile.show_habit_streaks || profile.show_expense_summary;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Brain className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-1">
            {profile.display_name || `@${profile.username}`}
          </h1>
          {profile.display_name && (
            <p className="text-muted-foreground">@{profile.username}</p>
          )}
          {profile.bio && (
            <p className="mt-3 text-muted-foreground max-w-md mx-auto">{profile.bio}</p>
          )}
          <Badge variant="secondary" className="mt-4">
            LifeOS User
          </Badge>
        </div>

        {/* Stats */}
        {hasAnyStats && stats && (
          <div className="space-y-4">
            {profile.show_task_stats && (
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-primary" />
                    Productivity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{stats.taskCompletionRate}%</span>
                    <span className="text-muted-foreground">task completion rate</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stats.totalTasksCompleted} tasks completed
                  </p>
                </CardContent>
              </Card>
            )}

            {profile.show_habit_streaks && stats.habitStreaks.length > 0 && (
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Habit Streaks (Last 30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.habitStreaks.map((habit) => (
                      <div key={habit.name} className="flex items-center justify-between">
                        <span>{habit.name}</span>
                        <div className="flex items-center gap-1 text-primary">
                          <TrendingUp className="h-4 w-4" />
                          <span className="font-medium">{habit.streak} days</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {profile.show_expense_summary && stats.monthlyExpenseCategories.length > 0 && (
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Expense Categories This Month
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {stats.monthlyExpenseCategories.map((category) => (
                      <Badge key={category} variant="secondary">{category}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {!hasAnyStats && (
          <Card className="glass-card">
            <CardContent className="py-8 text-center text-muted-foreground">
              This user has chosen not to share any stats publicly.
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Powered by LifeOS</p>
        </div>
      </div>
    </div>
  );
}
