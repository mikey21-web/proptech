'use client';

import { Check, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatDate } from '@/lib/utils/format';

interface Milestone {
  key: string;
  label: string;
  done: boolean;
  date?: string | null;
  description?: string;
}

interface BookingTimelineProps {
  milestones: Milestone[];
  className?: string;
}

export default function BookingTimeline({
  milestones,
  className,
}: BookingTimelineProps) {
  return (
    <div className={cn('relative', className)} role="list" aria-label="Booking timeline">
      {milestones.map((milestone, index) => {
        const isLast = index === milestones.length - 1;
        const isCurrent =
          milestone.done &&
          (isLast || !milestones[index + 1]?.done);

        return (
          <div
            key={milestone.key}
            className="relative flex gap-4 pb-8 last:pb-0"
            role="listitem"
          >
            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  'absolute left-[15px] top-[30px] h-[calc(100%-30px)] w-0.5',
                  milestone.done ? 'bg-primary' : 'bg-border',
                )}
              />
            )}

            {/* Icon */}
            <div className="relative z-10 flex-shrink-0">
              {milestone.done ? (
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full',
                    isCurrent
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                      : 'bg-primary/80 text-primary-foreground',
                  )}
                >
                  <Check className="h-4 w-4" />
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-card">
                  {index === milestones.findIndex((m) => !m.done) ? (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <h4
                  className={cn(
                    'text-sm font-medium',
                    milestone.done ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {milestone.label}
                </h4>
                {milestone.date && (
                  <span className="text-xs text-muted-foreground">
                    {formatDate(milestone.date)}
                  </span>
                )}
              </div>
              {milestone.description && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {milestone.description}
                </p>
              )}
              {isCurrent && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Current Stage
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
