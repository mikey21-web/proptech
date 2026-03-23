'use client';

import { useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';

interface EnquiryFormClientProps {
  projectSlug?: string;
  unitId?: string;
  unitType?: 'plot' | 'flat';
  unitLabel?: string;
  onSuccess?: () => void;
}

export default function EnquiryFormClient({
  projectSlug,
  unitId,
  unitType,
  unitLabel,
  onSuccess,
}: EnquiryFormClientProps) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/public/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          projectSlug,
          unitId,
          unitType,
          source: 'website',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        onSuccess?.();
      } else {
        setError(data.error || 'Failed to submit. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
        <div className="h-14 w-14 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle className="h-7 w-7 text-green-600" />
        </div>
        <p className="text-lg font-semibold text-slate-900">Thank you!</p>
        <p className="text-sm text-slate-500">Our team will contact you within 24 hours.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {unitLabel && (
        <div className="bg-blue-50 rounded-lg px-4 py-2.5 text-sm text-blue-700 font-medium">
          Enquiry for: {unitLabel}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Enter your name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            required
            placeholder="+91 98765 43210"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
        <input
          type="email"
          placeholder="your@email.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Message (optional)</label>
        <textarea
          placeholder="Tell us your requirements, budget, preferred location..."
          rows={3}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          'Request Callback'
        )}
      </button>

      <p className="text-xs text-slate-400 text-center">
        By submitting, you agree to be contacted by our sales team.
      </p>
    </form>
  );
}
