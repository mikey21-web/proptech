'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  BookOpen,
  Users,
  Building2,
  ArrowUpRight,
  Calendar,
  Target,
  UserCheck,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface DashboardData {
  kpis: {
    totalRevenue: number;
    monthRevenue: number;
    lastMonthRevenue: number;
    totalBookings: number;
    monthBookings: number;
    totalLeads: number;
    convertedLeads: number;
    conversionRate: number;
    agentCount: number;
    activeAgentCount: number;
    projectCount: number;
  };
  revenueChart: Array<{ month: string; revenue: number; target: number }>;
  leadFunnel: Array<{ status: string; count: number }>;
  agentLeaderboard: Array<{
    id: string;
    name: string | null;
    agentCode: string;
    bookingsThisMonth: number;
    revenueThisMonth: number;
    totalCommission: number;
  }>;
  recentBookings: Array<{
    id: string;
    bookingNumber: string;
    status: string;
    bookingDate: string;
    netAmount: number;
    customer: { name: string; phone: string } | null;
    project: { name: string } | null;
    agent: { user: { name: string } } | null;
    plot: { plotNumber: string } | null;
    flat: { flatNumber: string } | null;
  }>;
  inventory: Array<{
    id: string;
    name: string;
    status: string;
    totalUnits: number;
    available: number;
    booked: number;
    sold: number;
  }>;
}

function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toLocaleString('en-IN');
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  processing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300')}>
      {status.replace('_', ' ')}
    </span>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(async (res) => {
        const json = await res.json();
        if (res.ok) {
          setData(json.data);
        } else {
          setError(json.error || 'Failed to load dashboard');
        }
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-6 space-y-3">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-8 w-32 bg-muted rounded animate-pulse" />
              <div className="h-3 w-20 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6 h-72 animate-pulse" />
          <div className="bg-card rounded-xl border border-border p-6 h-72 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <p className="text-destructive font-medium">{error}</p>
          <button onClick={() => window.location.reload()} className="text-sm text-primary hover:underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { kpis } = data;
  const revenueGrowth = kpis.lastMonthRevenue > 0
    ? ((kpis.monthRevenue - kpis.lastMonthRevenue) / kpis.lastMonthRevenue * 100)
    : 0;

  const kpiCards = [
    {
      title: 'Total Revenue',
      value: `₹${formatCurrency(kpis.totalRevenue)}`,
      subValue: `₹${formatCurrency(kpis.monthRevenue)} this month`,
      trend: revenueGrowth,
      icon: IndianRupee,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      title: 'Total Bookings',
      value: kpis.totalBookings.toString(),
      subValue: `${kpis.monthBookings} this month`,
      icon: BookOpen,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'Active Agents',
      value: `${kpis.activeAgentCount}`,
      subValue: `${kpis.agentCount} total registered`,
      icon: Users,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      title: 'Lead Conversion',
      value: `${kpis.conversionRate.toFixed(1)}%`,
      subValue: `${kpis.convertedLeads} of ${kpis.totalLeads} leads`,
      icon: Target,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
    },
  ];

  const maxFunnelCount = Math.max(...data.leadFunnel.map(f => f.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back. Here's what's happening with ClickProps today.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <div className={cn('p-2 rounded-lg', card.bg)}>
                  <Icon className={cn('h-5 w-5', card.color)} />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground">{card.value}</p>
              <div className="flex items-center gap-2 mt-2">
                {card.trend !== undefined && (
                  <span className={cn('flex items-center text-xs font-medium', card.trend >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {card.trend >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                    {Math.abs(card.trend).toFixed(1)}%
                  </span>
                )}
                <p className="text-xs text-muted-foreground">{card.subValue}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Row: Revenue Chart + Lead Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart (bar chart using CSS) */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Revenue Trend</h2>
              <p className="text-sm text-muted-foreground">Last 12 months</p>
            </div>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex items-end gap-2 h-48">
            {data.revenueChart.map((item) => {
              const maxRev = Math.max(...data.revenueChart.map(r => r.revenue), 1);
              const height = Math.max((item.revenue / maxRev) * 100, 2);
              const monthLabel = new Date(item.month + '-01').toLocaleDateString('en-IN', { month: 'short' });
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center justify-end h-40">
                    <span className="text-[10px] text-muted-foreground mb-1">
                      {item.revenue > 0 ? `₹${formatCurrency(item.revenue)}` : ''}
                    </span>
                    <div
                      className="w-full max-w-[32px] rounded-t-md bg-primary/80 hover:bg-primary transition-colors"
                      style={{ height: `${height}%` }}
                      title={`₹${formatCurrency(item.revenue)}`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{monthLabel}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lead Funnel */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Lead Funnel</h2>
              <p className="text-sm text-muted-foreground">{kpis.totalLeads} total leads</p>
            </div>
            <Target className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {data.leadFunnel.filter(f => f.count > 0).map((stage) => (
              <div key={stage.status} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize text-foreground">{stage.status.replace('_', ' ')}</span>
                  <span className="font-medium text-foreground">{stage.count}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(stage.count / maxFunnelCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {data.leadFunnel.every(f => f.count === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">No leads yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Bookings + Agent Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Bookings */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border">
          <div className="flex items-center justify-between p-6 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Recent Bookings</h2>
              <p className="text-sm text-muted-foreground">{kpis.totalBookings} total bookings</p>
            </div>
            <a href="/admin/bookings" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-t border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Booking #</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Customer</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Project</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Amount</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentBookings.length > 0 ? data.recentBookings.map((b) => (
                  <tr key={b.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-3 text-sm font-medium text-foreground">{b.bookingNumber}</td>
                    <td className="px-6 py-3 text-sm text-foreground">{b.customer?.name || '—'}</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{b.project?.name || '—'}</td>
                    <td className="px-6 py-3 text-sm font-medium text-foreground">₹{formatCurrency(Number(b.netAmount))}</td>
                    <td className="px-6 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{formatDate(b.bookingDate)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">
                      No bookings yet. Bookings will appear here once created.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Agent Leaderboard */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Top Agents</h2>
              <p className="text-sm text-muted-foreground">This month</p>
            </div>
            <UserCheck className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            {data.agentLeaderboard.length > 0 ? data.agentLeaderboard.slice(0, 5).map((agent, idx) => (
              <div key={agent.id} className="flex items-center gap-3">
                <div className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold',
                  idx === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                  idx === 1 ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' :
                  idx === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                  'bg-muted text-muted-foreground'
                )}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{agent.name || agent.agentCode}</p>
                  <p className="text-xs text-muted-foreground">{agent.bookingsThisMonth} bookings</p>
                </div>
                <p className="text-sm font-semibold text-foreground">₹{formatCurrency(agent.revenueThisMonth)}</p>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-4">No agent data this month</p>
            )}
          </div>
        </div>
      </div>

      {/* Project Inventory */}
      {data.inventory.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Project Inventory</h2>
              <p className="text-sm text-muted-foreground">{kpis.projectCount} projects</p>
            </div>
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.inventory.map((project) => {
              const total = project.totalUnits || 1;
              return (
                <div key={project.id} className="border border-border rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-foreground">{project.name}</h3>
                    <StatusBadge status={project.status} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                      <div className="bg-green-500" style={{ width: `${(project.available / total) * 100}%` }} />
                      <div className="bg-yellow-500" style={{ width: `${(project.booked / total) * 100}%` }} />
                      <div className="bg-blue-500" style={{ width: `${(project.sold / total) * 100}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> {project.available} Available</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500" /> {project.booked} Booked</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> {project.sold} Sold</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
