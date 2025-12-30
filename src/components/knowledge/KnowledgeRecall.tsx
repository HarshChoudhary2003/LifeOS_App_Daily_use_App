import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Brain, Send, Sparkles, Loader2 } from 'lucide-react';

export function KnowledgeRecall() {
  const { toast } = useToast();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  async function askQuestion() {
    if (!question.trim()) {
      toast({ title: 'Please enter a question', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setAnswer('');

    try {
      const { data, error } = await supabase.functions.invoke('knowledge-recall', {
        body: { question: question.trim(), action: 'ask' },
      });

      if (error) throw error;
      setAnswer(data.answer);
    } catch (error) {
      console.error('Knowledge recall error:', error);
      toast({ title: 'Failed to get answer', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function summarizeLearning() {
    setLoading(true);
    setAnswer('');
    setQuestion('');

    try {
      const { data, error } = await supabase.functions.invoke('knowledge-recall', {
        body: { action: 'summarize' },
      });

      if (error) throw error;
      setAnswer(data.answer);
    } catch (error) {
      console.error('Summarize error:', error);
      toast({ title: 'Failed to summarize', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Brain className="h-4 w-4 text-accent" />
          Knowledge Recall
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Textarea
            placeholder="Ask a question about your notes..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                askQuestion();
              }
            }}
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={askQuestion}
            disabled={loading || !question.trim()}
            className="flex-1"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Ask
          </Button>
          <Button
            variant="outline"
            onClick={summarizeLearning}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Summarize Learning
          </Button>
        </div>
        
        {answer && (
          <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
            <p className="text-sm whitespace-pre-wrap">{answer}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
