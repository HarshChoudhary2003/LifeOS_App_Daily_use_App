import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckSquare, DollarSign, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  icon: typeof Bell;
  message: string;
  link: string;
  type: 'task' | 'expense' | 'general';
}

export function SmartNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) checkNotifications();
  }, [user]);

  async function checkNotifications() {
    setLoading(true);
    const notifs: Notification[] = [];

    // Check for old pending tasks
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: oldTasks } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('user_id', user!.id)
      .eq('status', 'pending')
      .lt('created_at', sevenDaysAgo.toISOString())
      .limit(3);

    if (oldTasks && oldTasks.length > 0) {
      notifs.push({
        id: 'old-tasks',
        icon: CheckSquare,
        message: `You have ${oldTasks.length} task${oldTasks.length > 1 ? 's' : ''} waiting for over a week`,
        link: '/tasks',
        type: 'task',
      });
    }

    // Check spending this week vs average
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfLastMonth = new Date();
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);

    const { data: thisWeekExpenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', user!.id)
      .gte('created_at', startOfWeek.toISOString());

    const { data: monthExpenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', user!.id)
      .gte('created_at', startOfLastMonth.toISOString());

    if (thisWeekExpenses && monthExpenses && monthExpenses.length > 0) {
      const weekTotal = thisWeekExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const monthTotal = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const weeklyAvg = monthTotal / 4;

      if (weekTotal > weeklyAvg * 1.5) {
        notifs.push({
          id: 'high-spending',
          icon: DollarSign,
          message: `Spending this week is 50% higher than your average`,
          link: '/expenses',
          type: 'expense',
        });
      }
    }

    // Check for many pending tasks
    const { data: pendingTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('user_id', user!.id)
      .eq('status', 'pending');

    if (pendingTasks && pendingTasks.length >= 10) {
      notifs.push({
        id: 'many-tasks',
        icon: CheckSquare,
        message: `You have ${pendingTasks.length} pending tasks. Consider prioritizing`,
        link: '/tasks',
        type: 'task',
      });
    }

    setNotifications(notifs);
    setLoading(false);
  }

  function dismiss(id: string) {
    setDismissed([...dismissed, id]);
  }

  const visibleNotifications = notifications.filter((n) => !dismissed.includes(n.id));

  if (loading || visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {visibleNotifications.map((notif) => {
        const IconComponent = notif.icon;

        return (
          <Card key={notif.id} className={cn(
            'glass-card overflow-hidden animate-slide-up',
            notif.type === 'task' && 'border-l-2 border-l-primary',
            notif.type === 'expense' && 'border-l-2 border-l-accent'
          )}>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  notif.type === 'task' && 'bg-primary/10 text-primary',
                  notif.type === 'expense' && 'bg-accent/10 text-accent'
                )}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <p className="flex-1 text-sm">{notif.message}</p>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={notif.link}>View</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => dismiss(notif.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
