'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Shield,
  Users,
  IndianRupee,
  Save,
  Loader2,
  Check,
  X,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useToast } from '@/components/ui/Toast';

type Section = 'organization' | 'roles' | 'commissions' | 'users';

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('organization');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async (sec: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/settings?section=${sec}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else toast(json.error || 'Failed to load settings', 'error');
    } catch {
      toast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(section); }, [section]);

  const handleOrgUpdate = async (formData: Record<string, string>) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_org', ...formData }),
      });
      const json = await res.json();
      if (json.success) {
        toast('Organization settings saved', 'success');
        fetchData(section);
      } else {
        toast(json.error || 'Failed to save', 'error');
      }
    } catch {
      toast('Failed to save settings', 'error');
    }
  };

  const handleAssignRole = async (userId: string, roleId: string) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign_role', userId, roleId }),
      });
      const json = await res.json();
      if (json.success) {
        toast('Role assigned successfully', 'success');
        fetchData(section);
      } else {
        toast(json.error || 'Failed to assign role', 'error');
      }
    } catch {
      toast('Failed to assign role', 'error');
    }
  };

  const handleRemoveRole = async (userId: string, roleId: string) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_role', userId, roleId }),
      });
      const json = await res.json();
      if (json.success) {
        toast('Role removed', 'success');
        fetchData(section);
      } else {
        toast(json.error || 'Failed to remove role', 'error');
      }
    } catch {
      toast('Failed to remove role', 'error');
    }
  };

  const handleAddCommissionRule = async (formData: Record<string, any>) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_commission_rule', ...formData }),
      });
      const json = await res.json();
      if (json.success) {
        toast('Commission rule added', 'success');
        fetchData(section);
      } else {
        toast(json.error || 'Failed to add rule', 'error');
      }
    } catch {
      toast('Failed to add commission rule', 'error');
    }
  };

  const sections = [
    { key: 'organization', label: 'Organization', icon: Building2 },
    { key: 'roles', label: 'Roles & Permissions', icon: Shield },
    { key: 'commissions', label: 'Commissions', icon: IndianRupee },
    { key: 'users', label: 'User Access', icon: Users },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage organization settings and configurations</p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              onClick={() => setSection(s.key as Section)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                section === s.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {s.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {section === 'organization' && data?.organization && (
            <OrgSettingsForm org={data.organization} onSave={handleOrgUpdate} />
          )}
          {section === 'roles' && data?.roles && (
            <RolesSettings roles={data.roles} permissions={data.permissions || []} onRefresh={fetchData.bind(null, 'roles')} />
          )}
          {section === 'commissions' && (
            <CommissionSettings
              structures={data?.commissionStructures || []}
              onAddRule={handleAddCommissionRule}
              onRefresh={fetchData.bind(null, 'commissions')}
            />
          )}
          {section === 'users' && data?.users && (
            <UserAccessSettings
              users={data.users}
              roles={data.roles || []}
              onAssign={handleAssignRole}
              onRemove={handleRemoveRole}
            />
          )}
        </>
      )}
    </div>
  );
}

