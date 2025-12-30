-- Create time blocks table for calendar-style planning
CREATE TABLE public.time_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  category TEXT DEFAULT 'General',
  color TEXT DEFAULT 'blue',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create focus sessions table
CREATE TABLE public.focus_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  category TEXT DEFAULT 'General',
  duration_minutes INTEGER NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for time_blocks
CREATE POLICY "Users can view their own time blocks" 
ON public.time_blocks FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own time blocks" 
ON public.time_blocks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time blocks" 
ON public.time_blocks FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time blocks" 
ON public.time_blocks FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for focus_sessions
CREATE POLICY "Users can view their own focus sessions" 
ON public.focus_sessions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own focus sessions" 
ON public.focus_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own focus sessions" 
ON public.focus_sessions FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own focus sessions" 
ON public.focus_sessions FOR DELETE 
USING (auth.uid() = user_id);

-- Add updated_at trigger for time_blocks
CREATE TRIGGER update_time_blocks_updated_at
BEFORE UPDATE ON public.time_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();