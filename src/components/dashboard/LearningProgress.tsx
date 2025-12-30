import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, ArrowRight, Target } from 'lucide-react';

interface LearningGoal {
  id: string;
  title: string;
  progress: number;
  status: string;
}

export function LearningProgress() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchGoals();
  }, [user]);

  async function fetchGoals() {
    const { data } = await supabase
      .from('learning_goals')
      .select('id, title, progress, status')
      .eq('user_id', user!.id)
      .eq('status', 'in_progress')
      .order('updated_at', { ascending: false })
      .limit(3);

    if (data) setGoals(data);
    setLoading(false);
  }

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="h-24 bg-muted/50 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
          Learning Goals
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/learning" className="text-xs">
            View all <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {goals.length > 0 ? (
          <div className="space-y-3">
            {goals.map((goal) => (
              <div key={goal.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{goal.title}</span>
                  <span className="text-muted-foreground ml-2">{goal.progress}%</span>
                </div>
                <Progress value={goal.progress} className="h-2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-4 text-center">
            <Target className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No active goals</p>
            <Button variant="link" size="sm" asChild className="mt-1">
              <Link to="/learning">Start learning</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
