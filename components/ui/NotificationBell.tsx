'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Loader2,
  AlertCircle,
  Calendar,
  MessageSquare,
  User,
  BookOpen,
  IndianRupee,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface Notification {
  id: string;
  type: string;
  title: string;
  description: string | null;
  isRead: boolean;
  priority: string;
  actionUrl: string | null;
  createdAt: string;
  lead?: { id: string; name: string; phone: string; status: string; project: { name: string } | null } | null;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'booking_created': return BookOpen;
    case 'payment_received': return IndianRupee;
    case 'lead_assigned': return Target;
    case 'task_created': return Calendar;
    case 'message_received': return MessageSquare;
    case 'user_activity': return User;
    default: return Bell;
  }
}

function getNotificationColor(type: string, priority: string) {
  if (priority === 'urgent' || priority === 'high') return 'text-red-500 bg-red-50 dark:bg-red-900/20';
  if (priority === 'medium') return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20';
  switch (type) {
    case 'booking_created': return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
    case 'payment_received': return 'text-green-500 bg-green-50 dark:bg-green-900/20';
    case 'lead_assigned': return 'text-purple-500 bg-purple-50 dark:bg-purple-900/20';
    default: return 'text-muted-foreground bg-muted';
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async (reset = false) => {
    const currentPage = reset ? 1 : page;
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?limit=10&page=${currentPage}`);
      const json = await res.json();
      if (json.success) {
        const newNotifs = reset ? json.data.notifications : [...notifications, ...json.data.notifications];
        setNotifications(newNotifs);
        setUnreadCount(json.data.unreadCount);
        setHasMore(json.data.pagination.page < json.data.pagination.totalPages);
        if (reset) setPage(1);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchNotifications(true);
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const bellBtn = (e.target as HTMLElement).closest('button[aria-label="Notifications"]');
        if (!bellBtn) {
          setOpen(false);
        }
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setMarkingAll(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: unreadIds, metadata: { isRead: true, readAt: new Date().toISOString() } }),
      });
      const json = await res.json();
      if (json.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch {
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [id], metadata: { isRead: true, readAt: new Date().toISOString() } }),
      });
      const json = await res.json();
      if (json.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        className="relative rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 min-w-[16px] flex items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-primary/10 text-[10px] font-medium text-primary px-1.5">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  aria-label="Mark all as read"
                  className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                  title="Mark all as read"
                >
                  {markingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <Bell className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You'll see updates about your leads, bookings, and payments here.
                </p>
              </div>
            ) : (
              <>
                {notifications.map((notif) => {
                  const Icon = getNotificationIcon(notif.type);
                  const colorClass = getNotificationColor(notif.type, notif.priority);
                  return (
                    <div
                      key={notif.id}
                      className={cn(
                        'relative flex gap-3 px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer border-b border-border/50 last:border-0',
                        !notif.isRead && 'bg-primary/5'
                      )}
                      onClick={() => {
                        if (!notif.isRead) handleMarkRead(notif.id);
                        if (notif.actionUrl) window.location.href = notif.actionUrl;
                      }}
                    >
                      {/* Unread dot */}
                      {!notif.isRead && (
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
                      )}

                      {/* Icon */}
                      <div className={cn('h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0', colorClass.split(' ')[1])}>
                        <Icon className={cn('h-4 w-4', colorClass.split(' ')[0])} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn('text-sm font-medium text-foreground leading-tight', !notif.isRead && 'font-semibold')}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0 mt-0.5">
                            {formatTime(notif.createdAt)}
                          </span>
                        </div>
                        {notif.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notif.description}
                          </p>
                        )}
                        {notif.lead && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {notif.lead.name} • {notif.lead.project?.name || 'General'}
                          </p>
                        )}
                      </div>

                      {/* Mark read */}
                      {!notif.isRead && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMarkRead(notif.id); }}
                          className="flex-shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent"
                          aria-label="Mark as read"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Load more */}
                {hasMore && (
                  <div className="px-4 py-2 border-t border-border">
                    <button
                      onClick={() => { setPage((p) => p + 1); fetchNotifications(false); }}
                      disabled={loading}
                      className="w-full text-xs text-primary hover:text-primary/80 font-medium py-1 disabled:opacity-50"
                    >
                      {loading ? 'Loading...' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
