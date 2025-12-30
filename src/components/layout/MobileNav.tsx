import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CheckSquare,
  Sparkles,
  Heart,
  Menu,
} from 'lucide-react';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import {
  DollarSign,
  Scale,
  FileText,
  Settings,
  LogOut,
  Brain,
  Target,
  BarChart3,
  Users,
  Clock,
  GraduationCap,
  Zap,
  Compass,
} from 'lucide-react';

const bottomNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/wellness', icon: Heart, label: 'Wellness' },
  { to: '/coach', icon: Sparkles, label: 'Coach' },
];

const allNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/habits', icon: Target, label: 'Habits' },
  { to: '/expenses', icon: DollarSign, label: 'Expenses' },
  { to: '/wellness', icon: Heart, label: 'Wellness' },
  { to: '/time', icon: Clock, label: 'Time' },
  { to: '/learning', icon: GraduationCap, label: 'Learning' },
  { to: '/automation', icon: Zap, label: 'Automation' },
  { to: '/vision', icon: Compass, label: 'Life Vision' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/coach', icon: Sparkles, label: 'AI Coach' },
  { to: '/teams', icon: Users, label: 'Teams' },
  { to: '/decisions', icon: Scale, label: 'Decisions' },
  { to: '/notes', icon: FileText, label: 'Notes' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function MobileNav() {
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-background/95 backdrop-blur-sm lg:hidden safe-bottom">
      {bottomNavItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center gap-0.5 px-3 py-2 text-xs font-medium transition-smooth min-h-[44px]',
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )
          }
        >
          <item.icon className="h-5 w-5" />
          <span className="text-[10px]">{item.label}</span>
        </NavLink>
      ))}

      {/* More Menu */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-smooth min-h-[44px]">
            <Menu className="h-5 w-5" />
            <span className="text-[10px]">More</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-xl">
          <SheetHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Brain className="h-4 w-4" />
              </div>
              <SheetTitle>LifeOS</SheetTitle>
            </div>
          </SheetHeader>
          <ScrollArea className="h-full pb-8">
            <div className="grid grid-cols-3 gap-2 pb-20">
              {allNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center gap-2 rounded-lg p-3 text-center transition-smooth min-h-[80px] justify-center',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </NavLink>
              ))}
            </div>
            <div className="border-t pt-4">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground"
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </Button>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
