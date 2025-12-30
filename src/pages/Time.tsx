import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays, isToday, parseISO, startOfDay, endOfDay, startOfWeek } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Clock, Play, Pause, Square, Plus, Calendar, Timer, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

interface TimeBlock {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  category: string;
  color: string;
  task_id: string | null;
}

interface FocusSession {
  id: string;
  category: string;
  duration_minutes: number;
  started_at: string;
  completed_at: string | null;
  task_id: string | null;
}

interface Task {
  id: string;
  title: string;
  category: string;
}

const CATEGORIES = ["Work", "Personal", "Health", "Learning", "Creative", "General"];
const COLORS = ["blue", "green", "purple", "orange", "pink", "cyan"];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

export default function Time() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"planner" | "focus" | "analytics">("planner");
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  
  // Focus timer state
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerCategory, setTimerCategory] = useState("Work");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [initialMinutes, setInitialMinutes] = useState(25);

  // New block dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newBlock, setNewBlock] = useState({
    title: "",
    startTime: "09:00",
    endTime: "10:00",
    category: "Work",
    color: "blue"
  });

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    const dayStart = startOfDay(selectedDate).toISOString();
    const dayEnd = endOfDay(selectedDate).toISOString();

    const [blocksRes, sessionsRes, tasksRes] = await Promise.all([
      supabase
        .from("time_blocks")
        .select("*")
        .eq("user_id", user.id)
        .gte("start_time", dayStart)
        .lte("start_time", dayEnd)
        .order("start_time"),
      supabase
        .from("focus_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(50),
      supabase
        .from("tasks")
        .select("id, title, category")
        .eq("user_id", user.id)
        .eq("status", "pending")
    ]);

    if (blocksRes.data) setTimeBlocks(blocksRes.data);
    if (sessionsRes.data) setFocusSessions(sessionsRes.data);
    if (tasksRes.data) setTasks(tasksRes.data);
    setIsLoading(false);
  }, [user, selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isTimerRunning) {
      interval = setInterval(() => {
        if (timerSeconds > 0) {
          setTimerSeconds(timerSeconds - 1);
        } else if (timerMinutes > 0) {
          setTimerMinutes(timerMinutes - 1);
          setTimerSeconds(59);
        } else {
          // Timer complete
          setIsTimerRunning(false);
          completeSession();
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerMinutes, timerSeconds]);

  const startTimer = () => {
    setSessionStartTime(new Date());
    setInitialMinutes(timerMinutes);
    setIsTimerRunning(true);
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerMinutes(25);
    setTimerSeconds(0);
    setSessionStartTime(null);
  };

  const completeSession = async () => {
    if (!user || !sessionStartTime) return;

    const duration = initialMinutes - timerMinutes - (timerSeconds > 0 ? 0 : 1);
    if (duration <= 0) return;

    const { error } = await supabase.from("focus_sessions").insert({
      user_id: user.id,
      task_id: selectedTaskId,
      category: timerCategory,
      duration_minutes: Math.max(1, duration),
      started_at: sessionStartTime.toISOString(),
      completed_at: new Date().toISOString()
    });

    if (error) {
      toast.error("Couldn't save your session");
    } else {
      toast.success(`Great focus! ${duration} minutes logged.`);
      fetchData();
    }

    resetTimer();
  };

  const addTimeBlock = async () => {
    if (!user || !newBlock.title) return;

    const startDateTime = new Date(selectedDate);
    const [startHour, startMin] = newBlock.startTime.split(":").map(Number);
    startDateTime.setHours(startHour, startMin, 0, 0);

    const endDateTime = new Date(selectedDate);
    const [endHour, endMin] = newBlock.endTime.split(":").map(Number);
    endDateTime.setHours(endHour, endMin, 0, 0);

    const { error } = await supabase.from("time_blocks").insert({
      user_id: user.id,
      title: newBlock.title,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      category: newBlock.category,
      color: newBlock.color
    });

    if (error) {
      toast.error("Couldn't add time block");
    } else {
      toast.success("Time block added");
      setIsDialogOpen(false);
      setNewBlock({ title: "", startTime: "09:00", endTime: "10:00", category: "Work", color: "blue" });
      fetchData();
    }
  };

  const deleteTimeBlock = async (id: string) => {
    const { error } = await supabase.from("time_blocks").delete().eq("id", id);
    if (error) {
      toast.error("Couldn't delete");
    } else {
      fetchData();
    }
  };

  // Weekly stats calculation
  const weeklyStats = focusSessions
    .filter(s => {
      const sessionDate = parseISO(s.started_at);
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      return sessionDate >= weekStart;
    })
    .reduce((acc, s) => {
      acc.totalMinutes += s.duration_minutes;
      acc.byCategory[s.category] = (acc.byCategory[s.category] || 0) + s.duration_minutes;
      return acc;
    }, { totalMinutes: 0, byCategory: {} as Record<string, number> });

  const getColorClass = (color: string) => {
    const colors: Record<string, string> = {
      blue: "bg-blue-500/20 border-blue-500/50 text-blue-700 dark:text-blue-300",
      green: "bg-green-500/20 border-green-500/50 text-green-700 dark:text-green-300",
      purple: "bg-purple-500/20 border-purple-500/50 text-purple-700 dark:text-purple-300",
      orange: "bg-orange-500/20 border-orange-500/50 text-orange-700 dark:text-orange-300",
      pink: "bg-pink-500/20 border-pink-500/50 text-pink-700 dark:text-pink-300",
      cyan: "bg-cyan-500/20 border-cyan-500/50 text-cyan-700 dark:text-cyan-300"
    };
    return colors[color] || colors.blue;
  };

  const timerProgress = ((initialMinutes * 60 - (timerMinutes * 60 + timerSeconds)) / (initialMinutes * 60)) * 100;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Time Intelligence"
        description="Plan your day and focus deeply"
      />

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        <Button
          variant={activeTab === "planner" ? "default" : "ghost"}
          onClick={() => setActiveTab("planner")}
          className="gap-2 shrink-0"
          size="sm"
        >
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">Planner</span>
        </Button>
        <Button
          variant={activeTab === "focus" ? "default" : "ghost"}
          onClick={() => setActiveTab("focus")}
          className="gap-2 shrink-0"
          size="sm"
        >
          <Timer className="h-4 w-4" />
          <span className="hidden sm:inline">Focus</span>
        </Button>
        <Button
          variant={activeTab === "analytics" ? "default" : "ghost"}
          onClick={() => setActiveTab("analytics")}
          className="gap-2 shrink-0"
          size="sm"
        >
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Analytics</span>
        </Button>
      </div>

      {/* Time Blocking / Planner Tab */}
      {activeTab === "planner" && (
        <div className="space-y-4">
          {/* Date Navigation */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedDate(addDays(selectedDate, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-[120px] text-center text-sm sm:text-base">
                {isToday(selectedDate) ? "Today" : format(selectedDate, "EEE, MMM d")}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  Add Block
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Time Block</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>What will you work on?</Label>
                    <Input
                      value={newBlock.title}
                      onChange={(e) => setNewBlock({ ...newBlock, title: e.target.value })}
                      placeholder="Deep work on project..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start</Label>
                      <Select
                        value={newBlock.startTime}
                        onValueChange={(v) => setNewBlock({ ...newBlock, startTime: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_SLOTS.map((slot) => (
                            <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>End</Label>
                      <Select
                        value={newBlock.endTime}
                        onValueChange={(v) => setNewBlock({ ...newBlock, endTime: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_SLOTS.map((slot) => (
                            <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={newBlock.category}
                        onValueChange={(v) => setNewBlock({ ...newBlock, category: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Color</Label>
                      <Select
                        value={newBlock.color}
                        onValueChange={(v) => setNewBlock({ ...newBlock, color: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COLORS.map((color) => (
                            <SelectItem key={color} value={color} className="capitalize">{color}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button onClick={addTimeBlock} className="w-full">Add Block</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Daily Schedule */}
          <Card className="glass-card">
            <CardContent className="p-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : timeBlocks.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="No time blocks yet"
                  description="Plan your day by adding time blocks for focused work"
                />
              ) : (
                <div className="space-y-2">
                  {timeBlocks.map((block) => (
                    <div
                      key={block.id}
                      className={`p-3 rounded-lg border ${getColorClass(block.color)} flex items-center justify-between`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{block.title}</div>
                        <div className="text-sm opacity-75">
                          {format(parseISO(block.start_time), "h:mm a")} - {format(parseISO(block.end_time), "h:mm a")}
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-background/20 text-xs">
                            {block.category}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTimeBlock(block.id)}
                        className="opacity-60 hover:opacity-100 shrink-0"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Focus Timer Tab */}
      {activeTab === "focus" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Focus Timer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Timer Display */}
              <div className="text-center">
                <div className="text-6xl sm:text-7xl font-mono font-bold text-primary">
                  {timerMinutes.toString().padStart(2, '0')}:{timerSeconds.toString().padStart(2, '0')}
                </div>
                <Progress value={timerProgress} className="mt-4 h-2" />
              </div>

              {/* Timer Controls */}
              {!isTimerRunning ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Duration (min)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={120}
                        value={timerMinutes}
                        onChange={(e) => setTimerMinutes(Math.max(1, Math.min(120, parseInt(e.target.value) || 25)))}
                      />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select value={timerCategory} onValueChange={setTimerCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {tasks.length > 0 && (
                    <div>
                      <Label>Link to Task (optional)</Label>
                      <Select 
                        value={selectedTaskId || ""} 
                        onValueChange={(v) => setSelectedTaskId(v || null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a task..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No task</SelectItem>
                          {tasks.map((task) => (
                            <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Button onClick={startTimer} className="w-full gap-2">
                    <Play className="h-4 w-4" />
                    Start Focus Session
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 justify-center">
                  <Button onClick={pauseTimer} variant="outline" className="gap-2">
                    <Pause className="h-4 w-4" />
                    Pause
                  </Button>
                  <Button onClick={completeSession} variant="secondary" className="gap-2">
                    <Square className="h-4 w-4" />
                    Complete
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Sessions */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Recent Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {focusSessions.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Complete your first focus session to see it here
                </p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {focusSessions.slice(0, 10).map((session) => (
                    <div key={session.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                      <div>
                        <div className="font-medium text-sm">{session.category}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(parseISO(session.started_at), "MMM d, h:mm a")}
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        {session.duration_minutes} min
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-primary">
                  {Math.round(weeklyStats.totalMinutes / 60)}h
                </div>
                <div className="text-sm text-muted-foreground">This Week</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-primary">
                  {focusSessions.filter(s => {
                    const d = parseISO(s.started_at);
                    return isToday(d);
                  }).length}
                </div>
                <div className="text-sm text-muted-foreground">Sessions Today</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-primary">
                  {focusSessions.length > 0 
                    ? Math.round(focusSessions.reduce((sum, s) => sum + s.duration_minutes, 0) / focusSessions.length)
                    : 0}
                </div>
                <div className="text-sm text-muted-foreground">Avg Minutes</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-primary">
                  {Object.keys(weeklyStats.byCategory).length}
                </div>
                <div className="text-sm text-muted-foreground">Categories</div>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Focus by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.entries(weeklyStats.byCategory).length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Complete focus sessions to see your breakdown
                </p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(weeklyStats.byCategory)
                    .sort(([,a], [,b]) => b - a)
                    .map(([category, minutes]) => (
                      <div key={category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{category}</span>
                          <span className="text-muted-foreground">{Math.round(minutes / 60 * 10) / 10}h</span>
                        </div>
                        <Progress 
                          value={(minutes / weeklyStats.totalMinutes) * 100} 
                          className="h-2"
                        />
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
