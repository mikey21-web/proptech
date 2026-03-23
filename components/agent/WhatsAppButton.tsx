'use client';

import { cn } from '@/lib/utils/cn';
import { MessageCircle } from 'lucide-react';

interface WhatsAppButtonProps {
  phone: string;
  message?: string;
  className?: string;
  size?: 'sm' | 'md';
  label?: string;
}

/**
 * Opens WhatsApp Web / app with a pre-filled message for the given phone number.
 * Falls back to wa.me link which works both mobile and desktop.
 */
export function WhatsAppButton({
  phone,
  message = '',
  className,
  size = 'sm',
  label,
}: WhatsAppButtonProps) {
  // Sanitize phone: remove spaces, dashes, brackets; prepend 91 if no country code
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (!cleaned.startsWith('+') && !cleaned.startsWith('91') && cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  }
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }

  const url = `https://wa.me/${cleaned}${message ? `?text=${encodeURIComponent(message)}` : ''}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-medium transition-colors',
        'bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600',
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        className,
      )}
      aria-label={`Send WhatsApp message to ${phone}`}
    >
      <MessageCircle className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
      {label ?? 'WhatsApp'}
    </a>
  );
}
