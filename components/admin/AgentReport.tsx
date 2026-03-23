'use client';

import { formatINR, formatPct } from '@/lib/charts';
import type { AgentReportData } from '@/lib/reports';

interface AgentReportProps {
  data: AgentReportData;
}

export default function AgentReport({ data }: AgentReportProps) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Agents</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{data.totalAgents}</p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Agents</p>
          <p className="text-xl font-bold text-green-600 mt-1">{data.activeAgents}</p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Revenue</p>
          <p className="text-xl font-bold text-blue-600 mt-1">
            {formatINR(data.agents.reduce((s, a) => s + a.revenue, 0), true)}
          </p>
        </div>
      </div>

      {/* Agent Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
            Agent Performance
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                {['Agent', 'Code', 'Bookings', 'Revenue', 'Conversion', 'Earned', 'Pending'].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-2.5"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {data.agents.map((agent) => (
                <tr
                  key={agent.id}
                  className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                    {agent.name}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-600 dark:text-slate-400">
                    {agent.agentCode}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900 dark:text-white font-medium">
                    {agent.bookings}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                    {formatINR(agent.revenue, true)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden max-w-[60px]">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${Math.min(agent.conversionRate, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {formatPct(agent.conversionRate)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400">
                    {formatINR(agent.commissionEarned, true)}
                  </td>
                  <td className="px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
                    {formatINR(agent.commissionPending, true)}
                  </td>
                </tr>
              ))}
              {data.agents.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-sm text-slate-500 text-center"
                  >
                    No agent data for this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
