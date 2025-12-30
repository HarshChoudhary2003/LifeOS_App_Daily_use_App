import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Zap, Play, Pause, Trash2, FileText, Wand2, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Json } from '@/integrations/supabase/types';

interface AutomationRule {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

interface LifeTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  template_data: Record<string, unknown>;
  is_system: boolean;
}

const TRIGGER_OPTIONS = [
  { value: 'habit_completed', label: 'When a habit is completed' },
  { value: 'task_completed', label: 'When a task is completed' },
  { value: 'goal_progress', label: 'When goal progress changes' },
  { value: 'mood_logged', label: 'When mood is logged' },
  { value: 'decision_made', label: 'When a decision is made' },
];

const ACTION_OPTIONS = [
  { value: 'create_task', label: 'Create a new task' },
  { value: 'log_habit', label: 'Log a habit completion' },
  { value: 'send_notification', label: 'Send a notification' },
  { value: 'update_goal', label: 'Update goal progress' },
];

export default function Automation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [templates, setTemplates] = useState<LifeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    trigger_type: '',
    action_type: '',
    action_value: '',
  });

  useEffect(() => {
    if (user) {
      fetchRules();
      fetchTemplates();
    }
  }, [user]);

  async function fetchRules() {
    const { data, error } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (data) {
      setRules(data.map(rule => ({
        ...rule,
        trigger_config: (rule.trigger_config as Record<string, unknown>) || {},
        action_config: (rule.action_config as Record<string, unknown>) || {}
      })));
    }
    if (error) console.error('Error fetching rules:', error);
    setLoading(false);
  }

  async function fetchTemplates() {
    const { data, error } = await supabase
      .from('life_templates')
      .select('*')
      .order('is_system', { ascending: false });

    if (data) {
      setTemplates(data.map(t => ({
        ...t,
        template_data: (t.template_data as Record<string, unknown>) || {}
      })));
    }
    if (error) console.error('Error fetching templates:', error);
  }

  async function createRule() {
    if (!formData.name.trim() || !formData.trigger_type || !formData.action_type) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('automation_rules').insert({
      user_id: user!.id,
      name: formData.name.trim(),
      trigger_type: formData.trigger_type,
      trigger_config: {} as Json,
      action_type: formData.action_type,
      action_config: { value: formData.action_value } as Json,
      is_active: true,
    });

    if (error) {
      toast({ title: 'Failed to create rule', variant: 'destructive' });
    } else {
      toast({ title: 'Automation rule created!' });
      setFormData({ name: '', trigger_type: '', action_type: '', action_value: '' });
      setDialogOpen(false);
      fetchRules();
    }
  }

  async function toggleRule(id: string, isActive: boolean) {
    const { error } = await supabase
      .from('automation_rules')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (!error) {
      setRules(rules.map(r => r.id === id ? { ...r, is_active: !isActive } : r));
      toast({ title: isActive ? 'Rule paused' : 'Rule activated' });
    }
  }

  async function deleteRule(id: string) {
    const { error } = await supabase.from('automation_rules').delete().eq('id', id);
    if (!error) {
      setRules(rules.filter(r => r.id !== id));
      toast({ title: 'Rule deleted' });
    }
  }

  async function generateAutoTasks() {
    setGenerating(true);
    
    // Fetch recent decisions and goals to generate tasks from
    const [decisionsRes, goalsRes, reflectionsRes] = await Promise.all([
      supabase.from('decisions').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('learning_goals').select('*').eq('user_id', user!.id).eq('status', 'in_progress').limit(5),
      supabase.from('reflections').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(3),
    ]);

    const decisions = decisionsRes.data || [];
    const goals = goalsRes.data || [];
    const reflections = reflectionsRes.data || [];

    // Generate suggested tasks based on decisions and goals
    const suggestedTasks: { title: string; source: string; category: string }[] = [];

    decisions.filter(d => d.status === 'pending').forEach(d => {
      suggestedTasks.push({
        title: `Research more about: ${d.question.substring(0, 50)}...`,
        source: 'Decision',
        category: 'Personal',
      });
    });

    goals.forEach(g => {
      suggestedTasks.push({
        title: `Work on: ${g.title}`,
        source: 'Learning Goal',
        category: 'Learning',
      });
    });

    reflections.forEach(r => {
      if (r.content.toLowerCase().includes('want to') || r.content.toLowerCase().includes('should')) {
        suggestedTasks.push({
          title: `Follow up on reflection: ${r.content.substring(0, 40)}...`,
          source: 'Reflection',
          category: 'Personal',
        });
      }
    });

    if (suggestedTasks.length > 0) {
      // Create the first 3 suggested tasks
      const tasksToCreate = suggestedTasks.slice(0, 3);
      
      for (const task of tasksToCreate) {
        await supabase.from('tasks').insert({
          user_id: user!.id,
          title: task.title,
          category: task.category,
          status: 'pending',
        });
      }

      toast({ title: `Created ${tasksToCreate.length} auto-generated tasks!` });
    } else {
      toast({ title: 'No tasks to generate from your recent activity' });
    }

    setGenerating(false);
  }

  async function applyTemplate(template: LifeTemplate) {
    const data = template.template_data;
    
    if (template.category === 'morning_routine' && Array.isArray(data.habits)) {
      for (const habitName of data.habits as string[]) {
        await supabase.from('habits').insert({
          user_id: user!.id,
          name: habitName.charAt(0).toUpperCase() + habitName.slice(1),
          frequency: 'daily',
        });
      }
      toast({ title: 'Morning routine habits created!' });
    } else if (template.category === 'weekly_review' && Array.isArray(data.tasks)) {
      for (const taskName of data.tasks as string[]) {
        await supabase.from('tasks').insert({
          user_id: user!.id,
          title: taskName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          category: 'Personal',
        });
      }
      toast({ title: 'Weekly review tasks created!' });
    } else if (template.category === 'goal_setting') {
      toast({ title: 'Goal setting framework applied! Create goals in the Learning section.' });
    } else {
      toast({ title: 'Template applied!' });
    }
  }

  const getTriggerLabel = (type: string) => TRIGGER_OPTIONS.find(t => t.value === type)?.label || type;
  const getActionLabel = (type: string) => ACTION_OPTIONS.find(a => a.value === type)?.label || type;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Automation"
        description="Automate your life with simple rules and templates"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Rule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Automation Rule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Rule Name</Label>
                  <Input
                    placeholder="e.g., After workout, drink water"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="p-4 rounded-lg bg-muted/50 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="px-2 py-1 rounded bg-primary/10 text-primary">IF</span>
                    <span className="text-muted-foreground">this happens...</span>
                  </div>
                  <Select
                    value={formData.trigger_type}
                    onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="p-4 rounded-lg bg-muted/50 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="px-2 py-1 rounded bg-accent/10 text-accent">THEN</span>
                    <span className="text-muted-foreground">do this...</span>
                  </div>
                  <Select
                    value={formData.action_type}
                    onValueChange={(value) => setFormData({ ...formData, action_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {formData.action_type === 'create_task' && (
                    <Input
                      placeholder="Task title..."
                      value={formData.action_value}
                      onChange={(e) => setFormData({ ...formData, action_value: e.target.value })}
                    />
                  )}
                </div>

                <Button onClick={createRule} className="w-full">
                  Create Rule
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">
            <Zap className="mr-2 h-4 w-4" />
            Rules
          </TabsTrigger>
          <TabsTrigger value="auto-tasks">
            <Wand2 className="mr-2 h-4 w-4" />
            Auto Tasks
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="mr-2 h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="glass-card">
                  <CardContent className="p-6">
                    <div className="h-16 bg-muted/50 rounded animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : rules.length > 0 ? (
            <div className="space-y-3">
              {rules.map((rule) => (
                <Card key={rule.id} className={`glass-card transition-opacity ${!rule.is_active ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{rule.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          <span className="text-primary">IF</span> {getTriggerLabel(rule.trigger_type)}{' '}
                          <span className="text-accent">THEN</span> {getActionLabel(rule.action_type)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={() => toggleRule(rule.id, rule.is_active)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Zap}
              title="No automation rules"
              description="Create IF-THEN rules to automate your life"
              action={
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Rule
                </Button>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="auto-tasks" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                Generate Tasks from Your Activity
              </CardTitle>
              <CardDescription>
                Automatically create tasks based on your decisions, goals, and reflections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={generateAutoTasks} disabled={generating} className="w-full sm:w-auto">
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Auto Tasks
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                This will analyze your recent decisions, learning goals, and reflections to suggest actionable tasks.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id} className="glass-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription className="mt-1">{template.description}</CardDescription>
                    </div>
                    {template.is_system && (
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                        Built-in
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyTemplate(template)}
                    className="w-full"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Apply Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
