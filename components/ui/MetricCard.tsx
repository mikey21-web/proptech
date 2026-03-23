'use client';

import { cn } from '@/lib/utils/cn';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: { value: number; label: string };
  className?: string;
}

export function MetricCard({ title, value, subtitle, icon: Icon, trend, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {Icon && (
          <div className="rounded-md bg-primary/10 p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
      <div className="mt-2">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
        {trend && (
          <div className="mt-2 flex items-center gap-1">
            <span
              className={cn(
                'text-xs font-medium',
                trend.value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
              )}
            >
              {trend.value >= 0 ? '+' : ''}
              {trend.value}%
            </span>
            <span className="text-xs text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
