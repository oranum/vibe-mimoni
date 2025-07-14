'use client';

import { Badge } from '@/components/ui/badge';
import { Label } from '@/types/database';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LabelBadgeProps {
  label: Label;
  onRemove?: () => void;
  showRecurring?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function LabelBadge({ 
  label, 
  onRemove, 
  showRecurring = false,
  size = 'default',
  className 
}: LabelBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    default: 'text-sm px-2.5 py-1.5',
    lg: 'text-base px-3 py-2'
  };

  return (
    <Badge
      style={{ backgroundColor: label.color, color: 'white' }}
      className={cn(
        'inline-flex items-center gap-1.5 font-medium',
        sizeClasses[size],
        onRemove && 'cursor-pointer hover:opacity-80',
        className
      )}
      onClick={onRemove}
    >
      <span>{label.name}</span>
      {showRecurring && label.recurring && (
        <span className="text-xs opacity-75">●</span>
      )}
      {onRemove && (
        <X className={cn(
          'hover:bg-black/20 rounded-full',
          size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
        )} />
      )}
    </Badge>
  );
} 