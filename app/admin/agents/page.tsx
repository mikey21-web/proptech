'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UsersRound, Plus, Search, Phone, Mail, IndianRupee, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface Agent {
  id: string;
  agentCode: string;
  isActive: boolean;
  reraNumber: string | null;
  name: string | null;
  email: string;
  phone: string | null;
  image: string | null;
  team: { id: string; name: string; leaderName: string | null } | null;
  totalBookings: number;
  totalCommissions: number;
  paidCommission: number;
  createdAt: string;
}

function formatCurrency(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/agents?includeInactive=true')
      .then(async (res) => {
        const json = await res.json();
        if (res.ok) setAgents(json.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = agents.filter(
    (a) =>
      (a.name || '').toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.agentCode.toLowerCase().includes(search.toLowerCase()),
  );

  const activeCount = agents.filter((a) => a.isActive).length;
  const totalCommission = agents.reduce((s, a) => s + a.paidCommission, 0);
  const totalBookings = agents.reduce((s, a) => s + a.totalBookings, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agents</h1>
          <p className="text-sm text-muted-foreground mt-1">{activeCount} active of {agents.length} total agents</p>
        </div>
        <button
          onClick={() => router.push('/admin/team')}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors w-fit"
        >
          <Plus className="h-4 w-4" />
          Manage Team
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-2">
            <UsersRound className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-muted-foreground">Active Agents</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{activeCount}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-muted-foreground">Total Bookings</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalBookings}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-2">
            <IndianRupee className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-medium text-muted-foreground">Paid Commission</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalCommission)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 w-full max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
        />
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-6 h-48 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <UsersRound className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No agents found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((agent) => (
            <div key={agent.id} className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-4">
                <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">{(agent.name || agent.email).charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">{agent.name || 'Unnamed'}</h3>
                    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
                      agent.isActive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    )}>
                      {agent.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{agent.agentCode}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-sm mb-4">
                <p className="text-muted-foreground flex items-center gap-2 truncate">
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" /> {agent.email}
                </p>
                {agent.phone && (
                  <p className="text-muted-foreground flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" /> {agent.phone}
                  </p>
                )}
              </div>

              {agent.team && (
                <div className="mb-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {agent.team.name}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Bookings</p>
                  <p className="text-sm font-semibold text-foreground">{agent.totalBookings}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Commission</p>
                  <p className="text-sm font-semibold text-green-600">{formatCurrency(agent.paidCommission)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">RERA</p>
                  <p className="text-sm font-medium text-foreground truncate">{agent.reraNumber || '—'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
