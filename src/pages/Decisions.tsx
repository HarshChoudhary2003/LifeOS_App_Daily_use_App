import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Scale, ThumbsUp, ThumbsDown, Lightbulb, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Decision {
  id: string;
  question: string;
  context: string | null;
  pros: string[] | null;
  cons: string[] | null;
  recommendation: string | null;
  status: string;
  created_at: string;
}

export default function Decisions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [formData, setFormData] = useState({
    question: '',
    context: '',
  });

  useEffect(() => {
    if (user) fetchDecisions();
  }, [user]);

  async function fetchDecisions() {
    setLoading(true);
    const { data, error } = await supabase
      .from('decisions')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (data) setDecisions(data);
    if (error) console.error('Error fetching decisions:', error);
    setLoading(false);
  }

  async function analyzeDecision() {
    if (!formData.question.trim()) {
      toast({ title: 'Please enter a decision question', variant: 'destructive' });
      return;
    }

    setAnalyzing(true);

    // Simulate AI analysis - in production, this would call an edge function
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockPros = [
      'Could lead to personal growth and new experiences',
      'Aligns with your long-term goals',
      'Has potential for positive outcomes',
    ];
    
    const mockCons = [
      'May require significant time investment',
      'Some uncertainty about the outcome',
      'Could involve trade-offs with other priorities',
    ];

    const mockRecommendation = 
      'Based on the analysis, this decision seems to have more potential benefits than drawbacks. Consider making a small step forward to test the waters before fully committing.';

    const { error } = await supabase.from('decisions').insert({
      user_id: user!.id,
      question: formData.question.trim(),
      context: formData.context.trim() || null,
      pros: mockPros,
      cons: mockCons,
      recommendation: mockRecommendation,
      status: 'pending',
    });

    if (error) {
      toast({ title: 'Failed to save decision', variant: 'destructive' });
    } else {
      toast({ title: 'Decision analyzed!' });
      setFormData({ question: '', context: '' });
      setDialogOpen(false);
      fetchDecisions();
    }

    setAnalyzing(false);
  }

  async function deleteDecision(id: string) {
    const { error } = await supabase.from('decisions').delete().eq('id', id);
    if (!error) {
      setDecisions(decisions.filter(d => d.id !== id));
      toast({ title: 'Decision deleted' });
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <PageHeader
        title="Decisions"
        description="Think through what matters"
        action={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">New Decision</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>What are you deciding?</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="question">Your question</Label>
                  <Input
                    id="question"
                    placeholder="e.g., Should I take this new job?"
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="context">Context (optional)</Label>
                  <Textarea
                    id="context"
                    placeholder="What's the situation? What matters most to you?"
                    value={formData.context}
                    onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                    rows={3}
                  />
                </div>
                <Button onClick={analyzeDecision} className="w-full" disabled={analyzing}>
                  {analyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {analyzing ? 'Thinking...' : 'Help Me Decide'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Decisions List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="glass-card">
              <CardContent className="p-6">
                <div className="h-32 bg-muted/50 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : decisions.length > 0 ? (
        <div className="space-y-4 stagger-children">
          {decisions.map((decision) => (
            <Card key={decision.id} className="glass-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{decision.question}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(decision.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => deleteDecision(decision.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {decision.context && (
                  <p className="text-sm text-muted-foreground">{decision.context}</p>
                )}
                
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Pros */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-success">
                      <ThumbsUp className="h-4 w-4" />
                      Pros
                    </div>
                    <ul className="space-y-1.5">
                      {decision.pros?.map((pro, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-success shrink-0">•</span>
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Cons */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                      <ThumbsDown className="h-4 w-4" />
                      Cons
                    </div>
                    <ul className="space-y-1.5">
                      {decision.cons?.map((con, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-destructive shrink-0">•</span>
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommendation */}
                {decision.recommendation && (
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center gap-2 text-sm font-medium text-accent mb-2">
                      <Lightbulb className="h-4 w-4" />
                      Recommendation
                    </div>
                    <p className="text-sm text-muted-foreground">{decision.recommendation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Scale}
          title="Big choice ahead?"
          description="Break it down. See the pros and cons clearly."
          action={
            <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Think Through a Decision
            </Button>
          }
        />
      )}
    </div>
  );
}
