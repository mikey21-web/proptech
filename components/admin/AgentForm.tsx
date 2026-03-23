'use client';

import { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';

interface AgentFormProps {
  agent?: {
    id: string;
    agentCode: string;
    name: string;
    email: string;
    phone?: string | null;
    reraNumber?: string | null;
    panNumber?: string | null;
    bankAccount?: string | null;
    ifscCode?: string | null;
    bankName?: string | null;
    isActive: boolean;
  };
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

export default function AgentForm({ agent, onSubmit, onClose }: AgentFormProps) {
  const isEditing = !!agent;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: agent?.name || '',
    email: agent?.email || '',
    phone: agent?.phone || '',
    agentCode: agent?.agentCode || '',
    reraNumber: agent?.reraNumber || '',
    panNumber: agent?.panNumber || '',
    bankAccount: agent?.bankAccount || '',
    ifscCode: agent?.ifscCode || '',
    bankName: agent?.bankName || '',
    isActive: agent?.isActive ?? true,
    password: '',
  });

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.email.trim()) { setError('Email is required'); return; }
    if (!form.agentCode.trim()) { setError('Agent code is required'); return; }

    setLoading(true);
    try {
      if (isEditing) {
        await onSubmit({
          agentId: agent!.id,
          name: form.name,
          phone: form.phone || null,
          reraNumber: form.reraNumber || null,
          panNumber: form.panNumber || null,
          bankAccount: form.bankAccount || null,
          ifscCode: form.ifscCode || null,
          bankName: form.bankName || null,
          isActive: form.isActive,
        });
      } else {
        await onSubmit({
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          password: form.password || null,
          agentCode: form.agentCode,
          reraNumber: form.reraNumber || null,
          panNumber: form.panNumber || null,
          bankAccount: form.bankAccount || null,
          ifscCode: form.ifscCode || null,
          bankName: form.bankName || null,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save agent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {isEditing ? 'Edit Agent' : 'Add New Agent'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Agent Code *
              </label>
              <input
                type="text"
                value={form.agentCode}
                onChange={(e) => handleChange('agentCode', e.target.value)}
                disabled={isEditing}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                disabled={isEditing}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="Temporary password"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          <hr className="border-slate-200 dark:border-slate-700" />
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Bank & Regulatory Details
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                RERA Number
              </label>
              <input
                type="text"
                value={form.reraNumber}
                onChange={(e) => handleChange('reraNumber', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                PAN Number
              </label>
              <input
                type="text"
                value={form.panNumber}
                onChange={(e) => handleChange('panNumber', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={form.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Account No.
              </label>
              <input
                type="text"
                value={form.bankAccount}
                onChange={(e) => handleChange('bankAccount', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                value={form.ifscCode}
                onChange={(e) => handleChange('ifscCode', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {isEditing && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm text-slate-700 dark:text-slate-300">
                Agent is active
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEditing ? 'Update Agent' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
