'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Search, Filter, Phone, Mail, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  status: string;
  priority: string;
  budget: number | null;
  createdAt: string;
  assignedTo: { id: string; name: string | null } | null;
  leadSource: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
}

function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  contacted: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  qualified: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  negotiation: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  site_visit: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  proposal_sent: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  won: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  lost: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  junk: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ limit: '100' });
    if (statusFilter) params.set('status', statusFilter);
    if (search) params.set('search', search);

    fetch(`/api/leads?${params}`)
      .then(async (res) => {
        const json = await res.json();
        if (res.ok) {
          setLeads(json.data?.leads || []);
          setTotal(json.data?.pagination?.total || 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [statusFilter, search]);

  const statuses = ['new', 'contacted', 'qualified', 'negotiation', 'site_visit', 'proposal_sent', 'won', 'lost', 'junk'];

  // Funnel counts
  const funnelCounts = statuses.reduce((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} total leads in pipeline</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors w-fit">
          <Plus className="h-4 w-4" />
          New Lead
        </button>
      </div>

      {/* Funnel Summary */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
            className={cn(
              'rounded-lg border p-3 text-center transition-all hover:shadow-sm',
              statusFilter === s
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border bg-card',
            )}
          >
            <p className="text-lg font-bold text-foreground">{funnelCounts[s] || 0}</p>
            <p className="text-[10px] font-medium text-muted-foreground capitalize truncate">{s.replace('_', ' ')}</p>
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 flex-1 max-w-sm w-full">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
          />
        </div>
        {statusFilter && (
          <button
            onClick={() => setStatusFilter('')}
            className="text-xs text-primary hover:underline"
          >
            Clear filter: {statusFilter.replace('_', ' ')}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {search || statusFilter ? 'No leads match your filters' : 'No leads yet. Create your first lead.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Lead</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3 hidden md:table-cell">Contact</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3 hidden sm:table-cell">Priority</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3 hidden lg:table-cell">Source</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3 hidden lg:table-cell">Project</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3 hidden md:table-cell">Budget</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3 hidden xl:table-cell">Assigned To</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3 hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary">{lead.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground truncate max-w-[140px]">{lead.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <p className="text-sm text-foreground flex items-center gap-1"><Phone className="h-3 w-3 flex-shrink-0" /> {lead.phone}</p>
                      {lead.email && <p className="text-xs text-muted-foreground truncate max-w-[180px]">{lead.email}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize', statusColors[lead.status] || 'bg-gray-100 text-gray-800')}>
                        {lead.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize', priorityColors[lead.priority] || 'bg-gray-100 text-gray-700')}>
                        {lead.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell text-sm text-muted-foreground">{lead.leadSource?.name || '—'}</td>
                    <td className="px-6 py-4 hidden lg:table-cell text-sm text-foreground">{lead.project?.name || '—'}</td>
                    <td className="px-6 py-4 hidden md:table-cell text-sm font-medium text-foreground">
                      {lead.budget ? formatCurrency(Number(lead.budget)) : '—'}
                    </td>
                    <td className="px-6 py-4 hidden xl:table-cell text-sm text-muted-foreground">{lead.assignedTo?.name || '—'}</td>
                    <td className="px-6 py-4 hidden lg:table-cell text-sm text-muted-foreground">
                      {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
