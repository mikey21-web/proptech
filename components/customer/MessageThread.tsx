'use client';

import { User } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatRelativeTime } from '@/lib/utils/format';

interface Message {
  id: string;
  type: string;
  direction: string;
  subject?: string | null;
  body?: string | null;
  createdAt: string;
  user: {
    name: string;
    image?: string | null;
  };
}

interface MessageThreadProps {
  messages: Message[];
  className?: string;
}

const typeLabels: Record<string, string> = {
  call: 'Phone Call',
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  meeting: 'Meeting',
  site_visit: 'Site Visit',
  other: 'Note',
};

const typeDotColors: Record<string, string> = {
  call: 'bg-blue-500',
  email: 'bg-indigo-500',
  sms: 'bg-purple-500',
  whatsapp: 'bg-green-500',
  meeting: 'bg-amber-500',
  site_visit: 'bg-cyan-500',
  other: 'bg-gray-400',
};

export default function MessageThread({
  messages,
  className,
}: MessageThreadProps) {
  if (messages.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <p className="text-muted-foreground">No messages yet.</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)} role="log" aria-label="Message history">
      {messages.map((msg) => {
        const isInbound = msg.direction === 'inbound';
        return (
          <div
            key={msg.id}
            className={cn(
              'flex gap-3',
              isInbound ? 'flex-row' : 'flex-row-reverse',
            )}
          >
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium',
                  isInbound
                    ? 'bg-primary/10 text-primary'
                    : 'bg-secondary text-muted-foreground',
                )}
              >
                {msg.user?.image ? (
                  <img
                    src={msg.user.image}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
            </div>

            {/* Bubble */}
            <div
              className={cn(
                'max-w-[80%] rounded-xl px-4 py-2.5',
                isInbound
                  ? 'bg-secondary text-foreground rounded-tl-none'
                  : 'bg-primary text-primary-foreground rounded-tr-none',
              )}
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('h-2 w-2 rounded-full', typeDotColors[msg.type] || typeDotColors.other)} />
                <span className="text-xs font-medium opacity-80">
                  {msg.user.name} — {typeLabels[msg.type] || msg.type}
                </span>
              </div>

              {msg.subject && (
                <p className="text-sm font-medium mb-1">{msg.subject}</p>
              )}

              {msg.body && (
                <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
              )}

              <p
                className={cn(
                  'text-xs mt-1.5',
                  isInbound ? 'text-muted-foreground' : 'opacity-70',
                )}
              >
                {formatRelativeTime(msg.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
