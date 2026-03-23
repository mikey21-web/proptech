'use client';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { WhatsAppButton } from '@/components/agent/WhatsAppButton';
import { formatDate, formatRelativeTime, formatCurrency } from '@/lib/utils';
import {
  Phone,
  Mail,
  Calendar,
  User,
  Briefcase,
  MessageSquare,
  Activity,
  Clock,
} from 'lucide-react';

interface Communication {
  id: string;
  type: string;
  direction: string;
  subject: string | null;
  outcome: string | null;
  createdAt: string;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  createdAt: string;
}

interface LeadDetailData {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  altPhone: string | null;
  status: string;
  priority: string;
  budget: number | string | null;
  notes: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo: { id: string; name: string; email: string } | null;
  createdBy: { id: string; name: string } | null;
  leadSource: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  customer: { id: string; name: string; phone: string } | null;
  communications: Communication[];
  activities: ActivityItem[];
}

interface LeadDetailProps {
  lead: LeadDetailData;
  onStatusChange?: (status: string) => void;
}

export function LeadDetail({ lead, onStatusChange }: LeadDetailProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{lead.name}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <StatusBadge status={lead.status} size="md" />
            <StatusBadge status={lead.priority} size="md" />
            {lead.source && (
              <span className="text-sm text-muted-foreground">Source: {lead.leadSource?.name ?? lead.source}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {lead.phone && <WhatsAppButton phone={lead.phone} message={`Hi ${lead.name}, `} />}
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Phone className="h-3.5 w-3.5" /> Call
            </a>
          )}
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              <Mail className="h-3.5 w-3.5" /> Email
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact info card */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={Phone} label="Phone" value={lead.phone} />
              {lead.altPhone && <InfoRow icon={Phone} label="Alt Phone" value={lead.altPhone} />}
              {lead.email && <InfoRow icon={Mail} label="Email" value={lead.email} />}
              {lead.budget && <InfoRow icon={Briefcase} label="Budget" value={formatCurrency(Number(lead.budget))} />}
              {lead.project && <InfoRow icon={Briefcase} label="Project" value={lead.project.name} />}
              {lead.customer && <InfoRow icon={User} label="Customer" value={lead.customer.name} />}
              <InfoRow icon={Calendar} label="Created" value={formatDate(lead.createdAt)} />
              <InfoRow icon={Clock} label="Updated" value={formatRelativeTime(lead.updatedAt)} />
              {lead.assignedTo && <InfoRow icon={User} label="Assigned To" value={lead.assignedTo.name} />}
              {lead.createdBy && <InfoRow icon={User} label="Created By" value={lead.createdBy.name} />}
            </div>
          </div>

          {/* Notes */}
          {lead.notes && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-3">Notes</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          {/* Quick status change */}
          {onStatusChange && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-3">Quick Status Update</h2>
              <div className="flex flex-wrap gap-2">
                {['new', 'contacted', 'qualified', 'negotiation', 'site_visit', 'proposal_sent', 'won', 'lost', 'junk'].map((s) => (
                  <button
                    key={s}
                    onClick={() => onStatusChange(s)}
                    disabled={lead.status === s}
                    className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium border transition-colors ${
                      lead.status === s
                        ? 'border-primary bg-primary/10 text-primary cursor-default'
                        : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    {s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Timeline */}
        <div className="space-y-6">
          {/* Communications */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Communications
            </h2>
            {lead.communications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No communications yet.</p>
            ) : (
              <div className="space-y-3">
                {lead.communications.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="mt-1 flex-shrink-0 h-2 w-2 rounded-full bg-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={c.type} />
                        <span className="text-xs text-muted-foreground capitalize">{c.direction}</span>
                      </div>
                      {c.subject && <p className="text-sm text-foreground mt-1">{c.subject}</p>}
                      {c.outcome && <p className="text-xs text-muted-foreground mt-0.5">{c.outcome}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(c.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activities */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4" /> Recent Activity
            </h2>
            {lead.activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <div className="space-y-3">
                {lead.activities.map((a) => (
                  <div key={a.id} className="flex gap-3">
                    <div className="mt-1 flex-shrink-0 h-2 w-2 rounded-full bg-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{a.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge status={a.type} />
                        <span className="text-xs text-muted-foreground">{formatRelativeTime(a.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
