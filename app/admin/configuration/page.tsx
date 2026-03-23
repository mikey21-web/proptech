'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Globe,
  Bell,
  Shield,
  Database,
  Palette,
  Save,
  Loader2,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useToast } from '@/components/ui/Toast';

type ConfigSection = 'organization' | 'notifications' | 'security' | 'integrations' | 'appearance';

const SECTIONS = [
  { key: 'organization', title: 'Organization', description: 'Company name, address, GST, and branding', icon: Building2 },
  { key: 'notifications', title: 'Notifications', description: 'Email, SMS, and WhatsApp settings', icon: Bell },
  { key: 'security', title: 'Security', description: 'Authentication and access control', icon: Shield },
  { key: 'integrations', title: 'Integrations', description: 'Third-party service connections', icon: Globe },
  { key: 'appearance', title: 'Appearance', description: 'Theme, colors, and display settings', icon: Palette },
] as const;

export default function ConfigurationPage() {
  const [section, setSection] = useState<ConfigSection>('organization');
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/admin/settings?section=organization')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOrg(d.data?.organization);
      })
      .catch(() => toast('Failed to load configuration', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateConfig = async (key: string, value: string, label: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_configuration', key, value, configType: 'string' }),
      });
      const json = await res.json();
      if (json.success) {
        toast(`${label} saved`, 'success');
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        toast(json.error || 'Failed to save', 'error');
      }
    } catch {
      toast('Failed to save configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateOrg = async (data: Record<string, string>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_org', ...data }),
      });
      const json = await res.json();
      if (json.success) {
        setOrg((o: any) => ({ ...o, ...data }));
        toast('Organization saved', 'success');
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        toast(json.error || 'Failed to save', 'error');
      }
    } catch {
      toast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">System settings and preferences</p>
      </div>

      {/* Section selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const isActive = section === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setSection(s.key as ConfigSection)}
              className={cn(
                'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all',
                isActive
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-primary/30',
              )}
            >
              <div className={cn('p-2 rounded-lg', isActive ? 'bg-primary/15' : 'bg-muted')}>
                <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
              </div>
              <div>
                <p className={cn('text-sm font-semibold', isActive ? 'text-primary' : 'text-foreground')}>{s.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="h-48 rounded-xl bg-secondary animate-pulse" />
      ) : (
        <div className="rounded-xl border border-border bg-card p-6">
          {section === 'organization' && (
            <OrgConfig org={org} onSave={handleUpdateOrg} saving={saving} saved={saved} />
          )}
          {section === 'notifications' && (
            <NotificationConfig onSave={handleUpdateConfig} saving={saving} saved={saved} />
          )}
          {section === 'security' && <SecurityConfig />}
          {section === 'integrations' && <IntegrationConfig />}
          {section === 'appearance' && <AppearanceConfig />}
        </div>
      )}
    </div>
  );
}

function OrgConfig({ org, onSave, saving, saved }: { org: any; onSave: (d: any) => void; saving: boolean; saved: boolean }) {
  const [form, setForm] = useState({
    name: org?.name || '',
    email: org?.email || '',
    phone: org?.phone || '',
    address: org?.address || '',
    gstNumber: org?.gstNumber || '',
    reraNumber: org?.reraNumber || '',
    website: org?.website || '',
  });

  useEffect(() => {
    if (org) setForm({
      name: org.name || '',
      email: org.email || '',
      phone: org.phone || '',
      address: org.address || '',
      gstNumber: org.gstNumber || '',
      reraNumber: org.reraNumber || '',
      website: org.website || '',
    });
  }, [org]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Organization Settings</h3>
        <button
          onClick={() => onSave(form)}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ConfigField label="Company Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Sri Sai Builders" />
        <ConfigField label="Email" type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} placeholder="info@srisaibuilders.com" />
        <ConfigField label="Phone" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="+91 98765 43210" />
        <ConfigField label="Website" value={form.website} onChange={(v) => setForm((f) => ({ ...f, website: v }))} placeholder="https://srisaibuilders.com" />
        <ConfigField label="GST Number" value={form.gstNumber} onChange={(v) => setForm((f) => ({ ...f, gstNumber: v }))} placeholder="22AAAAA0000A1Z5" />
        <ConfigField label="RERA Number" value={form.reraNumber} onChange={(v) => setForm((f) => ({ ...f, reraNumber: v }))} placeholder="RERA/PR/2024/001" />
        <div className="sm:col-span-2">
          <ConfigField label="Address" value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} placeholder="123 MG Road, Hyderabad, Telangana 500001" multiline />
        </div>
      </div>
    </div>
  );
}

function NotificationConfig({ onSave, saving, saved }: { onSave: (k: string, v: string, l: string) => void; saving: boolean; saved: boolean }) {
  const [configs, setConfigs] = useState({
    email_provider: 'sendgrid',
    sms_provider: 'twilio',
    whatsapp_enabled: 'true',
    email_notifications: 'true',
    sms_notifications: 'false',
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Notification Settings</h3>
        <button
          onClick={() => Object.entries(configs).forEach(([k, v]) => onSave(k, v, k))}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save'}
        </button>
      </div>
      <div className="space-y-4">
        <ConfigToggle label="Email Notifications" description="Send email notifications for bookings, payments, etc." checked={configs.email_notifications === 'true'} onChange={(v) => setConfigs((c) => ({ ...c, email_notifications: String(v) }))} />
        <ConfigToggle label="SMS Notifications" description="Send SMS alerts for important updates" checked={configs.sms_notifications === 'true'} onChange={(v) => setConfigs((c) => ({ ...c, sms_notifications: String(v) }))} />
        <ConfigToggle label="WhatsApp Notifications" description="Send WhatsApp messages via configured gateway" checked={configs.whatsapp_enabled === 'true'} onChange={(v) => setConfigs((c) => ({ ...c, whatsapp_enabled: String(v) }))} />
        <ConfigSelect label="Email Provider" value={configs.email_provider} onChange={(v) => setConfigs((c) => ({ ...c, email_provider: v }))} options={[
          { value: 'sendgrid', label: 'SendGrid' },
          { value: 'ses', label: 'AWS SES' },
          { value: 'smtp', label: 'Custom SMTP' },
        ]} />
        <ConfigSelect label="SMS Provider" value={configs.sms_provider} onChange={(v) => setConfigs((c) => ({ ...c, sms_provider: v }))} options={[
          { value: 'twilio', label: 'Twilio' },
          { value: 'msg91', label: 'MSG91' },
          { value: 'plivo', label: 'Plivo' },
        ]} />
      </div>
    </div>
  );
}

function SecurityConfig() {
  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold">Security Settings</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg border border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
            <p className="text-xs text-muted-foreground">Require 2FA for all admin and manager accounts</p>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Coming Soon</span>
        </div>
        <div className="flex items-center justify-between p-4 rounded-lg border border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Session Timeout</p>
            <p className="text-xs text-muted-foreground">Auto-logout after period of inactivity</p>
          </div>
          <span className="text-sm text-foreground">30 minutes</span>
        </div>
        <div className="flex items-center justify-between p-4 rounded-lg border border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Password Policy</p>
            <p className="text-xs text-muted-foreground">Minimum 8 characters, mixed case, numbers</p>
          </div>
          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Enabled</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Additional security settings are managed through the organization settings panel.</p>
    </div>
  );
}

function IntegrationConfig() {
  const integrations = [
    { name: 'Razorpay', description: 'Payment gateway for online payments', status: 'configured', color: 'text-blue-600' },
    { name: 'SendGrid', description: 'Transactional and marketing emails', status: 'pending', color: 'text-muted-foreground' },
    { name: 'Twilio', description: 'SMS notifications and OTP', status: 'pending', color: 'text-muted-foreground' },
    { name: 'WhatsApp (Evolution API)', description: 'WhatsApp business messaging', status: 'pending', color: 'text-muted-foreground' },
    { name: 'Priya AI', description: 'AI-powered chatbot and lead qualification', status: 'pending', color: 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold">Third-Party Integrations</h3>
      <div className="space-y-3">
        {integrations.map((i) => (
          <div key={i.name} className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                <span className="text-xs font-bold text-muted-foreground">{i.name.charAt(0)}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{i.name}</p>
                <p className="text-xs text-muted-foreground">{i.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn(
                'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                i.status === 'configured'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
              )}>{i.status === 'configured' ? 'Configured' : 'Setup pending'}</span>
              <button className="text-xs text-primary hover:text-primary/80 font-medium">
                {i.status === 'configured' ? 'Configure' : 'Setup'}
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">API keys and credentials are stored securely in environment variables on the server.</p>
    </div>
  );
}

function AppearanceConfig() {
  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold">Appearance Settings</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg border border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Primary Color</p>
            <p className="text-xs text-muted-foreground">Brand color used across the application</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-blue-500 border border-border" />
            <span className="text-sm text-foreground">Blue (#3B82F6)</span>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 rounded-lg border border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Dark Mode</p>
            <p className="text-xs text-muted-foreground">Toggle dark/light theme for all users</p>
          </div>
          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">User Preference</span>
        </div>
        <div className="flex items-center justify-between p-4 rounded-lg border border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Logo</p>
            <p className="text-xs text-muted-foreground">Company logo displayed in the sidebar</p>
          </div>
          <button className="text-xs text-primary hover:text-primary/80 font-medium">Upload</button>
        </div>
      </div>
    </div>
  );
}

function ConfigField({ label, value, onChange, placeholder, type = 'text', multiline = false }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}
    </div>
  );
}

function ConfigToggle({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-muted',
        )}
      >
        <span className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )} />
      </button>
    </div>
  );
}

function ConfigSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
