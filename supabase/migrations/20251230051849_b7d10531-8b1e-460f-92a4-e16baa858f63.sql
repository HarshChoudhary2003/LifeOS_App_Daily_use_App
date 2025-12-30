-- Create learning_goals table
CREATE TABLE public.learning_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress',
  progress INTEGER NOT NULL DEFAULT 0,
  target_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on learning_goals
ALTER TABLE public.learning_goals ENABLE ROW LEVEL SECURITY;

-- RLS policies for learning_goals
CREATE POLICY "Users can view their own learning goals" 
ON public.learning_goals FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own learning goals" 
ON public.learning_goals FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning goals" 
ON public.learning_goals FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own learning goals" 
ON public.learning_goals FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_learning_goals_updated_at
BEFORE UPDATE ON public.learning_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create note_links table for smart linking
CREATE TABLE public.note_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  linked_type TEXT NOT NULL,
  linked_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on note_links
ALTER TABLE public.note_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for note_links
CREATE POLICY "Users can view their own note links" 
ON public.note_links FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own note links" 
ON public.note_links FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own note links" 
ON public.note_links FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX idx_note_links_note_id ON public.note_links(note_id);
CREATE INDEX idx_note_links_linked ON public.note_links(linked_type, linked_id);