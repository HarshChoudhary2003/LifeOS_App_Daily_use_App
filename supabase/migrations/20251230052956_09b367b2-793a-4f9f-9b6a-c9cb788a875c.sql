-- Create automation_rules table for IF-THEN rules
CREATE TABLE public.automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- 'habit_completed', 'task_completed', 'goal_progress', 'mood_logged', 'decision_made'
  trigger_config JSONB DEFAULT '{}',
  action_type TEXT NOT NULL, -- 'create_task', 'log_habit', 'send_notification', 'update_goal'
  action_config JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create life_templates table
CREATE TABLE public.life_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID, -- null for system templates
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general', -- 'morning_routine', 'weekly_review', 'goal_setting', 'habit_stack'
  template_data JSONB NOT NULL DEFAULT '{}',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create future_vision table for Future Self Mode
CREATE TABLE public.future_vision (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  vision_text TEXT NOT NULL,
  values TEXT[] DEFAULT '{}',
  ideal_routines JSONB DEFAULT '{}',
  target_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id) -- One vision per user
);

-- Create life_roadmap table for timeline
CREATE TABLE public.life_roadmap (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'milestone', -- 'goal', 'milestone', 'achievement'
  category TEXT DEFAULT 'personal', -- 'career', 'health', 'relationships', 'personal', 'financial'
  status TEXT NOT NULL DEFAULT 'planned', -- 'planned', 'in_progress', 'achieved'
  color TEXT DEFAULT 'blue',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.future_vision ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_roadmap ENABLE ROW LEVEL SECURITY;

-- RLS policies for automation_rules
CREATE POLICY "Users can view their own rules" ON public.automation_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own rules" ON public.automation_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own rules" ON public.automation_rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own rules" ON public.automation_rules FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for life_templates (users can see system templates + their own)
CREATE POLICY "Users can view templates" ON public.life_templates FOR SELECT USING (is_system = true OR auth.uid() = user_id);
CREATE POLICY "Users can create their own templates" ON public.life_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own templates" ON public.life_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own templates" ON public.life_templates FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for future_vision
CREATE POLICY "Users can view their own vision" ON public.future_vision FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own vision" ON public.future_vision FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own vision" ON public.future_vision FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own vision" ON public.future_vision FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for life_roadmap
CREATE POLICY "Users can view their own roadmap" ON public.life_roadmap FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own roadmap items" ON public.life_roadmap FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own roadmap items" ON public.life_roadmap FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own roadmap items" ON public.life_roadmap FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER update_automation_rules_updated_at BEFORE UPDATE ON public.automation_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_life_templates_updated_at BEFORE UPDATE ON public.life_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_future_vision_updated_at BEFORE UPDATE ON public.future_vision FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_life_roadmap_updated_at BEFORE UPDATE ON public.life_roadmap FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default system templates
INSERT INTO public.life_templates (name, description, category, template_data, is_system) VALUES
('Morning Routine', 'Start your day with intention', 'morning_routine', '{"habits": ["meditation", "exercise", "journaling"], "duration": 60}', true),
('Weekly Review', 'Reflect on your week and plan ahead', 'weekly_review', '{"tasks": ["review_goals", "plan_next_week", "celebrate_wins"], "day": "sunday"}', true),
('Goal Setting', 'SMART goal framework', 'goal_setting', '{"steps": ["specific", "measurable", "achievable", "relevant", "time_bound"]}', true),
('Habit Stack', 'Build habits by stacking them', 'habit_stack', '{"pattern": "After I [current habit], I will [new habit]"}', true);