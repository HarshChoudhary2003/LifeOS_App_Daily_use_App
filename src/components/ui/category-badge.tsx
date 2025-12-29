import { cn } from '@/lib/utils';

interface CategoryBadgeProps {
  category: 'Work' | 'Personal' | 'Health' | string;
  className?: string;
}

const categoryStyles: Record<string, string> = {
  Work: 'badge-work',
  Personal: 'badge-personal',
  Health: 'badge-health',
};

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        categoryStyles[category] || 'bg-muted text-muted-foreground border-border',
        className
      )}
    >
      {category}
    </span>
  );
}
