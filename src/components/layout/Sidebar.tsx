import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CheckSquare,
  DollarSign,
  Scale,
  FileText,
  Settings,
  LogOut,
  Brain,
  Target,
  BarChart3,
  Sparkles,
  Users,
  Heart,
  Clock,
  GraduationCap,
  Zap,
  Compass,
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
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

export function Sidebar() {
  const { signOut } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const toggleTheme = () => {
    // Add transition class for smooth animation
    document.documentElement.classList.add('theme-transition');
    
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    
    // Remove transition class after animation completes
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition');
    }, 300);
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar p-4">
      {/* Logo & Theme Toggle */}
      <div className="flex items-center justify-between px-2 py-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Brain className="h-5 w-5" />
          </div>
          <span className="text-xl font-semibold text-sidebar-foreground">LifeOS</span>
        </div>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-smooth',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Sign Out */}
      <div className="pt-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
