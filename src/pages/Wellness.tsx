import { useState, useEffect } from 'react';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Heart, Zap, BookOpen, TrendingUp, AlertCircle, Smile, Meh, Frown, Sparkles, Sun, Moon, Cloud } from 'lucide-react';

interface MoodLog {
  id: string;
  mood: number;
  energy: number;
  note: string | null;
  logged_at: string;
}

interface Reflection {
  id: string;
  content: string;
  prompt: string | null;
  logged_at: string;
}

const MOOD_OPTIONS = [
  { value: 1, label: 'Very Low', emoji: '😔', icon: Frown, color: 'text-rose-500' },
  { value: 2, label: 'Low', emoji: '😕', icon: Frown, color: 'text-orange-500' },
  { value: 3, label: 'Neutral', emoji: '😐', icon: Meh, color: 'text-amber-500' },
  { value: 4, label: 'Good', emoji: '🙂', icon: Smile, color: 'text-emerald-500' },
  { value: 5, label: 'Great', emoji: '😊', icon: Smile, color: 'text-teal-500' },
];

const ENERGY_OPTIONS = [
  { value: 1, label: 'Exhausted', icon: Moon, color: 'text-slate-400' },
  { value: 2, label: 'Tired', icon: Cloud, color: 'text-slate-500' },
  { value: 3, label: 'Moderate', icon: Cloud, color: 'text-amber-500' },
  { value: 4, label: 'Energized', icon: Sun, color: 'text-orange-500' },
  { value: 5, label: 'Fully Charged', icon: Zap, color: 'text-amber-400' },
];

const REFLECTION_PROMPTS = [
  "What's one thing you're grateful for today?",
  "What was your biggest win today, no matter how small?",
  "What's something you learned today?",
  "How did you take care of yourself today?",
  "What made you smile today?",
  "What challenged you today, and how did you handle it?",
  "What's one thing you'd do differently tomorrow?",
];

