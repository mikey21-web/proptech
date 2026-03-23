'use client';

import { useState, useEffect, useCallback } from 'react';
import { PerformanceMetrics } from '@/components/agent/PerformanceMetrics';
import { CommissionChart } from '@/components/agent/CommissionChart';
import { CardSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

export default function CommissionsPage() {
  const { toast } = useToast();
  const [commissions, setCommissions] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalEarned: 0,
    totalPending: 0,
    totalPaid: 0,
    currentMonth: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchCommissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/commissions');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setCommissions(json.data.commissions);
      setSummary(json.data.summary);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load commissions', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Commission & Performance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your earnings, commissions, and performance metrics.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
          <TableSkeleton rows={5} cols={6} />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Performance metrics */}
          <PerformanceMetrics commissions={commissions} summary={summary} />

          {/* Commission chart */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Commission Breakdown</h2>
            <CommissionChart commissions={commissions} />
          </div>
        </div>
      )}
    </div>
  );
}
