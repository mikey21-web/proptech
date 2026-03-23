'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  TrendingUp,
  Users,
  BookOpen,
  BarChart3,
  Calendar,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatCompactCurrency } from '@/lib/utils/format';

type ReportType = 'lead' | 'booking' | 'agent' | 'financial' | 'project';

interface DateRange { from: string; to: string; }

const REPORT_TYPES: { key: ReportType; label: string; description: string; icon: typeof FileText }[] = [
  { key: 'lead', label: 'Lead Report', description: 'Lead pipeline, conversion rates, source analysis', icon: Users },
  { key: 'booking', label: 'Booking Report', description: 'Bookings, revenue, payment collection status', icon: BookOpen },
  { key: 'agent', label: 'Agent Report', description: 'Agent performance, commissions, productivity', icon: BarChart3 },
  { key: 'financial', label: 'Financial Report', description: 'Revenue, collections, outstanding, refunds', icon: TrendingUp },
  { key: 'project', label: 'Project Report', description: 'Project-wise inventory, sales, availability', icon: FileText },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState<ReportType>('booking');
  const [dateRange, setDateRange] = useState<DateRange>({ from: '', to: '' });
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ type: selectedType });
      if (dateRange.from && dateRange.to) {
        params.set('from', dateRange.from);
        params.set('to', dateRange.to);
      }
      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setReport(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [selectedType]);

  const handleExport = (format: 'csv' | 'pdf') => {
    if (!report) return;
    const json = JSON.stringify(report.report, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedType}-report-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'json' : format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const r = report?.report;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate and export business reports</p>
        </div>
        <button
          onClick={() => handleExport('csv')}
          disabled={!report}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Report type selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {REPORT_TYPES.map((rt) => {
          const Icon = rt.icon;
          const isActive = selectedType === rt.key;
          return (
            <button
              key={rt.key}
              onClick={() => setSelectedType(rt.key)}
              className={cn(
                'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all',
                isActive
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-primary/30 hover:shadow-sm',
              )}
            >
              <div className={cn('p-2 rounded-lg', isActive ? 'bg-primary/15' : 'bg-muted')}>
                <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
              </div>
              <div>
                <p className={cn('text-sm font-semibold', isActive ? 'text-primary' : 'text-foreground')}>{rt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rt.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Date Range</span>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange((d) => ({ ...d, from: e.target.value }))}
            className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange((d) => ({ ...d, to: e.target.value }))}
            className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={fetchReport}
          className="ml-auto inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Apply <ArrowRight className="h-3 w-3" />
        </button>
        {(dateRange.from || dateRange.to) && (
          <button
            onClick={() => setDateRange({ from: '', to: '' })}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {/* Report content */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-secondary animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-secondary animate-pulse" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-8 text-center">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          <button onClick={fetchReport} className="mt-3 text-xs font-medium text-red-600 hover:text-red-700">
            Try Again
          </button>
        </div>
      ) : report && r ? (
        <div className="space-y-6">
          {selectedType === 'lead' && <LeadReport data={r} />}
          {selectedType === 'booking' && <BookingReport data={r} />}
          {selectedType === 'agent' && <AgentReport data={r} />}
          {selectedType === 'financial' && <FinancialReport data={r} />}
          {selectedType === 'project' && <ProjectReport data={r} />}
        </div>
      ) : null}
    </div>
  );
}

function LeadReport({ data }: { data: any }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Total Leads" value={data.totalLeads} />
        <Metric label="New Leads" value={data.newLeads} />
        <Metric label="Converted" value={data.convertedLeads} accent="text-green-600" />
        <Metric label="Conversion Rate" value={`${data.conversionRate?.toFixed(1)}%`} accent="text-blue-600" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-base font-semibold mb-4">Status Breakdown</h3>
          <div className="space-y-2">
            {data.statusBreakdown?.map((s: any) => (
              <div key={s.status} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground capitalize">{s.status.replace('_', ' ')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${s.percentage}%` }} />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{s.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-base font-semibold mb-4">Source Breakdown</h3>
          <div className="space-y-2">
            {data.sourceBreakdown?.map((s: any) => (
              <div key={s.source} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.source || 'Unknown'}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${s.percentage}%` }} />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{s.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function BookingReport({ data }: { data: any }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Total Bookings" value={data.totalBookings} />
        <Metric label="Total Revenue" value={formatCompactCurrency(data.totalRevenue)} accent="text-green-600" />
        <Metric label="Collected" value={formatCompactCurrency(data.paidAmount)} />
        <Metric label="Outstanding" value={formatCompactCurrency(data.outstandingAmount)} accent="text-amber-600" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-base font-semibold mb-4">Status Breakdown</h3>
          <div className="space-y-2">
            {data.statusBreakdown?.map((s: any) => (
              <div key={s.status} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground capitalize">{s.status.replace('_', ' ')}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{s.count}</span>
                  <span className="text-xs text-muted-foreground">{formatCompactCurrency(s.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-base font-semibold mb-4">Project Breakdown</h3>
          <div className="space-y-2">
            {data.projectBreakdown?.map((p: any) => (
              <div key={p.project} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground truncate max-w-[150px]">{p.project}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{p.bookings}</span>
                  <span className="text-xs text-green-600">{formatCompactCurrency(p.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function AgentReport({ data }: { data: any }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Metric label="Total Agents" value={data.totalAgents} />
        <Metric label="Active Agents" value={data.activeAgents} accent="text-green-600" />
        <Metric label="Total Commission" value={formatCompactCurrency(
          data.agents?.reduce((s: number, a: any) => s + a.commissionEarned, 0) || 0
        )} />
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Agent', 'Code', 'Bookings', 'Revenue', 'Conversion', 'Commission Earned', 'Pending'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.agents?.map((a: any) => (
                <tr key={a.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{a.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{a.agentCode}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{a.bookings}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{formatCurrency(a.revenue)}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{a.conversionRate?.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-sm text-green-600">{formatCurrency(a.commissionEarned)}</td>
                  <td className="px-4 py-3 text-sm text-amber-600">{formatCurrency(a.commissionPending)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function FinancialReport({ data }: { data: any }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Total Revenue" value={formatCompactCurrency(data.totalRevenue)} accent="text-green-600" />
        <Metric label="Collected" value={formatCompactCurrency(data.collectedAmount)} />
        <Metric label="Outstanding" value={formatCompactCurrency(data.outstandingAmount)} accent="text-amber-600" />
        <Metric label="Overdue" value={formatCompactCurrency(data.overdueAmount)} accent="text-red-600" />
        <Metric label="Refunded" value={formatCompactCurrency(data.refundedAmount)} />
        <Metric label="Commission Paid" value={formatCompactCurrency(data.commissionPaid)} />
        <Metric label="Commission Pending" value={formatCompactCurrency(data.commissionPending)} />
        <Metric label="Target" value={formatCompactCurrency(data.revenueTarget)} />
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-base font-semibold mb-4">Monthly Revenue Trend</h3>
        <div className="space-y-2">
          {data.monthlyRevenue?.map((m: any) => (
            <div key={m.month} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground w-20">{m.month}</span>
              <div className="flex items-center gap-3 flex-1 max-w-xs">
                <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500"
                    style={{ width: `${Math.min(100, (m.revenue / (data.revenueTarget || 1)) * 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-medium w-20 text-right">{formatCompactCurrency(m.revenue)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function ProjectReport({ data }: { data: any }) {
  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['Project', 'Type', 'Status', 'Total Units', 'Available', 'Booked', 'Sold', 'Revenue'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.projects?.map((p: any) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{p.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{p.type}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                      p.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      p.status === 'upcoming' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                    )}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{p.totalUnits}</td>
                  <td className="px-4 py-3 text-sm text-green-600">{p.availableUnits}</td>
                  <td className="px-4 py-3 text-sm text-blue-600">{p.bookedUnits}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{p.soldUnits}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{formatCompactCurrency(p.totalRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Metric({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', accent || 'text-foreground')}>{value}</p>
    </div>
  );
}
