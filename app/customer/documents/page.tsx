'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatDate } from '@/lib/utils/format';
import DocumentChecklist from '@/components/customer/DocumentChecklist';
import DocumentUpload from '@/components/customer/DocumentUpload';

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const uploadType = searchParams.get('upload');

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeUpload, setActiveUpload] = useState<string | null>(uploadType);

  const fetchData = () => {
    setLoading(true);
    fetch('/api/customer/documents')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
        else setError(d.error || 'Failed to load documents');
      })
      .catch(() => setError('Failed to load documents'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleUploadClick = (type: string) => {
    setActiveUpload(type);
  };

  const handleUploadSuccess = () => {
    setActiveUpload(null);
    fetchData();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-secondary rounded animate-pulse" />
        <div className="h-32 rounded-xl bg-secondary animate-pulse" />
        <div className="h-64 rounded-xl bg-secondary animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3" />
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  const { documents, checklist, summary } = data;
  const uploadLabel = checklist.find((c: any) => c.type === activeUpload)?.label || activeUpload || '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Documents</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload required documents and track their verification status.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="inline-flex rounded-lg p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            <FileText className="h-5 w-5" />
          </div>
          <p className="mt-2 text-xl font-bold text-foreground">
            {summary.total}
          </p>
          <p className="text-xs text-muted-foreground">Total Uploaded</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="inline-flex rounded-lg p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
            <Shield className="h-5 w-5" />
          </div>
          <p className="mt-2 text-xl font-bold text-foreground">
            {summary.verified}
          </p>
          <p className="text-xs text-muted-foreground">Verified</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="inline-flex rounded-lg p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
          <p className="mt-2 text-xl font-bold text-foreground">
            {summary.pending}
          </p>
          <p className="text-xs text-muted-foreground">Pending Review</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className={cn(
            'inline-flex rounded-lg p-2',
            summary.requiredCompleted === summary.requiredTotal
              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
          )}>
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="mt-2 text-xl font-bold text-foreground">
            {summary.requiredCompleted}/{summary.requiredTotal}
          </p>
          <p className="text-xs text-muted-foreground">Required Docs</p>
        </div>
      </div>

      {/* Upload modal */}
      {activeUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <DocumentUpload
              documentType={activeUpload}
              documentLabel={uploadLabel}
              onSuccess={handleUploadSuccess}
              onCancel={() => setActiveUpload(null)}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Checklist */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">
            Required Documents
          </h2>
          <DocumentChecklist
            items={checklist}
            onUpload={handleUploadClick}
          />
        </div>

        {/* All uploaded documents */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            All Uploads
          </h3>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No documents uploaded yet.
            </p>
          ) : (
            <ul className="space-y-3" role="list">
              {documents.map((doc: any) => (
                <li key={doc.id} className="flex items-start gap-3">
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0',
                    doc.isVerified
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                  )}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {doc.fileName || doc.type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {doc.type.replace('_', ' ')} | {formatDate(doc.createdAt)}
                    </p>
                    <span className={cn(
                      'text-xs font-medium',
                      doc.isVerified ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400',
                    )}>
                      {doc.isVerified ? 'Verified' : 'Under review'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
