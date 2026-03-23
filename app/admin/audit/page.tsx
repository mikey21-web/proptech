'use client';

import { useState, useEffect } from 'react';
import { ScrollText, Search, User, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string } | null;
}

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // AuditLog may not have a dedicated API yet, so we'll handle gracefully
    fetch('/api/admin/audit')
      .then(async (res) => {
        const json = await res.json();
        if (res.ok) setLogs(json.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.entity.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.user?.name || '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Track all system changes and user actions</p>
      </div>

      <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 w-full max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by entity, action, user..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
        />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading audit log...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ScrollText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {logs.length === 0 ? 'No audit entries yet. Actions will be logged as users make changes.' : 'No entries match your search.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((log) => (
              <div key={log.id} className="px-6 py-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{log.user?.name || log.user?.email || 'System'}</span>
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase', actionColors[log.action] || 'bg-gray-100 text-gray-800')}>
                        {log.action}
                      </span>
                      <span className="text-sm text-foreground font-medium">{log.entity}</span>
                      <span className="text-xs text-muted-foreground font-mono">{log.entityId.slice(0, 8)}...</span>
                    </div>
                    {log.newValues && Object.keys(log.newValues).length > 0 && (
                      <div className="mt-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-1.5 font-mono max-w-full overflow-x-auto">
                        {Object.entries(log.newValues).slice(0, 4).map(([key, val]) => (
                          <span key={key} className="mr-3">
                            {key}: <span className="text-foreground">{String(val)}</span>
                          </span>
                        ))}
                        {Object.keys(log.newValues).length > 4 && <span>+{Object.keys(log.newValues).length - 4} more</span>}
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(log.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