function OrgSettingsForm({ org, onSave }: { org: any; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    name: org.name || '',
    email: org.email || '',
    phone: org.phone || '',
    address: org.address || '',
    gstNumber: org.gstNumber || '',
    reraNumber: org.reraNumber || '',
    website: org.website || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-base font-semibold">Organization Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Company Name">
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </Field>
          <Field label="Website">
            <input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </Field>
          <Field label="GST Number">
            <input value={form.gstNumber} onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </Field>
          <Field label="RERA Number">
            <input value={form.reraNumber} onChange={(e) => setForm((f) => ({ ...f, reraNumber: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </Field>
        </div>
        <Field label="Address">
          <textarea value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </Field>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function RolesSettings({ roles, permissions, onRefresh }: { roles: any[]; permissions: any[]; onRefresh: () => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Permissions</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Users</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">{role.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {role.rolePermissions?.slice(0, 5).map((rp: any) => (
                        <span key={rp.id} className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                          {rp.permission?.action || rp.permission?.resource}
                        </span>
                      ))}
                      {(role.rolePermissions?.length || 0) > 5 && (
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                          +{(role.rolePermissions?.length || 0) - 5} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-foreground">{role._count?.userRoles || 0} users</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Role and permission management is view-only in this version. Contact your developer to add new roles or modify permissions.
      </p>
    </div>
  );
}

function CommissionSettings({ structures, onAddRule, onRefresh }: {
  structures: any[];
  onAddRule: (d: any) => void;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ structureId: '', minAmount: '', maxAmount: '', percentage: '', description: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.structureId) return;
    setSaving(true);
    await onAddRule({
      structureId: form.structureId,
      minAmount: parseFloat(form.minAmount) || 0,
      maxAmount: form.maxAmount ? parseFloat(form.maxAmount) : null,
      percentage: form.percentage ? parseFloat(form.percentage) : null,
      description: form.description || null,
    });
    setSaving(false);
    setShowForm(false);
    setForm({ structureId: '', minAmount: '', maxAmount: '', percentage: '', description: '' });
  };

  return (
    <div className="space-y-6">
      {structures.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <IndianRupee className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No commission structures defined yet.</p>
        </div>
      ) : (
        structures.map((cs) => (
          <div key={cs.id} className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-foreground">{cs.name}</h3>
                <span className={cn(
                  'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                  cs.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                )}>{cs.isActive ? 'Active' : 'Inactive'}</span>
                {cs.isDefault && (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Default</span>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {['Min Amount', 'Max Amount', 'Percentage', 'Flat Amount', 'Project', 'Description'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cs.rules?.map((rule: any) => (
                    <tr key={rule.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 text-sm text-foreground">{rule.minAmount ? `₹${Number(rule.minAmount).toLocaleString('en-IN')}` : '—'}</td>
                      <td className="px-3 py-2 text-sm text-foreground">{rule.maxAmount ? `₹${Number(rule.maxAmount).toLocaleString('en-IN')}` : '∞'}</td>
                      <td className="px-3 py-2 text-sm text-green-600">{rule.percentage ? `${rule.percentage}%` : '—'}</td>
                      <td className="px-3 py-2 text-sm text-foreground">{rule.flatAmount ? `₹${Number(rule.flatAmount).toLocaleString('en-IN')}` : '—'}</td>
                      <td className="px-3 py-2 text-sm text-muted-foreground">{rule.project?.name || 'All'}</td>
                      <td className="px-3 py-2 text-sm text-muted-foreground">{rule.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      <button
        onClick={() => setShowForm(!showForm)}
        className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add Commission Rule
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-4 max-w-xl">
          <h3 className="text-base font-semibold">Add Commission Rule</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Structure</label>
              <select
                value={form.structureId}
                onChange={(e) => setForm((f) => ({ ...f, structureId: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                <option value="">Select...</option>
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Min Amount</label>
              <input type="number" value={form.minAmount}
                onChange={(e) => setForm((f) => ({ ...f, minAmount: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Max Amount</label>
              <input type="number" value={form.maxAmount}
                onChange={(e) => setForm((f) => ({ ...f, maxAmount: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Percentage (%)</label>
              <input type="number" step="0.01" value={form.percentage}
                onChange={(e) => setForm((f) => ({ ...f, percentage: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
            <input value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save Rule'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="inline-flex items-center gap-2 border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function UserAccessSettings({ users, roles, onAssign, onRemove }: {
  users: any[];
  roles: any[];
  onAssign: (userId: string, roleId: string) => void;
  onRemove: (userId: string, roleId: string) => void;
}) {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedRole) return;
    setSaving(true);
    await onAssign(selectedUser, selectedRole);
    setSaving(false);
    setSelectedUser('');
    setSelectedRole('');
  };

  return (
    <div className="space-y-6">
      {/* Assign role form */}
      <form onSubmit={handleAssign} className="rounded-xl border border-border bg-card p-6 flex flex-wrap items-end gap-4">
        <h3 className="text-sm font-semibold w-full">Assign Role to User</h3>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1">User</label>
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Select user...</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Role</label>
          <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Select role...</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={saving || !selectedUser || !selectedRole}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Assign
        </button>
      </form>

      {/* Users table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['User', 'Email', 'Phone', 'Status', 'Roles', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{user.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{user.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                      user.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    )}>{user.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.userRoles?.map((ur: any) => (
                        <span key={ur.role.id}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                          {ur.role.name}
                          <button onClick={() => onRemove(user.id, ur.role.id)} className="hover:text-red-600">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setSelectedUser(user.id); }}
                      className="text-xs text-primary hover:text-primary/80 font-medium"
                    >
                      Assign Role
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
