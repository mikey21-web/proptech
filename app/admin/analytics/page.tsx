'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, IndianRupee, Users, Target, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface AnalyticsData {
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
  revenueChart: Array<{ month: string; revenue: number }>;
  leadFunnel: Array<{ status: string; count: number }>;
}

function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(1)} L`;
  return amount.toLocaleString('en-IN');
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(async (res) => {
        const json = await res.json();
        if (res.ok) setData(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-6 h-64 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Failed to load analytics</p>
      </div>
    );
  }

  const { kpis } = data;
  const maxRev = Math.max(...data.revenueChart.map(r => r.revenue), 1);
  const maxFunnel = Math.max(...data.leadFunnel.map(f => f.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Business insights and performance metrics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Revenue', value: `₹${formatCurrency(kpis.totalRevenue)}`, icon: IndianRupee, color: 'text-green-600' },
          { label: 'Bookings', value: kpis.totalBookings, icon: BarChart3, color: 'text-blue-600' },
          { label: 'Leads', value: kpis.totalLeads, icon: Users, color: 'text-purple-600' },
          { label: 'Conversion', value: `${kpis.conversionRate.toFixed(1)}%`, icon: Target, color: 'text-orange-600' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn('h-4 w-4', item.color)} />
                <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{item.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">Monthly Revenue</h2>
          <p className="text-sm text-muted-foreground mb-6">Last 12 months performance</p>
          <div className="flex items-end gap-1.5 h-48">
            {data.revenueChart.map((item) => {
              const height = Math.max((item.revenue / maxRev) * 100, 3);
              const monthLabel = new Date(item.month + '-01').toLocaleDateString('en-IN', { month: 'short' });
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex items-end justify-center h-40">
                    <div
                      className="w-full max-w-[28px] rounded-t bg-primary/80 hover:bg-primary transition-colors"
                      style={{ height: `${height}%` }}
                      title={`${monthLabel}: ₹${formatCurrency(item.revenue)}`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1">{monthLabel}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lead Funnel */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">Lead Pipeline</h2>
          <p className="text-sm text-muted-foreground mb-6">{kpis.totalLeads} total leads</p>
          <div className="space-y-4">
            {data.leadFunnel.map((stage) => (
              <div key={stage.status}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="capitalize text-foreground font-medium">{stage.status.replace('_', ' ')}</span>
                  <span className="text-muted-foreground">{stage.count}</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all',
                      stage.status === 'won' ? 'bg-green-500' :
                      stage.status === 'lost' ? 'bg-red-400' :
                      stage.status === 'junk' ? 'bg-gray-400' :
                      'bg-primary'
                    )}
                    style={{ width: `${(stage.count / maxFunnel) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Performance */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">Agent Overview</h2>
          <p className="text-sm text-muted-foreground mb-6">Team performance summary</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-foreground">{kpis.activeAgentCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Active Agents</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-foreground">{kpis.agentCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Agents</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-foreground">{kpis.projectCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Projects</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-foreground">{kpis.monthBookings}</p>
              <p className="text-xs text-muted-foreground mt-1">This Month</p>
            </div>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">Revenue Breakdown</h2>
          <p className="text-sm text-muted-foreground mb-6">Current vs previous month</p>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-foreground">This Month</span>
                <span className="text-sm font-semibold text-foreground">₹{formatCurrency(kpis.monthRevenue)}</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min((kpis.monthRevenue / Math.max(kpis.lastMonthRevenue, kpis.monthRevenue, 1)) * 100, 100)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-foreground">Last Month</span>
                <span className="text-sm font-semibold text-foreground">₹{formatCurrency(kpis.lastMonthRevenue)}</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-muted-foreground/30" style={{ width: `${Math.min((kpis.lastMonthRevenue / Math.max(kpis.lastMonthRevenue, kpis.monthRevenue, 1)) * 100, 100)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-foreground">All Time</span>
                <span className="text-sm font-semibold text-foreground">₹{formatCurrency(kpis.totalRevenue)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
