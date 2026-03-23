'use client';

import { Clock, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatRelativeTime } from '@/lib/utils/format';

interface Ticket {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  createdAt: string;
  completedAt?: string | null;
  assignee?: { name: string } | null;
}

interface TicketListProps {
  tickets: Ticket[];
  onSelect?: (ticketId: string) => void;
  className?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Open', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
  completed: { label: 'Resolved', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
  cancelled: { label: 'Closed', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400', icon: AlertCircle },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle },
};

import { AlertTriangle } from 'lucide-react';

const priorityColors: Record<string, string> = {
  low: 'text-green-600 dark:text-green-400',
  medium: 'text-amber-600 dark:text-amber-400',
  high: 'text-red-600 dark:text-red-400',
  urgent: 'text-red-700 dark:text-red-300',
};

export default function TicketList({
  tickets,
  onSelect,
  className,
}: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-sm text-muted-foreground">
          No support tickets yet.
        </p>
      </div>
    );
  }

  return (
    <ul className={cn('divide-y divide-border', className)} role="list" aria-label="Support tickets">
      {tickets.map((ticket) => {
        const config = statusConfig[ticket.status] || statusConfig.pending;
        const StatusIcon = config.icon;

        return (
          <li key={ticket.id}>
            <button
              onClick={() => onSelect?.(ticket.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
            >
              <StatusIcon className={cn('h-5 w-5 flex-shrink-0', config.color.includes('text-') ? '' : 'text-muted-foreground')} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="text-sm font-medium text-foreground truncate">
                    {ticket.title}
                  </h4>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      config.color,
                    )}
                  >
                    {config.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={cn('capitalize', priorityColors[ticket.priority])}>
                    {ticket.priority}
                  </span>
                  <span>·</span>
                  <span>{formatRelativeTime(ticket.createdAt)}</span>
                  {ticket.assignee && (
                    <>
                      <span>·</span>
                      <span>Agent: {ticket.assignee.name}</span>
                    </>
                  )}
                </div>
              </div>

              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
