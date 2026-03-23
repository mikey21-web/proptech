export enum WebhookEventType {
  // Booking events
  BOOKING_CREATED = 'booking_created',
  BOOKING_UPDATED = 'booking_updated',
  BOOKING_CANCELLED = 'booking_cancelled',

  // Payment events
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_OVERDUE = 'payment_overdue',
  PAYMENT_FAILED = 'payment_failed',

  // Commission events
  COMMISSION_APPROVED = 'commission_approved',
  COMMISSION_PAID = 'commission_paid',

  // Customer events
  CUSTOMER_CREATED = 'customer_created',
  CUSTOMER_UPDATED = 'customer_updated',

  // Lead events
  LEAD_CREATED = 'lead_created',
  LEAD_UPDATED = 'lead_updated',
  LEAD_QUALIFIED = 'lead_qualified',

  // Project events
  PROJECT_UPDATED = 'project_updated',
}

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: Date;
  orgId: string;
  entityId: string;
  entityType: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface WebhookConfig {
  id: string;
  url: string;
  secret?: string;
  events: WebhookEventType[];
  isActive: boolean;
  headers?: Record<string, string>;
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
}

export enum CronJobType {
  OVERDUE_DETECTION = 'overdue_detection',
  LEAD_FOLLOW_UP = 'lead_follow_up',
  PAYMENT_REMINDER = 'payment_reminder',
  INSTALLMENT_DUE_REMINDER = 'installment_due_reminder',
  WEEKLY_REPORT = 'weekly_report',
  MONTHLY_REPORT = 'monthly_report',
  COMMISSION_SETTLEMENT = 'commission_settlement',
}

export interface CronJobConfig {
  jobType: CronJobType;
  schedule: string; // cron expression
  timezone: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}
