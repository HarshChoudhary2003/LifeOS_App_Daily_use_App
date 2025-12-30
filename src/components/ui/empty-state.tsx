import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 sm:py-12 px-4 text-center">
      <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-muted mb-3 sm:mb-4">
        <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" />
      </div>
      <h3 className="text-base sm:text-lg font-medium text-foreground mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-muted-foreground max-w-xs sm:max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}
