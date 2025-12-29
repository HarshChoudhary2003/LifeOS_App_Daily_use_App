import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { LogOut, User, Mail } from 'lucide-react';

export default function Settings() {
  const { user, signOut } = useAuth();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Settings"
        description="Manage your account"
      />

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
          <Button variant="destructive" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* App Info */}
      <div className="text-center text-xs text-muted-foreground pt-4">
        <p>LifeOS v1.0</p>
        <p className="mt-1">Your personal life management system</p>
      </div>
    </div>
  );
}
