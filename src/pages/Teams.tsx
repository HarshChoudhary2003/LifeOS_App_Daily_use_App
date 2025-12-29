import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, Copy, UserPlus, Trash2, CheckSquare, DollarSign, LogOut } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_by: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

interface SharedTask {
  id: string;
  title: string;
  status: string;
  category: string;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
}

interface SharedExpense {
  id: string;
  amount: number;
  category: string;
  note: string | null;
  paid_by: string;
  created_at: string;
}

export default function Teams() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [sharedTasks, setSharedTasks] = useState<SharedTask[]>([]);
  const [sharedExpenses, setSharedExpenses] = useState<SharedExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);
  const [addExpenseDialogOpen, setAddExpenseDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState('');
  const [newExpenseNote, setNewExpenseNote] = useState('');

  useEffect(() => {
    fetchTeams();
  }, [user]);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamDetails(selectedTeam.id);
    }
  }, [selectedTeam]);

  const fetchTeams = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching teams:', error);
    } else {
      setTeams(data || []);
      if (data && data.length > 0 && !selectedTeam) {
        setSelectedTeam(data[0]);
      }
    }
    setLoading(false);
  };

  const fetchTeamDetails = async (teamId: string) => {
    const [membersRes, tasksRes, expensesRes] = await Promise.all([
      supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId),
      supabase
        .from('shared_tasks')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false }),
      supabase
        .from('shared_expenses')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false }),
    ]);

    if (membersRes.data) setMembers(membersRes.data);
    if (tasksRes.data) setSharedTasks(tasksRes.data);
    if (expensesRes.data) setSharedExpenses(expensesRes.data);
  };

  const createTeam = async () => {
    if (!user || !newTeamName.trim()) return;

    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: newTeamName.trim(),
        description: newTeamDescription.trim() || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (teamError) {
      toast({ title: 'Error', description: 'Failed to create team', variant: 'destructive' });
      return;
    }

    // Add creator as owner
    await supabase.from('team_members').insert({
      team_id: teamData.id,
      user_id: user.id,
      role: 'owner',
    });

    toast({ title: 'Team created', description: `${newTeamName} is ready` });
    setNewTeamName('');
    setNewTeamDescription('');
    setCreateDialogOpen(false);
    fetchTeams();
    setSelectedTeam(teamData);
  };

  const joinTeam = async () => {
    if (!user || !inviteCode.trim()) return;

    // Find team by invite code
    const { data: teamData, error: findError } = await supabase
      .from('teams')
      .select('*')
      .eq('invite_code', inviteCode.trim().toLowerCase())
      .single();

    if (findError || !teamData) {
      toast({ title: 'Invalid code', description: 'No team found with this invite code', variant: 'destructive' });
      return;
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamData.id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      toast({ title: 'Already a member', description: 'You are already in this team' });
      setJoinDialogOpen(false);
      return;
    }

    const { error: joinError } = await supabase.from('team_members').insert({
      team_id: teamData.id,
      user_id: user.id,
      role: 'member',
    });

    if (joinError) {
      toast({ title: 'Error', description: 'Failed to join team', variant: 'destructive' });
      return;
    }

    toast({ title: 'Joined team', description: `Welcome to ${teamData.name}` });
    setInviteCode('');
    setJoinDialogOpen(false);
    fetchTeams();
  };

  const leaveTeam = async (teamId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to leave team', variant: 'destructive' });
      return;
    }

    toast({ title: 'Left team' });
    setSelectedTeam(null);
    fetchTeams();
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Copied', description: 'Invite code copied to clipboard' });
  };

  const addSharedTask = async () => {
    if (!user || !selectedTeam || !newTaskTitle.trim()) return;

    const { error } = await supabase.from('shared_tasks').insert({
      team_id: selectedTeam.id,
      title: newTaskTitle.trim(),
      created_by: user.id,
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to add task', variant: 'destructive' });
      return;
    }

    toast({ title: 'Task added' });
    setNewTaskTitle('');
    setAddTaskDialogOpen(false);
    fetchTeamDetails(selectedTeam.id);
  };

  const toggleTaskStatus = async (task: SharedTask) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const { error } = await supabase
      .from('shared_tasks')
      .update({ status: newStatus })
      .eq('id', task.id);

    if (!error && selectedTeam) {
      fetchTeamDetails(selectedTeam.id);
    }
  };

  const deleteSharedTask = async (taskId: string) => {
    const { error } = await supabase.from('shared_tasks').delete().eq('id', taskId);
    if (!error && selectedTeam) {
      fetchTeamDetails(selectedTeam.id);
    }
  };

  const addSharedExpense = async () => {
    if (!user || !selectedTeam || !newExpenseAmount || !newExpenseCategory.trim()) return;

    const { error } = await supabase.from('shared_expenses').insert({
      team_id: selectedTeam.id,
      amount: parseFloat(newExpenseAmount),
      category: newExpenseCategory.trim(),
      note: newExpenseNote.trim() || null,
      paid_by: user.id,
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to add expense', variant: 'destructive' });
      return;
    }

    toast({ title: 'Expense added' });
    setNewExpenseAmount('');
    setNewExpenseCategory('');
    setNewExpenseNote('');
    setAddExpenseDialogOpen(false);
    fetchTeamDetails(selectedTeam.id);
  };

  const deleteSharedExpense = async (expenseId: string) => {
    const { error } = await supabase.from('shared_expenses').delete().eq('id', expenseId);
    if (!error && selectedTeam) {
      fetchTeamDetails(selectedTeam.id);
    }
  };

  const getUserRole = () => {
    return members.find(m => m.user_id === user?.id)?.role || 'member';
  };

  const totalSharedExpenses = sharedExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Family & Teams"
        description="Collaborate on shared tasks and expenses"
        action={
          <div className="flex gap-2">
            <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Join Team
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join a Team</DialogTitle>
                  <DialogDescription>Enter the invite code shared with you</DialogDescription>
                </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Invite Code</Label>
                  <Input
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="abc123def456"
                  />
                </div>
                <Button onClick={joinTeam} className="w-full">Join Team</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a Team</DialogTitle>
                <DialogDescription>Start a family or team group</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Team Name</Label>
                  <Input
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Family, Roommates, Work Team..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                    placeholder="What is this team for?"
                  />
                </div>
                <Button onClick={createTeam} className="w-full">Create Team</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        }
      />

      {teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No teams yet"
          description="Create a team to share tasks and expenses with family or colleagues"
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Team list sidebar */}
          <div className="space-y-2">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => setSelectedTeam(team)}
                className={`w-full text-left p-3 rounded-lg transition-smooth ${
                  selectedTeam?.id === team.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card hover:bg-muted'
                }`}
              >
                <div className="font-medium">{team.name}</div>
                {team.description && (
                  <div className={`text-xs mt-1 ${
                    selectedTeam?.id === team.id ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  }`}>
                    {team.description}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Team details */}
          {selectedTeam && (
            <div className="space-y-6">
              {/* Team header */}
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{selectedTeam.name}</CardTitle>
                      <CardDescription>{selectedTeam.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyInviteCode(selectedTeam.invite_code)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Invite Code
                      </Button>
                      {getUserRole() !== 'owner' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => leaveTeam(selectedTeam.id)}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Leave
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {members.length} member{members.length !== 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <CheckSquare className="h-4 w-4" />
                      {sharedTasks.filter(t => t.status === 'pending').length} pending tasks
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      ${totalSharedExpenses.toFixed(2)} total
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs for tasks/expenses/members */}
              <Tabs defaultValue="tasks">
                <TabsList>
                  <TabsTrigger value="tasks">Shared Tasks</TabsTrigger>
                  <TabsTrigger value="expenses">Shared Expenses</TabsTrigger>
                  <TabsTrigger value="members">Members</TabsTrigger>
                </TabsList>

                <TabsContent value="tasks" className="space-y-4">
                  <div className="flex justify-end">
                    <Dialog open={addTaskDialogOpen} onOpenChange={setAddTaskDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Task
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Shared Task</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label>Task</Label>
                            <Input
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              placeholder="What needs to be done?"
                            />
                          </div>
                          <Button onClick={addSharedTask} className="w-full">Add Task</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {sharedTasks.length === 0 ? (
                    <EmptyState
                      icon={CheckSquare}
                      title="No shared tasks"
                      description="Add tasks that the team can work on together"
                    />
                  ) : (
                    <div className="space-y-2">
                      {sharedTasks.map((task) => (
                        <Card key={task.id} className="glass-card">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleTaskStatus(task)}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-smooth ${
                                  task.status === 'completed'
                                    ? 'bg-primary border-primary text-primary-foreground'
                                    : 'border-muted-foreground/30 hover:border-primary'
                                }`}
                              >
                                {task.status === 'completed' && (
                                  <CheckSquare className="h-3 w-3" />
                                )}
                              </button>
                              <span className={task.status === 'completed' ? 'line-through text-muted-foreground' : ''}>
                                {task.title}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteSharedTask(task.id)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="expenses" className="space-y-4">
                  <div className="flex justify-end">
                    <Dialog open={addExpenseDialogOpen} onOpenChange={setAddExpenseDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Expense
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Shared Expense</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input
                              type="number"
                              value={newExpenseAmount}
                              onChange={(e) => setNewExpenseAmount(e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Category</Label>
                            <Input
                              value={newExpenseCategory}
                              onChange={(e) => setNewExpenseCategory(e.target.value)}
                              placeholder="Groceries, Utilities, Rent..."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Note (optional)</Label>
                            <Input
                              value={newExpenseNote}
                              onChange={(e) => setNewExpenseNote(e.target.value)}
                              placeholder="What was this for?"
                            />
                          </div>
                          <Button onClick={addSharedExpense} className="w-full">Add Expense</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {sharedExpenses.length === 0 ? (
                    <EmptyState
                      icon={DollarSign}
                      title="No shared expenses"
                      description="Track expenses that the team shares"
                    />
                  ) : (
                    <div className="space-y-2">
                      {sharedExpenses.map((expense) => (
                        <Card key={expense.id} className="glass-card">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div>
                              <div className="font-medium">${Number(expense.amount).toFixed(2)}</div>
                              <div className="text-sm text-muted-foreground">
                                {expense.category}
                                {expense.note && ` • ${expense.note}`}
                              </div>
                            </div>
                            {expense.paid_by === user?.id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteSharedExpense(expense.id)}
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="members" className="space-y-4">
                  <div className="space-y-2">
                    {members.map((member) => (
                      <Card key={member.id} className="glass-card">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">
                                Team Member
                                {member.user_id === user?.id && ' (You)'}
                              </div>
                              <div className="text-sm text-muted-foreground capitalize">{member.role}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
