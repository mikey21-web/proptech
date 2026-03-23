'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LeadDetail } from '@/components/agent/LeadDetail';
import { LeadForm } from '@/components/agent/LeadForm';
import { DetailSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { ArrowLeft, Pencil, X } from 'lucide-react';
import Link from 'next/link';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [lead, setLead] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leadId = params.id as string;

  const fetchLead = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setLead(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lead');
      toast('Failed to load lead details', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [leadId, toast]);

  useEffect(() => {
    if (leadId) fetchLead();
  }, [leadId, fetchLead]);

  const handleStatusChange = async (status: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast(`Status updated to ${status.replace(/_/g, ' ')}`, 'success');
      fetchLead();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update status', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <div className="flex items-center justify-between">
        <Link
          href="/agent/leads"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Leads
        </Link>
        {lead && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Pencil className="h-4 w-4" /> Edit
          </button>
        )}
      </div>

      {isLoading && <DetailSkeleton />}

      {error && !isLoading && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          <button
            onClick={fetchLead}
            className="mt-3 inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {lead && !isLoading && !error && (
        <>
          {isEditing ? (
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Edit Lead</h2>
                <button
                  onClick={() => setIsEditing(false)}
                  className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Close edit form"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <LeadForm
                initialData={{
                  id: lead.id,
                  name: lead.name,
                  phone: lead.phone,
                  email: lead.email ?? '',
                  altPhone: lead.altPhone ?? '',
                  status: lead.status,
                  priority: lead.priority,
                  budget: lead.budget ? String(lead.budget) : '',
                  source: lead.source ?? '',
                  notes: lead.notes ?? '',
                }}
                onSuccess={() => {
                  setIsEditing(false);
                  fetchLead();
                }}
                onCancel={() => setIsEditing(false)}
              />
            </div>
          ) : (
            <LeadDetail lead={lead} onStatusChange={handleStatusChange} />
          )}
        </>
      )}
    </div>
  );
}
