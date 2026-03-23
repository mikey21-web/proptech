'use client';

import {
  CheckCircle2,
  Circle,
  Upload,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ChecklistItem {
  type: string;
  label: string;
  required: boolean;
  uploaded: boolean;
  verified: boolean;
  document?: {
    id: string;
    fileName: string;
    createdAt: string;
  } | null;
}

interface DocumentChecklistProps {
  items: ChecklistItem[];
  onUpload?: (type: string) => void;
  className?: string;
}

export default function DocumentChecklist({
  items,
  onUpload,
  className,
}: DocumentChecklistProps) {
  const totalRequired = items.filter((i) => i.required).length;
  const completedRequired = items.filter((i) => i.required && i.uploaded).length;
  const progress = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 100;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Progress summary */}
      <div className="rounded-lg bg-secondary/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Documents Completed
          </span>
          <span className="text-sm font-semibold text-primary">
            {completedRequired}/{totalRequired} required
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-secondary" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              progress === 100 ? 'bg-green-500' : 'bg-primary',
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <ul className="divide-y divide-border" role="list" aria-label="Document checklist">
        {items.map((item) => (
          <li
            key={item.type}
            className="flex items-center justify-between py-3 gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Status icon */}
              {item.verified ? (
                <Shield className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
              ) : item.uploaded ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              ) : item.required ? (
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500 dark:text-amber-400" />
              ) : (
                <Circle className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              )}

              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.label}
                  {item.required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </p>
                {item.uploaded && item.document ? (
                  <p className="text-xs text-muted-foreground truncate">
                    {item.document.fileName}
                    {item.verified && ' — Verified'}
                    {!item.verified && ' — Under review'}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {item.required ? 'Required — Please upload' : 'Optional'}
                  </p>
                )}
              </div>
            </div>

            {/* Upload button */}
            {!item.uploaded && onUpload && (
              <button
                onClick={() => onUpload(item.type)}
                className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                aria-label={`Upload ${item.label}`}
              >
                <Upload className="h-3.5 w-3.5" />
                Upload
              </button>
            )}

            {/* Status badge */}
            {item.uploaded && (
              <span
                className={cn(
                  'flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                  item.verified
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
                )}
              >
                {item.verified ? 'Verified' : 'Pending'}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
