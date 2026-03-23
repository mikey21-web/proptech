'use client';

import { MessageCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface WhatsAppChatProps {
  agentName: string;
  agentPhone: string;
  bookingNumber?: string;
  className?: string;
}

export default function WhatsAppChat({
  agentName,
  agentPhone,
  bookingNumber,
  className,
}: WhatsAppChatProps) {
  const cleanPhone = agentPhone.replace(/[^0-9]/g, '');
  const phone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  const message = bookingNumber
    ? `Hi ${agentName}, I have a query regarding my booking ${bookingNumber}.`
    : `Hi ${agentName}, I need assistance with my property booking.`;
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', className)}>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <MessageCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            Chat with {agentName}
          </p>
          <p className="text-xs text-muted-foreground">
            Your assigned agent
          </p>
        </div>
      </div>

      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 w-full justify-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
        aria-label={`Open WhatsApp chat with ${agentName}`}
      >
        <MessageCircle className="h-4 w-4" />
        Open WhatsApp
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
