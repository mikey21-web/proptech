'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  Check,
  X,
  Users,
  Loader2,
  AlertCircle,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useToast } from '@/components/ui/Toast';

interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem?: boolean;
  rolePermissions: Array<{
    id: string;
    permission: { id: string; resource: string; action: string };
  }>;
  _count: { userRoles: number };
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/settings?section=roles').then((r) => r.json()),
      fetch('/api/admin/settings?section=permissions').then((r) => r.json()),
    ])
      .then(([rolesData, permsData]) => {
        if (rolesData.success) setRoles(rolesData.data?.roles || []);
        if (permsData.success) setPermissions(permsData.data?.permissions || []);
      })
      .catch(() => toast('Failed to load roles', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const groupedPermissions = permissions.reduce((acc: Record<string, any[]>, p: any) => {
    const resource = p.resource || 'Other';
    if (!acc[resource]) acc[resource] = [];
    acc[resource].push(p);
    return acc;
  }, {});

  const getPermissionLabel = (permission: any) => {
    return permission.action.charAt(0).toUpperCase() + permission.action.slice(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Roles & Permissions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage role-based access control for your organization
        </p>
      </div>

      {/* Permission legend */}
      <div className="flex flex-wrap gap-4 bg-card border border-border rounded-xl px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground">Permissions:</span>
        {Object.entries(groupedPermissions).slice(0, 6).map(([resource, perms]) => (
          <span key={resource} className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{resource}</span>: {(perms as any[]).map((p) => getPermissionLabel(p)).join(', ')}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div key={role.id} className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{role.name}</h3>
                    {role.isSystem && (
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                        System
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">
                    {role._count.userRoles} user{role._count.userRoles !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {role.description && (
                <p className="text-xs text-muted-foreground mb-4">{role.description}</p>
              )}

              <div className="space-y-1.5">
                {Object.entries(groupedPermissions).map(([resource, perms]) => {
                  const rolePermKeys = new Set(
                    role.rolePermissions?.map((rp) => `${rp.permission.resource}:${rp.permission.action}`) || []
                  );
                  return (
                    <div key={resource} className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pt-1">
                        {resource}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {(perms as any[]).map((perm) => {
                          const has = rolePermKeys.has(`${perm.resource}:${perm.action}`);
                          return (
                            <span
                              key={perm.id}
                              className={cn(
                                'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium',
                                has
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-muted text-muted-foreground/60'
                              )}
                            >
                              {has ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                              {getPermissionLabel(perm)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Role and permission management is read-only in this version. Custom roles and permission modifications require database updates.
      </p>
    </div>
  );
}
