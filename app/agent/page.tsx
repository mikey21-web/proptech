'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Target,
  BookOpen,
  IndianRupee,
  TrendingUp,
  Users,
  Calendar,
} from 'lucide-react';

interface DashboardStats {
  totalLeads: number;
  activeLeads: number;
  totalBookings: number;
  totalCommission: number;
  pendingCommission: number;
  upcomingFollowUps: number;
}

export default function AgentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    activeLeads: 0,
    totalBookings: 0,
    totalCommission: 0,
    pendingCommission: 0,
    upcomingFollowUps: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    Promise.all([
      fetch('/api/leads?limit=1').then((r) => r.json()).catch(() => ({ data: { total: 0 } })),
      fetch('/api/commissions').then((r) => r.json()).catch(() => ({ data: { totalEarned: 0, totalPending: 0 } })),
    ])
      .then(([leadsRes, commRes]) => {
        setStats({
          totalLeads: leadsRes.data?.pagination?.total || leadsRes.data?.total || 0,
          activeLeads: leadsRes.data?.pagination?.total || leadsRes.data?.total || 0,
          totalBookings: 0,
          totalCommission: commRes.data?.totalEarned || 0,
          pendingCommission: commRes.data?.totalPending || 0,
          upcomingFollowUps: 0,
        });
      })
      .finally(() => setLoading(false));
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') return null;

  const cards = [
    {
      label: 'My Leads',
      value: stats.totalLeads,
      icon: Target,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      href: '/agent/leads',
    },
    {
      label: 'Active Bookings',
      value: stats.totalBookings,
      icon: BookOpen,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950/30',
      href: '/agent/bookings',
    },
    {
      label: 'Total Commission',
      value: `₹${(stats.totalCommission / 100000).toFixed(1)}L`,
      icon: IndianRupee,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50 dark:bg-yellow-950/30',
      href: '/agent/commissions',
    },
    {
      label: 'Pending Commission',
      value: `₹${(stats.pendingCommission / 100000).toFixed(1)}L`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      href: '/agent/commissions',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome, {session?.user?.name || 'Agent'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here&apos;s your sales overview
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={() => router.push(card.href)}
              className="bg-card border border-border rounded-xl p-5 text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{card.label}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
