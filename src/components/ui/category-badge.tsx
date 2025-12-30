import * as React from 'react';
import { cn } from '@/lib/utils';

interface CategoryBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  category: 'Work' | 'Personal' | 'Health' | string;
}

const categoryStyles: Record<string, string> = {
  Work: 'badge-work',
  Personal: 'badge-personal',
  Health: 'badge-health',
};

const CategoryBadge = React.forwardRef<HTMLSpanElement, CategoryBadgeProps>(
  ({ category, className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
          categoryStyles[category] || 'bg-muted text-muted-foreground border-border',
          className
        )}
        {...props}
      >
        {category}
      </span>
    );
  }
);

CategoryBadge.displayName = 'CategoryBadge';

export { CategoryBadge };
