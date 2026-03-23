'use client';

import { useState } from 'react';
import { Send, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface TicketFormProps {
  bookings?: Array<{ id: string; bookingNumber: string; projectName: string }>;
  onSuccess?: () => void;
  className?: string;
}

export default function TicketForm({
  bookings,
  onSuccess,
  className,
}: TicketFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [bookingId, setBookingId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isValid = title.trim().length >= 3 && description.trim().length >= 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/customer/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          priority,
          bookingId: bookingId || undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to submit ticket');
      }

      setSuccess(true);
      setTitle('');
      setDescription('');
      setPriority('medium');
      setBookingId('');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className={cn('text-center py-8', className)}>
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <h4 className="text-base font-semibold text-foreground mb-1">
          Query Submitted
        </h4>
        <p className="text-sm text-muted-foreground mb-4">
          Our team will respond shortly. You can track the status in your tickets.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="text-sm font-medium text-primary hover:text-primary/80"
        >
          Submit another query
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Related Booking */}
      {bookings && bookings.length > 0 && (
        <div>
          <label htmlFor="ticket-booking" className="block text-sm font-medium text-foreground mb-1.5">
            Related Booking (optional)
          </label>
          <select
            id="ticket-booking"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Select a booking...</option>
            {bookings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bookingNumber} — {b.projectName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="ticket-title" className="block text-sm font-medium text-foreground mb-1.5">
          Subject <span className="text-destructive">*</span>
        </label>
        <input
          id="ticket-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief summary of your query"
          maxLength={200}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="ticket-desc" className="block text-sm font-medium text-foreground mb-1.5">
          Description <span className="text-destructive">*</span>
        </label>
        <textarea
          id="ticket-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your question or concern in detail..."
          rows={4}
          maxLength={2000}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          required
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {description.length}/2000 characters
        </p>
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Priority
        </label>
        <div className="flex gap-2" role="radiogroup" aria-label="Ticket priority">
          {(['low', 'medium', 'high'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={cn(
                'flex-1 rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors',
                priority === p
                  ? p === 'high'
                    ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                    : p === 'medium'
                      ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                      : 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                  : 'border-border text-muted-foreground hover:bg-accent',
              )}
              role="radio"
              aria-checked={priority === p}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!isValid || submitting}
        className={cn(
          'w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
          isValid && !submitting
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-muted text-muted-foreground cursor-not-allowed',
        )}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Submit Query
          </>
        )}
      </button>
    </form>
  );
}
