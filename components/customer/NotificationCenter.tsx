'use client';

import {
  Bell,
  IndianRupee,
  FileText,
  MessageSquare,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatRelativeTime } from '@/lib/utils/format';

interface Notification {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

interface NotificationCenterProps {
  notifications: Notification[];
  className?: string;
}

const typeConfig: Record<
  string,
  { icon: typeof Bell; color: string }
> = {
  payment_due: { icon: IndianRupee, color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30' },
  payment_overdue: { icon: AlertTriangle, color: 'text-red-500 bg-red-100 dark:bg-red-900/30' },
  payment_received: { icon: CheckCircle2, color: 'text-green-500 bg-green-100 dark:bg-green-900/30' },
  document_needed: { icon: FileText, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' },
  document_verified: { icon: CheckCircle2, color: 'text-green-500 bg-green-100 dark:bg-green-900/30' },
  booking_update: { icon: BookOpen, color: 'text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30' },
  agent_message: { icon: MessageSquare, color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30' },
  ticket_reply: { icon: MessageSquare, color: 'text-cyan-500 bg-cyan-100 dark:bg-cyan-900/30' },
};

export default function NotificationCenter({
  notifications,
  className,
}: NotificationCenterProps) {
  if (notifications.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
        <p className="text-sm text-muted-foreground">
          No notifications yet.
        </p>
      </div>
    );
  }

  return (
    <ul className={cn('divide-y divide-border', className)} role="list" aria-label="Notifications">
      {notifications.map((notif) => {
        const notifType = (notif.metadata as any)?.notificationType || notif.type;
        const config = typeConfig[notifType] || {
          icon: Info,
          color: 'text-gray-500 bg-gray-100 dark:bg-gray-800',
        };
        const Icon = config.icon;

        return (
          <li key={notif.id} className="flex gap-3 py-3">
            <div
              className={cn(
                'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full',
                config.color,
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                {notif.title}
              </p>
              {notif.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {notif.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {formatRelativeTime(notif.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
