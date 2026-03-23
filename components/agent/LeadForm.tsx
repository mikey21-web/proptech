'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils/cn';
import { useToast } from '@/components/ui/Toast';
import { Loader2 } from 'lucide-react';

const leadFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  phone: z
    .string()
    .min(1, 'Phone is required')
    .max(20, 'Phone is too long')
    .regex(/^[+]?[\d\s\-()]{7,20}$/, 'Invalid phone number'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  altPhone: z.string().max(20).optional().or(z.literal('')),
  status: z.enum([
    'new', 'contacted', 'qualified', 'negotiation',
    'site_visit', 'proposal_sent', 'won', 'lost', 'junk',
  ]),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  budget: z.string().optional().or(z.literal('')),
  source: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  projectId: z.string().optional().or(z.literal('')),
});

type LeadFormValues = z.infer<typeof leadFormSchema>;

interface LeadFormProps {
  initialData?: Partial<LeadFormValues> & { id?: string };
  onSuccess?: () => void;
  onCancel?: () => void;
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'site_visit', label: 'Site Visit' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'junk', label: 'Junk' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function LeadForm({ initialData, onSuccess, onCancel }: LeadFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const isEditing = Boolean(initialData?.id);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      phone: initialData?.phone ?? '',
      email: initialData?.email ?? '',
      altPhone: initialData?.altPhone ?? '',
      status: initialData?.status ?? 'new',
      priority: initialData?.priority ?? 'medium',
      budget: initialData?.budget ?? '',
      source: initialData?.source ?? '',
      notes: initialData?.notes ?? '',
      projectId: initialData?.projectId ?? '',
    },
  });

  const onSubmit = async (data: LeadFormValues) => {
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: data.name,
        phone: data.phone,
        status: data.status,
        priority: data.priority,
      };
      if (data.email) payload.email = data.email;
      if (data.altPhone) payload.altPhone = data.altPhone;
      if (data.budget) payload.budget = Number(data.budget);
      if (data.source) payload.source = data.source;
      if (data.notes) payload.notes = data.notes;
      if (data.projectId) payload.projectId = data.projectId;

      const url = isEditing ? `/api/leads/${initialData!.id}` : '/api/leads';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save lead');
      }

      toast(isEditing ? 'Lead updated successfully' : 'Lead created successfully', 'success');
      if (!isEditing) reset();
      onSuccess?.();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed';
  const labelClass = 'block text-sm font-medium text-foreground mb-1';
  const errorClass = 'mt-1 text-xs text-destructive';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name */}
        <div>
          <label htmlFor="name" className={labelClass}>
            Name <span className="text-destructive">*</span>
          </label>
          <input
            id="name"
            type="text"
            {...register('name')}
            className={cn(inputClass, errors.name && 'border-destructive focus:ring-destructive')}
            placeholder="Full name"
          />
          {errors.name && <p className={errorClass}>{errors.name.message}</p>}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className={labelClass}>
            Phone <span className="text-destructive">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            {...register('phone')}
            className={cn(inputClass, errors.phone && 'border-destructive focus:ring-destructive')}
            placeholder="+91 9876543210"
          />
          {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className={labelClass}>Email</label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className={cn(inputClass, errors.email && 'border-destructive focus:ring-destructive')}
            placeholder="email@example.com"
          />
          {errors.email && <p className={errorClass}>{errors.email.message}</p>}
        </div>

        {/* Alt Phone */}
        <div>
          <label htmlFor="altPhone" className={labelClass}>Alternate Phone</label>
          <input
            id="altPhone"
            type="tel"
            {...register('altPhone')}
            className={inputClass}
            placeholder="Optional"
          />
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className={labelClass}>Status</label>
          <select id="status" {...register('status')} className={inputClass}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label htmlFor="priority" className={labelClass}>Priority</label>
          <select id="priority" {...register('priority')} className={inputClass}>
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Budget */}
        <div>
          <label htmlFor="budget" className={labelClass}>Budget (INR)</label>
          <input
            id="budget"
            type="number"
            {...register('budget')}
            className={inputClass}
            placeholder="e.g. 5000000"
          />
        </div>

        {/* Source */}
        <div>
          <label htmlFor="source" className={labelClass}>Source</label>
          <input
            id="source"
            type="text"
            {...register('source')}
            className={inputClass}
            placeholder="e.g. 99acres, Walk-in, Referral"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className={labelClass}>Notes</label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={3}
          className={cn(inputClass, 'resize-y')}
          placeholder="Any additional notes about this lead..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEditing ? 'Update Lead' : 'Create Lead'}
        </button>
      </div>
    </form>
  );
}
