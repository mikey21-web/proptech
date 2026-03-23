'use client';

import { useState } from 'react';
import { Shield, UserPlus, Trash2, Loader2 } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  status: string;
  userRoles: Array<{ role: { id: string; name: string } }>;
}

interface Role {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  _count: { userRoles: number };
  rolePermissions: Array<{
    permission: { id: string; resource: string; action: string };
  }>;
}

interface RoleManagerProps {
  users: User[];
  roles: Role[];
  currentUserRole: string;
  onAssignRole: (userId: string, roleId: string) => Promise<void>;
  onRemoveRole: (userId: string, roleId: string) => Promise<void>;
}

export default function RoleManager({
  users,
  roles,
  currentUserRole,
  onAssignRole,
  onRemoveRole,
}: RoleManagerProps) {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleAssign = async () => {
    if (!selectedUser || !selectedRole) {
      setError('Select a user and role');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onAssignRole(selectedUser, selectedRole);
      setSelectedUser('');
      setSelectedRole('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign role');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId: string, roleId: string) => {
    setLoading(true);
    setError('');
    try {
      await onRemoveRole(userId, roleId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove role');
    } finally {
      setLoading(false);
    }
  };

  const canAssignAdminRoles = currentUserRole === 'super_admin';

  return (
    <div className="space-y-6">
      {/* Roles Overview */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Roles</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {roles.map((role) => (
            <div
              key={role.id}
              className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 transition-colors"
            >
              <p className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                {role.name.replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {role._count.userRoles} users
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {role.rolePermissions.length} permissions
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Assign Role */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
          Assign Role to User
        </h4>

        {error && (
          <div className="mb-3 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-slate-500 mb-1">User</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white"
            >
              <option value="">Select user...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[180px]">
            <label className="block text-xs text-slate-500 mb-1">Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white"
            >
              <option value="">Select role...</option>
              {roles
                .filter(
                  (r) =>
                    canAssignAdminRoles ||
                    !['super_admin', 'admin'].includes(r.name),
                )
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name.replace(/_/g, ' ')}
                  </option>
                ))}
            </select>
          </div>
          <button
            onClick={handleAssign}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Assign
          </button>
        </div>
      </div>

      {/* Users & Roles Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
            User Roles ({users.length})
          </h4>
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white w-48"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                {['User', 'Email', 'Status', 'Roles', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-2.5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                    {user.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.userRoles.map((ur) => (
                        <span
                          key={ur.role.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                        >
                          {ur.role.name.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {user.userRoles.length === 0 && (
                        <span className="text-xs text-slate-400">No roles</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {user.userRoles.map((ur) => (
                        <button
                          key={ur.role.id}
                          onClick={() => handleRemove(user.id, ur.role.id)}
                          disabled={loading}
                          title={`Remove ${ur.role.name}`}
                          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ))}
                    </div>
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
