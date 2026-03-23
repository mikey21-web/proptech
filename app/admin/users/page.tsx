'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Search, MoreHorizontal, Shield, Mail, Phone, IndianRupee } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface Agent {
  id: string;
  agentCode: string;
  isActive: boolean;
  name: string | null;
  email: string;
  phone: string | null;
  team: { id: string; name: string } | null;
  totalBookings: number;
  paidCommission: number;
  pendingCommission: number;
  createdAt: string;
}

function formatCurrency(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function UsersPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/admin/team?includeInactive=true')
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Members</h1>
          <p className="text-sm text-muted-foreground mt-1">{agents.length} agents registered</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors w-fit">
          <Plus className="h-4 w-4" />
          Add Agent
        </button>
      </div>

      <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 w-full max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name, email, or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
        />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading team...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? 'No agents match your search' : 'No agents found.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Agent</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3 hidden md:table-cell">Contact</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3 hidden lg:table-cell">Team</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Bookings</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3 hidden md:table-cell">Commission</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((agent) => (
                  <tr key={agent.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-primary">
                            {(agent.name || agent.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{agent.name || 'Unnamed'}</p>
                          <p className="text-xs text-muted-foreground">{agent.agentCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="space-y-0.5">
                        <p className="text-sm text-foreground flex items-center gap-1 truncate"><Mail className="h-3 w-3 flex-shrink-0" /> {agent.email}</p>
                        {agent.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3 flex-shrink-0" /> {agent.phone}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      {agent.team ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          {agent.team.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-foreground">{agent.totalBookings}</p>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="space-y-0.5">
                        <p className="text-xs text-green-600 dark:text-green-400">Paid: {formatCurrency(agent.paidCommission)}</p>
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">Pending: {formatCurrency(agent.pendingCommission)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        agent.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      )}>
                        {agent.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
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
