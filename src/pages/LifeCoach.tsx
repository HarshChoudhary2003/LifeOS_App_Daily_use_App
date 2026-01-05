import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle, Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const suggestedQuestions = [
  "Why am I unproductive lately?",
  "What should I focus on this week?",
  "How can I improve my routine?",
  "What patterns do you see in my spending?",
  "Which habits should I prioritize?",
];

export default function LifeCoach() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/life-coach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          message: messageText,
          conversationHistory: messages.slice(-10),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                if (updated[updated.length - 1]?.role === 'assistant') {
                  updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                }
                return updated;
              });
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
      setMessages(prev => {
        if (prev[prev.length - 1]?.role === 'assistant' && prev[prev.length - 1]?.content === '') {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        setIsTranscribing(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-to-text`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ audio: base64Audio }),
            });

            if (!response.ok) {
              throw new Error('Failed to transcribe audio');
            }

            const { text, error } = await response.json();
            if (error) throw new Error(error);
            
            if (text) {
              setInput(prev => prev ? `${prev} ${text}` : text);
            }
            setIsTranscribing(false);
          };
        } catch (error) {
          console.error('Transcription error:', error);
          toast({
            title: 'Transcription Error',
            description: 'Failed to transcribe your voice. Please try again.',
            variant: 'destructive',
          });
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Microphone error:', error);
      toast({
        title: 'Microphone Error',
        description: 'Could not access your microphone. Please check permissions.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] flex flex-col">
      <PageHeader
        title="AI Life Coach"
        description="Get personalized insights based on your tasks, habits, and spending"
      />

      <Card className="flex-1 flex flex-col overflow-hidden glass-card">
        {/* Disclaimer */}
        <div className="px-3 py-2 md:px-4 bg-muted/50 border-b border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span className="line-clamp-1">AI coach provides suggestions only. Consult professionals for medical, legal, or financial advice.</span>
        </div>

        {/* Messages area */}
        <ScrollArea className="flex-1 p-3 md:p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-2 md:px-4">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 md:mb-4">
                <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              </div>
              <h3 className="text-base md:text-lg font-medium mb-2">Welcome to your AI Life Coach</h3>
              <p className="text-muted-foreground text-xs md:text-sm mb-4 md:mb-6 max-w-md">
                I have access to your tasks, habits, expenses, and decisions. 
                Ask me anything about improving your productivity, routines, or life balance.
              </p>
              <div className="flex flex-wrap gap-1.5 md:gap-2 justify-center max-w-lg">
                {suggestedQuestions.map((question) => (
                  <button
                    key={question}
                    onClick={() => sendMessage(question)}
                    className="px-2.5 py-1.5 md:px-3 md:py-1.5 text-xs md:text-sm bg-secondary hover:bg-secondary/80 rounded-full transition-colors text-secondary-foreground"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 md:gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] md:max-w-[80%] px-3 py-2 md:px-4 md:py-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    }`}
                  >
                    <p className="text-xs md:text-sm whitespace-pre-wrap leading-relaxed">{msg.content || '...'}</p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <User className="h-3.5 w-3.5 md:h-4 md:w-4 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-2 md:gap-3 justify-start">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                  </div>
                  <div className="bg-muted px-3 py-2 md:px-4 md:py-3 rounded-2xl rounded-bl-md">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input area */}
        <form onSubmit={handleSubmit} className="p-3 md:p-4 border-t border-border/50">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isTranscribing ? "Transcribing..." : "Ask your life coach anything..."}
              className="min-h-[40px] md:min-h-[44px] max-h-24 md:max-h-32 resize-none text-sm md:text-base"
              disabled={isLoading || isTranscribing}
            />
            <Button
              type="button"
              size="icon"
              variant={isRecording ? "destructive" : "outline"}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading || isTranscribing}
              className="shrink-0 h-10 w-10 md:h-11 md:w-11"
            >
              {isTranscribing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading || isTranscribing}
              className="shrink-0 h-10 w-10 md:h-11 md:w-11"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {isRecording && (
            <p className="text-xs text-destructive mt-2 animate-pulse flex items-center gap-1.5">
              <span className="w-2 h-2 bg-destructive rounded-full" />
              Recording... Tap to stop
            </p>
          )}
        </form>
      </Card>
    </div>
  );
}
