'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UsersRound, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface Agent {
  id: string;
  name: string | null;
  email: string;
  agentCode: string;
  isActive: boolean;
  team: { id: string; name: string } | null;
}

export default function AgentTeamPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agents')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setAgents(d.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const teams = agents.reduce((acc, agent) => {
    const teamName = agent.team?.name || 'Unassigned';
    if (!acc[teamName]) acc[teamName] = [];
    acc[teamName].push(agent);
    return acc;
  }, {} as Record<string, Agent[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/agent" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Team</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Agents in your team
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : Object.keys(teams).length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <UsersRound className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No team members found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(teams).map(([teamName, members]) => (
            <div key={teamName}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {teamName} ({members.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((agent) => (
                  <div key={agent.id} className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          {(agent.name || agent.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {agent.name || 'Unnamed'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{agent.email}</p>
                      </div>
                      <span className={cn(
                        'inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium',
                        agent.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800'
                      )}>
                        {agent.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
