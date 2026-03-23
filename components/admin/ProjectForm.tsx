'use client';

import { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';

interface ProjectFormProps {
  project?: {
    id: string;
    name: string;
    description?: string | null;
    type: string;
    status: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    totalArea?: number | string | null;
    totalUnits?: number | null;
    launchDate?: string | null;
    completionDate?: string | null;
    reraNumber?: string | null;
  };
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

const PROJECT_TYPES = [
  'residential', 'commercial', 'mixed', 'villa', 'plot', 'apartment',
];

const PROJECT_STATUSES = [
  'upcoming', 'under_construction', 'ready_to_move', 'completed', 'on_hold', 'cancelled',
];

export default function ProjectForm({ project, onSubmit, onClose }: ProjectFormProps) {
  const isEditing = !!project;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: project?.name || '',
    description: project?.description || '',
    type: project?.type || 'residential',
    status: project?.status || 'upcoming',
    address: project?.address || '',
    city: project?.city || '',
    state: project?.state || '',
    pincode: project?.pincode || '',
    totalArea: project?.totalArea ? String(project.totalArea) : '',
    totalUnits: project?.totalUnits ? String(project.totalUnits) : '',
    launchDate: project?.launchDate
      ? new Date(project.launchDate).toISOString().split('T')[0]
      : '',
    completionDate: project?.completionDate
      ? new Date(project.completionDate).toISOString().split('T')[0]
      : '',
    reraNumber: project?.reraNumber || '',
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Project name is required'); return; }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        description: form.description || null,
        type: form.type,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        pincode: form.pincode || null,
        totalArea: form.totalArea ? Number(form.totalArea) : null,
        totalUnits: form.totalUnits ? Number(form.totalUnits) : null,
        launchDate: form.launchDate || null,
        completionDate: form.completionDate || null,
        reraNumber: form.reraNumber || null,
      };

      if (isEditing) {
        payload.projectId = project!.id;
        payload.status = form.status;
      }

      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {isEditing ? 'Edit Project' : 'Add New Project'}
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

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
              >
                {PROJECT_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <hr className="border-slate-200 dark:border-slate-700" />
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Location</p>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Address
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => handleChange('state', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pincode</label>
              <input
                type="text"
                value={form.pincode}
                onChange={(e) => handleChange('pincode', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              />
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-700" />
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Project Details</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Total Area (sq ft)</label>
              <input
                type="number"
                value={form.totalArea}
                onChange={(e) => handleChange('totalArea', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Total Units</label>
              <input
                type="number"
                value={form.totalUnits}
                onChange={(e) => handleChange('totalUnits', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Launch Date</label>
              <input
                type="date"
                value={form.launchDate}
                onChange={(e) => handleChange('launchDate', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Completion Date</label>
              <input
                type="date"
                value={form.completionDate}
                onChange={(e) => handleChange('completionDate', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">RERA Number</label>
            <input
              type="text"
              value={form.reraNumber}
              onChange={(e) => handleChange('reraNumber', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
            />
          </div>

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
              {isEditing ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
