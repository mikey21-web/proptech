'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatRelativeTime, formatCurrency } from '@/lib/utils';
import {
  Eye,
  Phone,
  Mail,
  MoreHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

export interface LeadRow {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  status: string;
  priority: string;
  budget: number | string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo: { id: string; name: string; email: string } | null;
  leadSource: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  customer: { id: string; name: string } | null;
}

interface LeadTableProps {
  leads: LeadRow[];
  onStatusChange?: (id: string, status: string) => void;
  onRowClick?: (id: string) => void;
}

type SortField = 'name' | 'status' | 'priority' | 'createdAt';
type SortDir = 'asc' | 'desc';

export function LeadTable({ leads, onStatusChange, onRowClick }: LeadTableProps) {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sorted = [...leads].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortField === 'name') return a.name.localeCompare(b.name) * dir;
    if (sortField === 'status') return a.status.localeCompare(b.status) * dir;
    if (sortField === 'priority') {
      const order: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
      return ((order[a.priority] ?? 0) - (order[b.priority] ?? 0)) * dir;
    }
    return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-primary" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-primary" />
    );
  };

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Phone className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No leads found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your filters or create a new lead.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" role="grid">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left">
              <button onClick={() => toggleSort('name')} className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
                Lead <SortIcon field="name" />
              </button>
            </th>
            <th className="px-4 py-3 text-left">
              <button onClick={() => toggleSort('status')} className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
                Status <SortIcon field="status" />
              </button>
            </th>
            <th className="px-4 py-3 text-left">
              <button onClick={() => toggleSort('priority')} className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
                Priority <SortIcon field="priority" />
              </button>
            </th>
            <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Source
            </th>
            <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Budget
            </th>
            <th className="px-4 py-3 text-left">
              <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
                Created <SortIcon field="createdAt" />
              </button>
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((lead) => (
            <tr
              key={lead.id}
              className="hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => onRowClick?.(lead.id)}
              tabIndex={0}
              role="row"
              onKeyDown={(e) => { if (e.key === 'Enter') onRowClick?.(lead.id); }}
            >
              <td className="px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{lead.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{lead.phone}</span>
                    {lead.email && (
                      <span className="hidden sm:inline text-xs text-muted-foreground truncate max-w-[160px]">
                        | {lead.email}
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={lead.status} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={lead.priority} />
              </td>
              <td className="hidden md:table-cell px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  {lead.leadSource?.name ?? lead.source ?? '-'}
                </span>
              </td>
              <td className="hidden lg:table-cell px-4 py-3">
                <span className="text-sm text-foreground">
                  {lead.budget ? formatCurrency(Number(lead.budget)) : '-'}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  {formatRelativeTime(lead.createdAt)}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <Link
                    href={`/agent/leads/${lead.id}`}
                    className="inline-flex items-center rounded-md p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    aria-label={`View lead ${lead.name}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      className="inline-flex items-center rounded-md p-1.5 text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                      aria-label={`Call ${lead.name}`}
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                  {lead.email && (
                    <a
                      href={`mailto:${lead.email}`}
                      className="hidden sm:inline-flex items-center rounded-md p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      aria-label={`Email ${lead.name}`}
                    >
                      <Mail className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
