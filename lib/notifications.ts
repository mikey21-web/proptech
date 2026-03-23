/**
 * Notification helpers — payment reminders, document requests, agent messages.
 *
 * In production, integrate with:
 * - Evolution API for WhatsApp
 * - SendGrid/Resend for email
 * - Web Push API for browser notifications
 *
 * For now, this logs notifications and stores in-app notification records.
 */

import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType =
  | 'payment_due'
  | 'payment_overdue'
  | 'payment_received'
  | 'document_needed'
  | 'document_verified'
  | 'booking_update'
  | 'agent_message'
  | 'ticket_reply';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  customerId?: string;
  bookingId?: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// In-app notification via Activity log
// ---------------------------------------------------------------------------

/**
 * Create an in-app notification as an Activity record.
 * This piggybacks on the existing Activity model.
 */
export async function createNotification(
  userId: string,
  payload: NotificationPayload,
): Promise<void> {
  try {
    await prisma.activity.create({
      data: {
        type: 'other',
        title: payload.title,
        description: payload.body,
        metadata: {
          notificationType: payload.type,
          customerId: payload.customerId,
          bookingId: payload.bookingId,
          ...(payload.metadata ?? {}),
        },
        userId,
      },
    });
  } catch (err) {
    console.error('[Notification] Failed to create:', err);
  }
}

// ---------------------------------------------------------------------------
// WhatsApp (Evolution API placeholder)
// ---------------------------------------------------------------------------

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || '';

export async function sendWhatsAppMessage(
  phone: string,
  message: string,
): Promise<boolean> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.log(`[WhatsApp Mock] To: ${phone}, Message: ${message}`);
    return true;
  }

  try {
    const res = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: phone.replace(/[^0-9]/g, ''),
          text: message,
        }),
      },
    );
    return res.ok;
  } catch (err) {
    console.error('[WhatsApp] Send failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Email (placeholder — integrate with SendGrid/Resend)
// ---------------------------------------------------------------------------

export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
): Promise<boolean> {
  console.log(`[Email Mock] To: ${to}, Subject: ${subject}`);
  // In production, implement with SendGrid/Resend
  return true;
}

// ---------------------------------------------------------------------------
// Payment reminder helpers
// ---------------------------------------------------------------------------

/**
 * Send payment due reminder. Called by cron/scheduled task.
 */
export async function sendPaymentReminder(
  customerEmail: string,
  customerPhone: string,
  bookingNumber: string,
  amount: number,
  dueDate: string,
): Promise<void> {
  const message = `Payment reminder: ₹${amount.toLocaleString('en-IN')} due on ${dueDate} for booking ${bookingNumber}. Please make the payment to avoid late fees.`;

  await Promise.allSettled([
    sendWhatsAppMessage(customerPhone, message),
    sendEmail(
      customerEmail,
      `Payment Due - ${bookingNumber}`,
      `<p>${message}</p>`,
    ),
  ]);
}
