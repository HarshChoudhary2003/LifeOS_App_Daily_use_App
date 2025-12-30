import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { PrivacySettings } from '@/components/settings/PrivacySettings';
import { LogOut, User, Mail, Sun, Moon, Monitor } from 'lucide-react';

export default function Settings() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Settings"
        description="Manage your account and preferences"
      />

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="account" className="flex-1 sm:flex-none">Account</TabsTrigger>
          <TabsTrigger value="appearance" className="flex-1 sm:flex-none">Appearance</TabsTrigger>
          <TabsTrigger value="privacy" className="flex-1 sm:flex-none">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          {/* Account Info */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Account</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input value={user?.email || ''} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  User ID
                </Label>
                <Input value={user?.id || ''} disabled className="bg-muted font-mono text-xs" />
              </div>
            </CardContent>
          </Card>

          {/* Sign Out */}
          <Card className="glass-card border-destructive/20">
            <CardHeader>
              <CardTitle className="text-lg">Sign Out</CardTitle>
              <CardDescription>Sign out of your LifeOS account</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={signOut} className="w-full sm:w-auto">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          {/* Theme Settings */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Theme</CardTitle>
              <CardDescription>Choose how LifeOS looks to you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    theme === 'light' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <Sun className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Light</p>
                    <p className="text-sm text-muted-foreground">A clean, bright appearance</p>
                  </div>
                </button>

                <button
                  onClick={() => setTheme('dark')}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    theme === 'dark' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-200">
                    <Moon className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Dark</p>
                    <p className="text-sm text-muted-foreground">Easy on the eyes, perfect for night</p>
                  </div>
                </button>

                <button
                  onClick={() => setTheme('system')}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    theme === 'system' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-slate-800 text-foreground">
                    <Monitor className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">System</p>
                    <p className="text-sm text-muted-foreground">Automatically match your device settings</p>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <PrivacySettings />
        </TabsContent>
      </Tabs>

      {/* App Info */}
      <div className="text-center text-xs text-muted-foreground pt-4">
        <p>LifeOS v1.0</p>
        <p className="mt-1">Your personal life management system</p>
      </div>
    </div>
  );
}
