'use client';

import { useState } from 'react';
import { Save, Loader2, Building2, Bell, Database } from 'lucide-react';

interface OrgData {
  id: string;
  name: string;
  domain?: string | null;
  logo?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gstNumber?: string | null;
  reraNumber?: string | null;
  website?: string | null;
  settings?: Record<string, unknown> | null;
}

interface SystemSettingsProps {
  organization: OrgData;
  onUpdateOrg: (data: Record<string, unknown>) => Promise<void>;
  onUpdateConfig: (key: string, value: string) => Promise<void>;
}

export default function SystemSettings({
  organization,
  onUpdateOrg,
  onUpdateConfig,
}: SystemSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'org' | 'notifications' | 'system'>('org');

  const [form, setForm] = useState({
    name: organization.name || '',
    domain: organization.domain || '',
    logo: organization.logo || '',
    address: organization.address || '',
    phone: organization.phone || '',
    email: organization.email || '',
    gstNumber: organization.gstNumber || '',
    reraNumber: organization.reraNumber || '',
    website: organization.website || '',
  });

  const [notifSettings, setNotifSettings] = useState({
    emailOnBooking: true,
    emailOnPayment: true,
    emailOnLeadAssign: true,
    smsOnBooking: false,
    dailyDigest: true,
    weeklyReport: true,
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveOrg = async () => {
    setLoading(true);
    setError('');
    setSaved(false);
    try {
      await onUpdateOrg({
        action: 'update_org',
        name: form.name,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
        gstNumber: form.gstNumber || null,
        reraNumber: form.reraNumber || null,
        website: form.website || null,
        logo: form.logo || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      await onUpdateConfig('notification_preferences', JSON.stringify(notifSettings));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'org' as const, label: 'Organization', icon: Building2 },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'system' as const, label: 'System', icon: Database },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Nav */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {saved && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300">
          Settings saved successfully
        </div>
      )}

      {/* Organization Tab */}
      {activeTab === 'org' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Organization Details
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Organization Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Domain
              </label>
              <input
                type="text"
                value={form.domain}
                disabled
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-500 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
            <textarea
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">GST Number</label>
              <input
                type="text"
                value={form.gstNumber}
                onChange={(e) => handleChange('gstNumber', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              />
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
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Website</label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => handleChange('website', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Logo URL</label>
            <input
              type="url"
              value={form.logo}
              onChange={(e) => handleChange('logo', e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveOrg}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Organization
            </button>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Notification Preferences
          </h3>

          {[
            { key: 'emailOnBooking', label: 'Email on new booking' },
            { key: 'emailOnPayment', label: 'Email on payment received' },
            { key: 'emailOnLeadAssign', label: 'Email on lead assignment' },
            { key: 'smsOnBooking', label: 'SMS on new booking' },
            { key: 'dailyDigest', label: 'Daily email digest' },
            { key: 'weeklyReport', label: 'Weekly report email' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
              <button
                onClick={() =>
                  setNotifSettings((prev) => ({
                    ...prev,
                    [item.key]: !prev[item.key as keyof typeof prev],
                  }))
                }
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  notifSettings[item.key as keyof typeof notifSettings]
                    ? 'bg-blue-600'
                    : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    notifSettings[item.key as keyof typeof notifSettings]
                      ? 'translate-x-5'
                      : ''
                  }`}
                />
              </button>
            </div>
          ))}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveNotifications}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Preferences
            </button>
          </div>
        </div>
      )}

      {/* System Tab */}
      {activeTab === 'system' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            System Information
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Platform', value: 'ClickProps CRM v1.0' },
              { label: 'Framework', value: 'Next.js 14 + Prisma' },
              { label: 'Database', value: 'PostgreSQL 15' },
              { label: 'Environment', value: process.env.NODE_ENV || 'development' },
            ].map((item) => (
              <div
                key={item.label}
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50"
              >
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Data Management
            </h4>
            <div className="flex gap-3">
              <button className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                Export All Data
              </button>
              <button className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