const Wellness = () => {
  const { user } = useAuth();
  const [todayMood, setTodayMood] = useState<MoodLog | null>(null);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedEnergy, setSelectedEnergy] = useState<number | null>(null);
  const [moodNote, setMoodNote] = useState('');
  const [weeklyMoods, setWeeklyMoods] = useState<MoodLog[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [reflectionContent, setReflectionContent] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [burnoutInsights, setBurnoutInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
      setCurrentPrompt(REFLECTION_PROMPTS[Math.floor(Math.random() * REFLECTION_PROMPTS.length)]);
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

      // Fetch today's mood
      const { data: todayData } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('logged_at', today)
        .maybeSingle();

      if (todayData) {
        setTodayMood(todayData);
        setSelectedMood(todayData.mood);
        setSelectedEnergy(todayData.energy);
        setMoodNote(todayData.note || '');
      }

      // Fetch weekly moods for trends
      const { data: weeklyData } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('logged_at', weekStart)
        .lte('logged_at', weekEnd)
        .order('logged_at', { ascending: true });

      setWeeklyMoods(weeklyData || []);

      // Fetch this week's reflections
      const { data: reflectionsData } = await supabase
        .from('reflections')
        .select('*')
        .eq('user_id', user.id)
        .gte('logged_at', weekStart)
        .lte('logged_at', weekEnd)
        .order('logged_at', { ascending: false });

      setReflections(reflectionsData || []);

      // Analyze for burnout patterns (last 30 days)
      const { data: monthlyMoods } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('logged_at', thirtyDaysAgo)
        .order('logged_at', { ascending: true });

      // Fetch tasks for workload analysis
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo);

      analyzeBurnoutPatterns(monthlyMoods || [], tasks || []);
    } catch (error) {
      console.error('Error fetching wellness data:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeBurnoutPatterns = (moods: MoodLog[], tasks: any[]) => {
    const insights: string[] = [];

    if (moods.length >= 5) {
      const recentMoods = moods.slice(-7);
      const avgMood = recentMoods.reduce((sum, m) => sum + m.mood, 0) / recentMoods.length;
      const avgEnergy = recentMoods.reduce((sum, m) => sum + m.energy, 0) / recentMoods.length;

      if (avgMood < 2.5) {
        insights.push("Your mood has been lower than usual this week. Consider taking some time for activities that bring you joy.");
      }

      if (avgEnergy < 2.5) {
        insights.push("Your energy levels have been low recently. Rest and recovery might be helpful right now.");
      }

      // Check for declining trend
      if (recentMoods.length >= 3) {
        const firstHalf = recentMoods.slice(0, Math.floor(recentMoods.length / 2));
        const secondHalf = recentMoods.slice(Math.floor(recentMoods.length / 2));
        const firstAvg = firstHalf.reduce((sum, m) => sum + m.mood, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, m) => sum + m.mood, 0) / secondHalf.length;

        if (secondAvg < firstAvg - 1) {
          insights.push("There's been a downward trend in your mood. It might be a good time to pause and check in with yourself.");
        }
      }
    }

    // Task load analysis
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    if (pendingTasks > 15) {
      insights.push(`You have ${pendingTasks} pending tasks. Consider prioritizing or delegating some to reduce overwhelm.`);
    }

    setBurnoutInsights(insights);
  };

  const saveMoodLog = async () => {
    if (!user || !selectedMood || !selectedEnergy) {
      toast.error('Please select both mood and energy level');
      return;
    }

    setSaving(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      if (todayMood) {
        // Update existing
        const { error } = await supabase
          .from('mood_logs')
          .update({
            mood: selectedMood,
            energy: selectedEnergy,
            note: moodNote || null,
          })
          .eq('id', todayMood.id);

        if (error) throw error;
        toast.success('Mood updated');
      } else {
        // Create new
        const { error } = await supabase
          .from('mood_logs')
          .insert({
            user_id: user.id,
            mood: selectedMood,
            energy: selectedEnergy,
            note: moodNote || null,
            logged_at: today,
          });

        if (error) throw error;
        toast.success('Mood logged');
      }

      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save mood');
    } finally {
      setSaving(false);
    }
  };

  const saveReflection = async () => {
    if (!user || !reflectionContent.trim()) {
      toast.error('Please write a reflection');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('reflections')
        .insert({
          user_id: user.id,
          content: reflectionContent.trim(),
          prompt: currentPrompt,
          logged_at: format(new Date(), 'yyyy-MM-dd'),
        });

      if (error) throw error;
      
      toast.success('Reflection saved');
      setReflectionContent('');
      setCurrentPrompt(REFLECTION_PROMPTS[Math.floor(Math.random() * REFLECTION_PROMPTS.length)]);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save reflection');
    } finally {
      setSaving(false);
    }
  };

  const getWeeklyAverage = (field: 'mood' | 'energy') => {
    if (weeklyMoods.length === 0) return null;
    const avg = weeklyMoods.reduce((sum, m) => sum + m[field], 0) / weeklyMoods.length;
    return avg.toFixed(1);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading wellness data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Wellness"
        description="Track your mood, energy, and reflections for better self-awareness"
      />

      {/* Burnout Awareness */}
      {burnoutInsights.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span className="text-amber-800 dark:text-amber-200">Gentle Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {burnoutInsights.map((insight, i) => (
              <p key={i} className="text-sm text-amber-700 dark:text-amber-300">
                {insight}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Mood & Energy Tracking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500" />
              Daily Check-in
            </CardTitle>
            <CardDescription>
              How are you feeling today?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mood Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Mood</label>
              <div className="flex gap-2 justify-between">
                {MOOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedMood(option.value)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                      selectedMood === option.value
                        ? 'border-primary bg-primary/5 scale-105'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <span className="text-2xl">{option.emoji}</span>
                    <span className="text-xs text-muted-foreground">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Energy Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Energy Level</label>
              <div className="flex gap-2 justify-between">
                {ENERGY_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setSelectedEnergy(option.value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                        selectedEnergy === option.value
                          ? 'border-primary bg-primary/5 scale-105'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <Icon className={`h-6 w-6 ${option.color}`} />
                      <span className="text-xs text-muted-foreground">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Note */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Notes (optional)</label>
              <Textarea
                placeholder="Anything you'd like to note about today..."
                value={moodNote}
                onChange={(e) => setMoodNote(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>

            <Button 
              onClick={saveMoodLog} 
              disabled={saving || !selectedMood || !selectedEnergy}
              className="w-full"
            >
              {todayMood ? 'Update Check-in' : 'Save Check-in'}
            </Button>
          </CardContent>
        </Card>

        {/* Daily Reflection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-500" />
              Daily Reflection
            </CardTitle>
            <CardDescription>
              Take a moment to reflect on your day
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-amber-500 mt-0.5" />
                <p className="text-sm text-foreground italic">{currentPrompt}</p>
              </div>
            </div>

            <Textarea
              placeholder="Write your reflection here..."
              value={reflectionContent}
              onChange={(e) => setReflectionContent(e.target.value)}
              className="min-h-[120px] resize-none"
            />

            <Button 
              onClick={saveReflection} 
              disabled={saving || !reflectionContent.trim()}
              className="w-full"
            >
              Save Reflection
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPrompt(REFLECTION_PROMPTS[Math.floor(Math.random() * REFLECTION_PROMPTS.length)])}
              className="w-full text-muted-foreground"
            >
              Try a different prompt
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Weekly Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-3xl font-semibold text-foreground">
                  {getWeeklyAverage('mood') || '—'}
                </div>
                <div className="text-sm text-muted-foreground">Avg Mood</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-3xl font-semibold text-foreground">
                  {getWeeklyAverage('energy') || '—'}
                </div>
                <div className="text-sm text-muted-foreground">Avg Energy</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-3xl font-semibold text-foreground">
                  {weeklyMoods.length}
                </div>
                <div className="text-sm text-muted-foreground">Check-ins</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-3xl font-semibold text-foreground">
                  {reflections.length}
                </div>
                <div className="text-sm text-muted-foreground">Reflections</div>
              </div>
            </div>

            {weeklyMoods.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-sm font-medium text-foreground mb-3">Mood Trend</div>
                <div className="flex items-end gap-1 h-16">
                  {weeklyMoods.map((log, i) => (
                    <div
                      key={log.id}
                      className="flex-1 bg-primary/20 rounded-t transition-all hover:bg-primary/30"
                      style={{ height: `${(log.mood / 5) * 100}%` }}
                      title={`${format(new Date(log.logged_at), 'EEE')}: ${MOOD_OPTIONS[log.mood - 1]?.label}`}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  {weeklyMoods.map((log) => (
                    <div key={log.id} className="flex-1 text-center text-xs text-muted-foreground">
                      {format(new Date(log.logged_at), 'EEE')}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Reflections */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-500" />
              Recent Reflections
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reflections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No reflections this week yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reflections.slice(0, 3).map((reflection) => (
                  <div key={reflection.id} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1">
                      {format(new Date(reflection.logged_at), 'EEEE, MMM d')}
                    </div>
                    {reflection.prompt && (
                      <div className="text-xs text-muted-foreground italic mb-2">
                        "{reflection.prompt}"
                      </div>
                    )}
                    <p className="text-sm text-foreground line-clamp-3">
                      {reflection.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Wellness;
