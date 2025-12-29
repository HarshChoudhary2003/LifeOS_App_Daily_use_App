import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Globe, Lock, Copy, ExternalLink, AlertCircle } from 'lucide-react';

interface PublicProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  is_public: boolean;
  show_task_stats: boolean;
  show_habit_streaks: boolean;
  show_expense_summary: boolean;
}

export function PrivacySettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [showTaskStats, setShowTaskStats] = useState(false);
  const [showHabitStreaks, setShowHabitStreaks] = useState(false);
  const [showExpenseSummary, setShowExpenseSummary] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('public_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setProfile(data);
      setUsername(data.username || '');
      setDisplayName(data.display_name || '');
      setBio(data.bio || '');
      setIsPublic(data.is_public);
      setShowTaskStats(data.show_task_stats);
      setShowHabitStreaks(data.show_habit_streaks);
      setShowExpenseSummary(data.show_expense_summary);
    }
    setLoading(false);
  };

  const validateUsername = (value: string) => {
    if (!value) {
      setUsernameError('Username is required for public profiles');
      return false;
    }
    if (value.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return false;
    }
    if (!/^[a-z0-9_]+$/.test(value)) {
      setUsernameError('Only lowercase letters, numbers, and underscores allowed');
      return false;
    }
    setUsernameError('');
    return true;
  };

  const saveProfile = async () => {
    if (!user) return;

    if (isPublic && !validateUsername(username)) {
      return;
    }

    setSaving(true);

    const profileData = {
      user_id: user.id,
      username: username.toLowerCase() || null,
      display_name: displayName || null,
      bio: bio || null,
      is_public: isPublic,
      show_task_stats: showTaskStats,
      show_habit_streaks: showHabitStreaks,
      show_expense_summary: showExpenseSummary,
    };

    let error;

    if (profile) {
      const result = await supabase
        .from('public_profiles')
        .update(profileData)
        .eq('id', profile.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('public_profiles')
        .insert(profileData);
      error = result.error;
    }

    if (error) {
      if (error.code === '23505') {
        setUsernameError('This username is already taken');
      } else {
        toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
      }
    } else {
      toast({ title: 'Saved', description: 'Privacy settings updated' });
      fetchProfile();
    }

    setSaving(false);
  };

  const copyProfileLink = () => {
    if (username) {
      navigator.clipboard.writeText(`${window.location.origin}/u/${username}`);
      toast({ title: 'Copied', description: 'Profile link copied to clipboard' });
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="py-8 flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Public Profile Toggle */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isPublic ? <Globe className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5" />}
            Public Profile
          </CardTitle>
          <CardDescription>
            Share your productivity stats with others. No personal data is shared without your consent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Disclaimer */}
          <div className="flex items-start gap-3 p-3 bg-muted rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-muted-foreground">
              Only the sections you enable below will be visible on your public profile.
              Your actual expense amounts are never shared - only category names.
            </p>
          </div>

          {/* Main toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Enable Public Profile</Label>
              <p className="text-sm text-muted-foreground">Allow anyone with your link to view selected stats</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          {isPublic && (
            <>
              {/* Username */}
              <div className="space-y-2">
                <Label>Username</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value.toLowerCase());
                        validateUsername(e.target.value);
                      }}
                      placeholder="your_username"
                    />
                    {usernameError && (
                      <p className="text-sm text-destructive mt-1">{usernameError}</p>
                    )}
                  </div>
                  {username && !usernameError && (
                    <>
                      <Button variant="outline" size="icon" onClick={copyProfileLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(`/u/${username}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Your profile will be at: {window.location.origin}/u/{username || 'your_username'}
                </p>
              </div>

              {/* Display name */}
              <div className="space-y-2">
                <Label>Display Name (optional)</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How you want to be called"
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label>Bio (optional)</Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A short description about yourself"
                  rows={2}
                />
              </div>

              {/* Section toggles */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h4 className="font-medium">What to Share</h4>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Task Stats</Label>
                    <p className="text-sm text-muted-foreground">Show task completion rate</p>
                  </div>
                  <Switch checked={showTaskStats} onCheckedChange={setShowTaskStats} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Habit Streaks</Label>
                    <p className="text-sm text-muted-foreground">Show your habit names and streak days</p>
                  </div>
                  <Switch checked={showHabitStreaks} onCheckedChange={setShowHabitStreaks} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Expense Categories</Label>
                    <p className="text-sm text-muted-foreground">Show category names only (no amounts)</p>
                  </div>
                  <Switch checked={showExpenseSummary} onCheckedChange={setShowExpenseSummary} />
                </div>
              </div>
            </>
          )}

          <Button onClick={saveProfile} disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Save Privacy Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
