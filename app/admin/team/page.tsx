'use client';

import { useState, useEffect } from 'react';
import {
  UsersRound,
  Plus,
  Search,
  Phone,
  Mail,
  IndianRupee,
  BookOpen,
  X,
  Loader2,
  AlertCircle,
  Edit2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useToast } from '@/components/ui/Toast';

interface Agent {
  id: string;
  agentCode: string;
  isActive: boolean;
  reraNumber: string | null;
  panNumber: string | null;
  bankAccount: string | null;
  ifscCode: string | null;
  bankName: string | null;
  name: string | null;
  email: string;
  phone: string | null;
  image: string | null;
  userId: string;
  userStatus: string;
  team: { id: string; name: string } | null;
  totalBookings: number;
  totalCommissions: number;
  paidCommission: number;
  pendingCommission: number;
  createdAt: string;
}

function formatCurrency(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function TeamPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const { toast } = useToast();

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/team?includeInactive=${showInactive}`);
      const json = await res.json();
      if (json.success) setAgents(json.data || []);
      else setError(json.error || 'Failed to load agents');
    } catch {
      setError('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAgents(); }, [showInactive]);

  const handleToggleActive = async (agent: Agent) => {
    try {
      const res = await fetch('/api/admin/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, isActive: !agent.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        toast(`${agent.name} ${agent.isActive ? 'deactivated' : 'activated'}`, 'success');
        fetchAgents();
      } else {
        toast(json.error || 'Failed to update', 'error');
      }
    } catch {
      toast('Failed to update agent status', 'error');
    }
  };

  const handleAgentSaved = () => {
    setShowForm(false);
    setEditingAgent(null);
    fetchAgents();
  };

  const filtered = agents.filter(
    (a) =>
      (a.name || '').toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.agentCode.toLowerCase().includes(search.toLowerCase()),
  );

  const activeCount = agents.filter((a) => a.isActive).length;
  const totalCommission = agents.reduce((s, a) => s + a.paidCommission, 0);
  const totalBookings = agents.reduce((s, a) => s + a.totalBookings, 0);
  const pendingCommission = agents.reduce((s, a) => s + a.pendingCommission, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeCount} active of {agents.length} agents
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors w-fit"
        >
          <Plus className="h-4 w-4" />
          Add Agent
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            <IndianRupee className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-muted-foreground">Paid Commission</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalCommission)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-2">
            <IndianRupee className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-medium text-muted-foreground">Pending Commission</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(pendingCommission)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-input"
          />
          <span className="text-sm text-muted-foreground">Show inactive</span>
        </label>
      </div>

      {/* Add/Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                {editingAgent ? 'Edit Agent' : 'Add New Agent'}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditingAgent(null); }}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <AgentForm
              agent={editingAgent}
              onSuccess={handleAgentSaved}
              onCancel={() => { setShowForm(false); setEditingAgent(null); }}
            />
          </div>
        </div>
      )}

      {/* Agent cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-6 h-56 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-800">{error}</p>
          <button onClick={fetchAgents} className="mt-2 text-xs text-red-600 hover:text-red-700">Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <UsersRound className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? 'No agents match your search.' : 'No agents found. Add your first agent.'}
          </p>
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
                    <span className={cn(
                      'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
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

              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Bookings</p>
                  <p className="text-sm font-semibold text-foreground">{agent.totalBookings}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="text-sm font-semibold text-green-600">{formatCurrency(agent.paidCommission)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">RERA</p>
                  <p className="text-sm font-medium text-foreground truncate">{agent.reraNumber || '—'}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => { setEditingAgent(agent); setShowForm(true); }}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleToggleActive(agent)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors',
                    agent.isActive
                      ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400'
                      : 'border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800 dark:text-green-400'
                  )}
                >
                  {agent.isActive ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                  {agent.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AgentForm({
  agent,
  onSuccess,
  onCancel,
}: {
  agent: Agent | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: agent?.name || '',
    email: agent?.email || '',
    phone: agent?.phone || '',
    password: '',
    agentCode: agent?.agentCode || '',
    reraNumber: agent?.reraNumber || '',
    panNumber: agent?.panNumber || '',
    bankAccount: agent?.bankAccount || '',
    ifscCode: agent?.ifscCode || '',
    bankName: agent?.bankName || '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    if (!agent && !form.password) errs.password = 'Password is required for new agents';
    if (!form.agentCode.trim()) errs.agentCode = 'Agent code is required';
    if (form.password && form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (form.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.panNumber)) errs.panNumber = 'Invalid PAN format (e.g., ABCDE1234F)';
    if (form.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode)) errs.ifscCode = 'Invalid IFSC format (e.g., SBIN0001234)';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form, phone: form.phone || null };
      if (agent) {
        const res = await fetch('/api/admin/team', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: agent.id, ...payload, password: undefined }),
        });
        const json = await res.json();
        if (json.success) {
          toast('Agent updated successfully', 'success');
          onSuccess();
        } else {
          toast(json.error || 'Failed to update agent', 'error');
        }
      } else {
        const res = await fetch('/api/admin/team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.success) {
          toast('Agent added successfully', 'success');
          onSuccess();
        } else {
          toast(json.error || 'Failed to add agent', 'error');
        }
      }
    } catch {
      toast('An error occurred', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Full Name *</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Email *</label>
          <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
          <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+91 98765 43210"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Agent Code *</label>
          <input value={form.agentCode} onChange={(e) => setForm((f) => ({ ...f, agentCode: e.target.value }))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          {errors.agentCode && <p className="text-xs text-red-500 mt-0.5">{errors.agentCode}</p>}
        </div>
        {!agent && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Password *</label>
            <input type="password" value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Min 8 characters"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            {errors.password && <p className="text-xs text-red-500 mt-0.5">{errors.password}</p>}
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">RERA Number</label>
          <input value={form.reraNumber} onChange={(e) => setForm((f) => ({ ...f, reraNumber: e.target.value }))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">PAN Number</label>
          <input value={form.panNumber} onChange={(e) => setForm((f) => ({ ...f, panNumber: e.target.value.toUpperCase() }))}
            placeholder="ABCDE1234F"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          {errors.panNumber && <p className="text-xs text-red-500 mt-0.5">{errors.panNumber}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Bank Name</label>
          <input value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Bank Account</label>
          <input value={form.bankAccount} onChange={(e) => setForm((f) => ({ ...f, bankAccount: e.target.value }))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">IFSC Code</label>
          <input value={form.ifscCode} onChange={(e) => setForm((f) => ({ ...f, ifscCode: e.target.value.toUpperCase() }))}
            placeholder="SBIN0001234"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          {errors.ifscCode && <p className="text-xs text-red-500 mt-0.5">{errors.ifscCode}</p>}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? 'Saving...' : agent ? 'Update Agent' : 'Add Agent'}
        </button>
        <button type="button" onClick={onCancel}
          className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-accent">
          Cancel
        </button>
      </div>
    </form>
  );
}
