'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { BookingDetail } from '@/components/agent/BookingDetail';
import { DetailSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function BookingDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bookingId = params.id as string;

  const fetchBooking = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setBooking(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load booking');
      toast('Failed to load booking details', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [bookingId, toast]);

  useEffect(() => {
    if (bookingId) fetchBooking();
  }, [bookingId, fetchBooking]);

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Link
        href="/agent/bookings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Bookings
      </Link>

      {isLoading && <DetailSkeleton />}

      {error && !isLoading && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          <button
            onClick={fetchBooking}
            className="mt-3 inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {booking && !isLoading && !error && <BookingDetail booking={booking} />}
    </div>
  );
}
