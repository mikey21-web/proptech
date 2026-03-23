'use client';

import { Trophy, Medal } from 'lucide-react';
import { formatINR } from '@/lib/charts';

interface AgentEntry {
  id: string;
  name: string;
  image?: string | null;
  agentCode: string;
  bookingsThisMonth: number;
  revenueThisMonth: number;
  totalCommission: number;
}

interface AgentLeaderboardProps {
  agents: AgentEntry[];
}

export default function AgentLeaderboard({ agents }: AgentLeaderboardProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-amber-500" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Top Agents (This Month)
        </h3>
      </div>

      {agents.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
          No agent activity this month
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 pb-2 pr-2">
                  #
                </th>
                <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 pb-2">
                  Agent
                </th>
                <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 pb-2">
                  Bookings
                </th>
                <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 pb-2">
                  Revenue
                </th>
                <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 pb-2">
                  Commission
                </th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent, index) => (
                <tr
                  key={agent.id}
                  className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                >
                  <td className="py-2.5 pr-2">
                    {index < 3 ? (
                      <Medal
                        className={`h-4 w-4 ${
                          index === 0
                            ? 'text-amber-500'
                            : index === 1
                              ? 'text-slate-400'
                              : 'text-orange-400'
                        }`}
                      />
                    ) : (
                      <span className="text-xs text-slate-400 pl-0.5">
                        {index + 1}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xs font-medium text-slate-600 dark:text-slate-300">
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {agent.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {agent.agentCode}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 text-right text-sm font-medium text-slate-900 dark:text-white">
                    {agent.bookingsThisMonth}
                  </td>
                  <td className="py-2.5 text-right text-sm text-slate-700 dark:text-slate-300">
                    {formatINR(agent.revenueThisMonth, true)}
                  </td>
                  <td className="py-2.5 text-right text-sm text-green-600 dark:text-green-400">
                    {formatINR(agent.totalCommission, true)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
