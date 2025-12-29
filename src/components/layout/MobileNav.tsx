import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CheckSquare,
  DollarSign,
  Sparkles,
  Heart,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/wellness', icon: Heart, label: 'Wellness' },
  { to: '/coach', icon: Sparkles, label: 'Coach' },
  { to: '/expenses', icon: DollarSign, label: 'Money' },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-background/95 backdrop-blur-sm lg:hidden">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-smooth',
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )
          }
        >
          <item.icon className="h-5 w-5" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
