-- Public profiles for optional sharing
CREATE TABLE public.public_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  display_name text,
  bio text,
  is_public boolean DEFAULT false,
  show_task_stats boolean DEFAULT false,
  show_habit_streaks boolean DEFAULT false,
  show_expense_summary boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Teams/Family groups
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code text UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Team members
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(team_id, user_id)
);

-- Shared tasks (linked to teams)
CREATE TABLE public.shared_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text DEFAULT 'General',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Shared expenses (linked to teams)
CREATE TABLE public.shared_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  category text NOT NULL,
  note text,
  paid_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_expenses ENABLE ROW LEVEL SECURITY;

-- Public profiles policies
CREATE POLICY "Users can view public profiles"
  ON public.public_profiles FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own public profile"
  ON public.public_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own public profile"
  ON public.public_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own public profile"
  ON public.public_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Teams policies
CREATE POLICY "Team members can view their teams"
  ON public.teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team owners/admins can update teams"
  ON public.teams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners can delete teams"
  ON public.teams FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'owner'
    )
  );

-- Team members policies
CREATE POLICY "Team members can view other members"
  ON public.team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join teams"
  ON public.team_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Team owners/admins can update members"
  ON public.team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners/admins can remove members or self"
  ON public.team_members FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

-- Shared tasks policies
CREATE POLICY "Team members can view shared tasks"
  ON public.shared_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = shared_tasks.team_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create shared tasks"
  ON public.shared_tasks FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = shared_tasks.team_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can update shared tasks"
  ON public.shared_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = shared_tasks.team_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can delete shared tasks"
  ON public.shared_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = shared_tasks.team_id
      AND team_members.user_id = auth.uid()
    )
  );

-- Shared expenses policies
CREATE POLICY "Team members can view shared expenses"
  ON public.shared_expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = shared_expenses.team_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create shared expenses"
  ON public.shared_expenses FOR INSERT
  WITH CHECK (
    auth.uid() = paid_by AND
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = shared_expenses.team_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Expense creator can update"
  ON public.shared_expenses FOR UPDATE
  USING (auth.uid() = paid_by);

CREATE POLICY "Expense creator can delete"
  ON public.shared_expenses FOR DELETE
  USING (auth.uid() = paid_by);

-- Triggers for updated_at
CREATE TRIGGER update_public_profiles_updated_at
  BEFORE UPDATE ON public.public_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shared_tasks_updated_at
  BEFORE UPDATE ON public.shared_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();