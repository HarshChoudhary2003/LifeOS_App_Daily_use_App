-- Create mood_logs table for daily mood and energy tracking
CREATE TABLE public.mood_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mood INTEGER NOT NULL,
  energy INTEGER NOT NULL,
  note TEXT,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_mood_per_day UNIQUE (user_id, logged_at)
);

-- Create validation trigger for mood_logs
CREATE OR REPLACE FUNCTION public.validate_mood_log()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mood < 1 OR NEW.mood > 5 THEN
    RAISE EXCEPTION 'Mood must be between 1 and 5';
  END IF;
  IF NEW.energy < 1 OR NEW.energy > 5 THEN
    RAISE EXCEPTION 'Energy must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_mood_log_trigger
BEFORE INSERT OR UPDATE ON public.mood_logs
FOR EACH ROW EXECUTE FUNCTION public.validate_mood_log();

-- Enable RLS for mood_logs
ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for mood_logs
CREATE POLICY "Users can view their own mood logs"
ON public.mood_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mood logs"
ON public.mood_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mood logs"
ON public.mood_logs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mood logs"
ON public.mood_logs FOR DELETE
USING (auth.uid() = user_id);

-- Create reflections table for daily reflections
CREATE TABLE public.reflections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  prompt TEXT,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for reflections
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

-- RLS policies for reflections
CREATE POLICY "Users can view their own reflections"
ON public.reflections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reflections"
ON public.reflections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reflections"
ON public.reflections FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reflections"
ON public.reflections FOR DELETE
USING (auth.uid() = user_id);