import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Sparkles, Target, Calendar, Edit2, Trash2, Loader2, 
  CheckCircle2, Clock, Star, Compass, MessageSquare 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Json } from '@/integrations/supabase/types';

interface FutureVision {
  id: string;
  vision_text: string;
  values: string[];
  ideal_routines: Record<string, unknown>;
  target_year: number | null;
}

interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  target_date: string;
  item_type: string;
  category: string;
  status: string;
  color: string;
}

const CATEGORIES = [
  { value: 'personal', label: 'Personal', color: 'bg-purple-500' },
  { value: 'career', label: 'Career', color: 'bg-blue-500' },
  { value: 'health', label: 'Health', color: 'bg-green-500' },
  { value: 'relationships', label: 'Relationships', color: 'bg-pink-500' },
  { value: 'financial', label: 'Financial', color: 'bg-amber-500' },
];

const ITEM_TYPES = [
  { value: 'goal', label: 'Goal', icon: Target },
  { value: 'milestone', label: 'Milestone', icon: Star },
  { value: 'achievement', label: 'Achievement', icon: CheckCircle2 },
];

export default function LifeVision() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vision, setVision] = useState<FutureVision | null>(null);
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [visionDialogOpen, setVisionDialogOpen] = useState(false);
  const [roadmapDialogOpen, setRoadmapDialogOpen] = useState(false);
  const [checkingAlignment, setCheckingAlignment] = useState(false);
  const [alignmentResult, setAlignmentResult] = useState<string | null>(null);
  const [visionForm, setVisionForm] = useState({
    vision_text: '',
    values: '',
    target_year: new Date().getFullYear() + 5,
  });
  const [roadmapForm, setRoadmapForm] = useState({
    title: '',
    description: '',
    target_date: '',
    item_type: 'goal',
    category: 'personal',
  });

  useEffect(() => {
    if (user) {
      fetchVision();
      fetchRoadmap();
    }
  }, [user]);

  async function fetchVision() {
    const { data, error } = await supabase
      .from('future_vision')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle();

    if (data) {
      setVision({
        ...data,
        values: data.values || [],
        ideal_routines: (data.ideal_routines as Record<string, unknown>) || {}
      });
      setVisionForm({
        vision_text: data.vision_text,
        values: (data.values || []).join(', '),
        target_year: data.target_year || new Date().getFullYear() + 5,
      });
    }
    if (error && error.code !== 'PGRST116') console.error('Error fetching vision:', error);
    setLoading(false);
  }

  async function fetchRoadmap() {
    const { data, error } = await supabase
      .from('life_roadmap')
      .select('*')
      .eq('user_id', user!.id)
      .order('target_date', { ascending: true });

    if (data) setRoadmapItems(data);
    if (error) console.error('Error fetching roadmap:', error);
  }

  async function saveVision() {
    if (!visionForm.vision_text.trim()) {
      toast({ title: 'Please describe your future vision', variant: 'destructive' });
      return;
    }

    const values = visionForm.values.split(',').map(v => v.trim()).filter(Boolean);

    const visionData = {
      user_id: user!.id,
      vision_text: visionForm.vision_text.trim(),
      values: values,
      target_year: visionForm.target_year,
      ideal_routines: {} as Json,
    };

    let error;
    if (vision) {
      ({ error } = await supabase
        .from('future_vision')
        .update(visionData)
        .eq('id', vision.id));
    } else {
      ({ error } = await supabase
        .from('future_vision')
        .insert(visionData));
    }

    if (error) {
      toast({ title: 'Failed to save vision', variant: 'destructive' });
    } else {
      toast({ title: 'Vision saved!' });
      setVisionDialogOpen(false);
      fetchVision();
    }
  }

  async function addRoadmapItem() {
    if (!roadmapForm.title.trim() || !roadmapForm.target_date) {
      toast({ title: 'Please fill in title and date', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('life_roadmap').insert({
      user_id: user!.id,
      title: roadmapForm.title.trim(),
      description: roadmapForm.description.trim() || null,
      target_date: roadmapForm.target_date,
      item_type: roadmapForm.item_type,
      category: roadmapForm.category,
      status: 'planned',
    });

    if (error) {
      toast({ title: 'Failed to add roadmap item', variant: 'destructive' });
    } else {
      toast({ title: 'Roadmap item added!' });
      setRoadmapForm({ title: '', description: '', target_date: '', item_type: 'goal', category: 'personal' });
      setRoadmapDialogOpen(false);
      fetchRoadmap();
    }
  }

  async function updateRoadmapStatus(id: string, status: string) {
    const { error } = await supabase
      .from('life_roadmap')
      .update({ status })
      .eq('id', id);

    if (!error) {
      setRoadmapItems(items => items.map(i => i.id === id ? { ...i, status } : i));
      toast({ title: status === 'achieved' ? 'Congratulations!' : 'Status updated' });
    }
  }

  async function deleteRoadmapItem(id: string) {
    const { error } = await supabase.from('life_roadmap').delete().eq('id', id);
    if (!error) {
      setRoadmapItems(items => items.filter(i => i.id !== id));
      toast({ title: 'Item deleted' });
    }
  }

  async function checkAlignment() {
    if (!vision) {
      toast({ title: 'Please define your future vision first', variant: 'destructive' });
      return;
    }

    setCheckingAlignment(true);
    setAlignmentResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('life-coach', {
        body: {
          action: 'alignment',
          vision: vision.vision_text,
          values: vision.values,
        },
      });

      if (error) throw error;
      setAlignmentResult(data.response);
    } catch (error) {
      console.error('Alignment check error:', error);
      toast({ title: 'Failed to check alignment', variant: 'destructive' });
    } finally {
      setCheckingAlignment(false);
    }
  }

  const getCategoryColor = (category: string) => 
    CATEGORIES.find(c => c.value === category)?.color || 'bg-muted';

  const getStatusIcon = (status: string) => {
    if (status === 'achieved') return <CheckCircle2 className="h-4 w-4 text-success" />;
    if (status === 'in_progress') return <Clock className="h-4 w-4 text-accent" />;
    return <Target className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Life Vision"
        description="Design your future with intention and clarity"
      />

      <Tabs defaultValue="vision" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vision">
            <Compass className="mr-2 h-4 w-4" />
            Future Self
          </TabsTrigger>
          <TabsTrigger value="roadmap">
            <Calendar className="mr-2 h-4 w-4" />
            Life Roadmap
          </TabsTrigger>
          <TabsTrigger value="reflection">
            <MessageSquare className="mr-2 h-4 w-4" />
            Reflection
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vision" className="space-y-4">
          {/* Future Vision Card */}
          <Card className="glass-card overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            <CardHeader className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-accent" />
                    Your Future Self
                  </CardTitle>
                  <CardDescription>
                    Who do you want to become? Define your vision and values.
                  </CardDescription>
                </div>
                <Dialog open={visionDialogOpen} onOpenChange={setVisionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Edit2 className="mr-2 h-4 w-4" />
                      {vision ? 'Edit' : 'Define'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Define Your Future Self</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Your Vision</Label>
                        <Textarea
                          placeholder="Describe who you want to become, what your life looks like, and what matters most to you..."
                          value={visionForm.vision_text}
                          onChange={(e) => setVisionForm({ ...visionForm, vision_text: e.target.value })}
                          rows={5}
                          className="resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Core Values (comma-separated)</Label>
                        <Input
                          placeholder="e.g., Growth, Authenticity, Balance, Creativity"
                          value={visionForm.values}
                          onChange={(e) => setVisionForm({ ...visionForm, values: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Target Year</Label>
                        <Input
                          type="number"
                          min={new Date().getFullYear()}
                          max={new Date().getFullYear() + 50}
                          value={visionForm.target_year}
                          onChange={(e) => setVisionForm({ ...visionForm, target_year: parseInt(e.target.value) })}
                        />
                      </div>
                      <Button onClick={saveVision} className="w-full">
                        Save Vision
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="relative">
              {vision ? (
                <div className="space-y-4">
                  <p className="text-foreground leading-relaxed">{vision.vision_text}</p>
                  {vision.values.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {vision.values.map((value, i) => (
                        <span key={i} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                          {value}
                        </span>
                      ))}
                    </div>
                  )}
                  {vision.target_year && (
                    <p className="text-sm text-muted-foreground">
                      Target: {vision.target_year}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground italic">
                  Take a moment to envision your future self. What kind of person do you want to become?
                </p>
              )}
            </CardContent>
          </Card>

          {/* Alignment Check */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-5 w-5 text-primary" />
                Alignment Check
              </CardTitle>
              <CardDescription>
                See how your recent actions align with your future vision
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={checkAlignment} 
                disabled={checkingAlignment || !vision}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {checkingAlignment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Check Alignment
                  </>
                )}
              </Button>
              
              {alignmentResult && (
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm whitespace-pre-line">{alignmentResult}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roadmap" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={roadmapDialogOpen} onOpenChange={setRoadmapDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Milestone
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add to Roadmap</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      placeholder="e.g., Launch my business"
                      value={roadmapForm.title}
                      onChange={(e) => setRoadmapForm({ ...roadmapForm, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Textarea
                      placeholder="More details..."
                      value={roadmapForm.description}
                      onChange={(e) => setRoadmapForm({ ...roadmapForm, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Target Date</Label>
                      <Input
                        type="date"
                        value={roadmapForm.target_date}
                        onChange={(e) => setRoadmapForm({ ...roadmapForm, target_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={roadmapForm.item_type}
                        onValueChange={(value) => setRoadmapForm({ ...roadmapForm, item_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ITEM_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={roadmapForm.category}
                      onValueChange={(value) => setRoadmapForm({ ...roadmapForm, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={addRoadmapItem} className="w-full">
                    Add to Roadmap
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Timeline */}
          {roadmapItems.length > 0 ? (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              
              <div className="space-y-4">
                {roadmapItems.map((item) => (
                  <div key={item.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className={`absolute left-2.5 w-3 h-3 rounded-full ${getCategoryColor(item.category)} ring-4 ring-background`} />
                    
                    <Card className={`glass-card transition-opacity ${item.status === 'achieved' ? 'opacity-75' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getStatusIcon(item.status)}
                              <h3 className={`font-medium ${item.status === 'achieved' ? 'line-through' : ''}`}>
                                {item.title}
                              </h3>
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span>{format(parseISO(item.target_date), 'MMM d, yyyy')}</span>
                              <span className="capitalize">{item.category}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {item.status !== 'achieved' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateRoadmapStatus(item.id, item.status === 'in_progress' ? 'achieved' : 'in_progress')}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteRoadmapItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Calendar}
              title="Your roadmap is empty"
              description="Add goals, milestones, and achievements to visualize your journey"
              action={
                <Button onClick={() => setRoadmapDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Milestone
                </Button>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="reflection" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-accent" />
                Decision Reflection Prompts
              </CardTitle>
              <CardDescription>
                Before making important decisions, consider these questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  "Will this choice bring me closer to my future self?",
                  "Does this align with my core values?",
                  "What would my future self thank me for today?",
                  "Am I choosing comfort or growth?",
                  "What's the long-term impact of this decision?",
                ].map((prompt, i) => (
                  <div key={i} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-sm">{prompt}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-accent/30">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-full bg-accent/10">
                  <Sparkles className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">Remember</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    These prompts are here to guide you, not to judge you. Every decision is an opportunity 
                    to learn and grow. Be kind to yourself on this journey.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
