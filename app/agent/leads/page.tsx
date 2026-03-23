'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LeadTable, type LeadRow } from '@/components/agent/LeadTable';
import { LeadForm } from '@/components/agent/LeadForm';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { MetricCard } from '@/components/ui/MetricCard';
import { useToast } from '@/components/ui/Toast';
import { Users, UserPlus, Filter, X, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function LeadsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchLeads = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await fetch(`/api/leads?${params.toString()}`);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error);
      }

      setLeads(json.data.leads);
      setPagination(json.data.pagination);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load leads', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, priorityFilter, debouncedSearch, toast]);

  useEffect(() => {
    fetchLeads(1);
  }, [fetchLeads]);

  const handlePageChange = (page: number) => {
    fetchLeads(page);
  };

  const clearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setSearchQuery('');
  };

  const hasFilters = statusFilter || priorityFilter || searchQuery;

  // Quick stats from current page data
  const statusCounts = leads.reduce(
    (acc, l) => {
      acc[l.status] = (acc[l.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pagination.total} lead{pagination.total !== 1 ? 's' : ''} assigned to you
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
              showFilters || hasFilters
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-foreground hover:bg-accent',
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasFilters && (
              <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                !
              </span>
            )}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Lead
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Leads" value={String(pagination.total)} icon={Users} />
        <MetricCard
          title="New"
          value={String(statusCounts['new'] ?? 0)}
          icon={UserPlus}
        />
        <MetricCard
          title="Won"
          value={String(statusCounts['won'] ?? 0)}
          className="border-green-200 dark:border-green-800"
        />
        <MetricCard
          title="In Progress"
          value={String(
            (statusCounts['contacted'] ?? 0) +
            (statusCounts['qualified'] ?? 0) +
            (statusCounts['negotiation'] ?? 0) +
            (statusCounts['site_visit'] ?? 0) +
            (statusCounts['proposal_sent'] ?? 0),
          )}
        />
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Create New Lead</h2>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground"
              aria-label="Close form"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <LeadForm
            onSuccess={() => {
              setShowForm(false);
              fetchLeads(1);
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, phone, email..."
                className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Search leads"
              />
            </div>
            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="negotiation">Negotiation</option>
              <option value="site_visit">Site Visit</option>
              <option value="proposal_sent">Proposal Sent</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="junk">Junk</option>
            </select>
            {/* Priority filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              aria-label="Filter by priority"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={10} cols={7} />
        ) : (
          <>
            <LeadTable
              leads={leads}
              onRowClick={(id) => router.push(`/agent/leads/${id}`)}
            />
            <div className="border-t border-border">
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={handlePageChange}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
