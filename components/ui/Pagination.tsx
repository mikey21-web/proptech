'use client';

import { cn } from '@/lib/utils/cn';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, total, limit, onPageChange, className }: PaginationProps) {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  if (totalPages <= 1) return null;

  return (
    <div className={cn('flex items-center justify-between px-4 py-3', className)}>
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{start}</span> to{' '}
        <span className="font-medium text-foreground">{end}</span> of{' '}
        <span className="font-medium text-foreground">{total}</span> results
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>
        <div className="flex items-center gap-1">
          {generatePageNumbers(page, totalPages).map((p, i) =>
            p === '...' ? (
              <span key={`dots-${i}`} className="px-2 text-muted-foreground">
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors',
                  p === page
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent',
                )}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </button>
            ),
          )}
        </div>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function generatePageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [1];

  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('...');

  pages.push(total);
  return pages;
}
