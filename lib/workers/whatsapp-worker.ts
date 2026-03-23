/**
 * WhatsApp Worker
 *
 * Processes WhatsApp message queue with:
 * - Evolution API integration
 * - Instance rotation (load balancing across 20 instances)
 * - Rate limiting per instance
 * - Deduplication
 * - Status tracking
 */

import { Worker, Job } from 'bullmq';
import { getRedisConnection, getRedisClient, type WhatsAppJobData } from '../queue';
import { prisma } from '../prisma';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

// Rate limiting: messages per instance per minute
const RATE_LIMIT_PER_MINUTE = 20;
const RATE_LIMIT_WINDOW = 60; // seconds

// Instance rotation
const WHATSAPP_INSTANCES = (process.env.WHATSAPP_INSTANCES || '').split(',').filter(Boolean);

// ---------------------------------------------------------------------------
// Rate Limiting
// ---------------------------------------------------------------------------

async function getRateLimitKey(instanceId: string): Promise<string> {
  return `ratelimit:whatsapp:${instanceId}`;
}

async function checkRateLimit(instanceId: string): Promise<boolean> {
  const key = await getRateLimitKey(instanceId);
  const redisClient = getRedisClient();
  const count = await redisClient.incr(key);

  // Set expiry on first increment
  if (count === 1) {
    await redisClient.expire(key, RATE_LIMIT_WINDOW);
  }

  return count <= RATE_LIMIT_PER_MINUTE;
}

async function getCurrentInstanceLoad(): Promise<Map<string, number>> {
  const loads = new Map<string, number>();
  const redisClient = getRedisClient();

  for (const instance of WHATSAPP_INSTANCES) {
    const key = await getRateLimitKey(instance);
    const count = await redisClient.get(key);
    loads.set(instance, parseInt(count || '0', 10));
  }

  return loads;
}

/**
 * Select the least loaded WhatsApp instance
 */
async function selectInstance(preferredInstance?: string): Promise<string | null> {
  if (WHATSAPP_INSTANCES.length === 0) {
    return null;
  }

  // Use preferred instance if specified and available
  if (preferredInstance && WHATSAPP_INSTANCES.includes(preferredInstance)) {
    const withinLimit = await checkRateLimit(preferredInstance);
    if (withinLimit) {
      return preferredInstance;
    }
  }

  // Find least loaded instance
  const loads = await getCurrentInstanceLoad();
  let minLoad = Infinity;
  let selectedInstance: string | null = null;

  for (const instance of WHATSAPP_INSTANCES) {
    const load = loads.get(instance) || 0;
    if (load < minLoad && load < RATE_LIMIT_PER_MINUTE) {
      minLoad = load;
      selectedInstance = instance;
    }
  }

  return selectedInstance;
}

// ---------------------------------------------------------------------------
// Message Templates
// ---------------------------------------------------------------------------

interface MessageTemplate {
  body: string;
  mediaUrl?: string;
}

const MESSAGE_TEMPLATES: Record<string, MessageTemplate> = {
  // Lead nurturing
  new_lead_welcome: {
    body: `Hello {{name}}! 👋

Thank you for your interest in {{project}}.

We're excited to help you find your dream property. Our team will contact you shortly to understand your requirements.

- Sri Sai Builders`,
  },

  // Site visit
  site_visit_confirmation: {
    body: `Hi {{name}},

Your site visit is confirmed! 📍

📅 Date: {{date}}
⏰ Time: {{time}}
📍 Location: {{location}}

Google Maps: {{mapsLink}}

Our representative {{agentName}} will meet you there.

See you soon!
- Sri Sai Builders`,
  },

  // Booking
  booking_confirmation: {
    body: `Congratulations {{name}}! 🎉

Your booking is confirmed!

📋 Booking ID: {{bookingNumber}}
🏠 Property: {{property}}
💰 Amount: ₹{{amount}}

Your customer portal login:
🔗 {{portalLink}}

Thank you for choosing Sri Sai Builders!`,
  },

  // Payment
  payment_received: {
    body: `Hi {{name}},

We've received your payment! ✅

💰 Amount: ₹{{amount}}
📋 Booking: {{bookingNumber}}
📄 Receipt: {{receiptLink}}

Outstanding balance: ₹{{balance}}

Thank you!
- Sri Sai Builders`,
  },

  // Payment reminder (3 days before)
  payment_reminder_3_days: {
    body: `Hi {{name}},

Friendly reminder! 📢

Your installment of ₹{{amount}} for booking {{bookingNumber}} is due on {{dueDate}}.

Payment details:
🏦 Bank: {{bankDetails}}
📱 UPI: {{upiId}}

Please ensure timely payment to avoid late fees.

- Sri Sai Builders`,
  },

  // Overdue payment (1 day after)
  payment_overdue: {
    body: `Hi {{name}},

Your installment of ₹{{amount}} for booking {{bookingNumber}} was due on {{dueDate}}.

Please make the payment at your earliest convenience to avoid additional charges.

Need help? Call us at {{supportPhone}}.

- Sri Sai Builders`,
  },

  // Agent assignment
  agent_assigned: {
    body: `New Lead Alert! 🔔

Name: {{leadName}}
Phone: {{leadPhone}}
Source: {{source}}
Interest: {{interest}}

Please contact within 1 hour.`,
  },

  // Commission
  commission_released: {
    body: `Hi {{agentName}}! 💰

Great news! Your commission has been released.

Amount: ₹{{amount}}
Booking: {{bookingNumber}}
Expected payout: {{payoutDate}}

Keep up the great work!
- Sri Sai Builders`,
  },

  weekly_report_summary: {
    body: `Hi {{managerName}},

Here is your weekly sales summary.\n
Leads created: {{leadsCreated}}\n
Bookings created: {{bookingsCreated}}\n
Payments received: Rs {{paymentsReceived}}\n
Period: {{reportPeriod}}

- ClickProps CRM`,
  },
};

/**
 * Render a message template with variables
 */
function renderTemplate(templateName: string, params: Record<string, string>): string | null {
  const template = MESSAGE_TEMPLATES[templateName];
  if (!template) {
    return null;
  }

  let body = template.body;
  for (const [key, value] of Object.entries(params)) {
    body = body.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  return body;
}

// ---------------------------------------------------------------------------
// Evolution API Integration
// ---------------------------------------------------------------------------

interface EvolutionSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

async function sendViaEvolutionApi(
  instanceId: string,
  to: string,
  message: string,
): Promise<EvolutionSendResult> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    // Sandbox mode - log and return success
    console.log(`[WhatsApp Sandbox] Would send to ${to}: ${message.substring(0, 50)}...`);
    return {
      success: true,
      messageId: `sandbox_${Date.now()}`,
    };
  }

  try {
    // Format phone number (remove + and ensure country code)
    const formattedNumber = to.replace(/\D/g, '');
    const phoneNumber = formattedNumber.startsWith('91')
      ? formattedNumber
      : `91${formattedNumber}`;

    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${instanceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: phoneNumber,
          text: message,
          delay: 1000, // 1 second delay for natural feel
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `API error ${response.status}: ${errorText}`,
      };
    }

    const result = await response.json();

    return {
      success: true,
      messageId: result.key?.id || result.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ---------------------------------------------------------------------------
// Message Logging
// ---------------------------------------------------------------------------

interface MessageLog {
  to: string;
  templateName: string;
  status: 'sent' | 'failed' | 'skipped';
  instanceId?: string;
  messageId?: string;
  error?: string;
  customerId?: string;
  bookingId?: string;
}

async function logMessage(log: MessageLog): Promise<void> {
  try {
    // Log to console for now
    // In production, this could write to a messages table
    const timestamp = new Date().toISOString();
    console.log(
      `[WhatsApp ${log.status.toUpperCase()}] ${timestamp} | ${log.templateName} -> ${log.to}` +
        (log.error ? ` | Error: ${log.error}` : '') +
        (log.messageId ? ` | ID: ${log.messageId}` : ''),
    );

    // Create activity log if we have a bookingId
    if (log.bookingId && log.status === 'sent') {
      // This could be expanded to log to Activity table
    }
  } catch (error) {
    console.error('[WhatsApp] Failed to log message:', error);
  }
}

// ---------------------------------------------------------------------------
// Worker Process Function
// ---------------------------------------------------------------------------

async function processWhatsAppJob(job: Job<WhatsAppJobData>): Promise<void> {
  const { to, templateName, templateParams, instanceId, deduplicationKey } = job.data;

  // Render template
  const message = renderTemplate(templateName, templateParams);
  if (!message) {
    throw new Error(`Unknown template: ${templateName}`);
  }

  // Select instance
  const selectedInstance = await selectInstance(instanceId);
  if (!selectedInstance) {
    // All instances are rate limited, retry later
    throw new Error('All WhatsApp instances are rate limited');
  }

  // Check rate limit for selected instance
  const withinLimit = await checkRateLimit(selectedInstance);
  if (!withinLimit) {
    throw new Error(`Instance ${selectedInstance} rate limited`);
  }

  // Send message
  const result = await sendViaEvolutionApi(selectedInstance, to, message);

  // Log the result
  await logMessage({
    to,
    templateName,
    status: result.success ? 'sent' : 'failed',
    instanceId: selectedInstance,
    messageId: result.messageId,
    error: result.error,
    customerId: job.data.customerId,
    bookingId: job.data.bookingId,
  });

  if (!result.success) {
    throw new Error(result.error);
  }

  // Update job progress
  await job.updateProgress(100);
}

// ---------------------------------------------------------------------------
// Worker Instance
// ---------------------------------------------------------------------------

let workerInstance: Worker<WhatsAppJobData> | null = null;

export function startWhatsAppWorker(): Worker<WhatsAppJobData> {
  if (workerInstance) {
    return workerInstance;
  }

  workerInstance = new Worker<WhatsAppJobData>(
    'whatsapp',
    async (job) => {
      console.log(`[WhatsApp Worker] Processing job ${job.id}: ${job.name}`);
      await processWhatsAppJob(job);
    },
    {
      connection: getRedisConnection() as any,
      concurrency: 5, // Process 5 jobs concurrently
      limiter: {
        max: 100,
        duration: 60000, // Max 100 jobs per minute globally
      },
    },
  );

  workerInstance.on('completed', (job) => {
    console.log(`[WhatsApp Worker] Job ${job.id} completed`);
  });

  workerInstance.on('failed', (job, err) => {
    console.error(`[WhatsApp Worker] Job ${job?.id} failed:`, err.message);
  });

  workerInstance.on('error', (err) => {
    console.error('[WhatsApp Worker] Error:', err);
  });

  console.log('[WhatsApp Worker] Started');

  return workerInstance;
}

export function stopWhatsAppWorker(): void {
  if (workerInstance) {
    workerInstance.close();
    workerInstance = null;
    console.log('[WhatsApp Worker] Stopped');
  }
}

// ---------------------------------------------------------------------------
// Helper: Queue specific message types
// ---------------------------------------------------------------------------

export async function queueNewLeadWelcome(
  to: string,
  name: string,
  projectName: string,
): Promise<void> {
  const { queueWhatsAppMessage, generateWhatsAppDeduplicationKey } = await import('../queue');

  await queueWhatsAppMessage({
    to,
    templateName: 'new_lead_welcome',
    templateParams: { name, project: projectName },
    deduplicationKey: generateWhatsAppDeduplicationKey('lead', to, 'welcome'),
    priority: 'normal',
  });
}

export async function queuePaymentReminder(
  to: string,
  name: string,
  amount: string,
  bookingNumber: string,
  dueDate: string,
  installmentId: string,
): Promise<void> {
  const { queueWhatsAppMessage, generateWhatsAppDeduplicationKey } = await import('../queue');

  await queueWhatsAppMessage({
    to,
    templateName: 'payment_reminder_3_days',
    templateParams: {
      name,
      amount,
      bookingNumber,
      dueDate,
      bankDetails: process.env.BANK_DETAILS || 'Contact office for details',
      upiId: process.env.UPI_ID || 'N/A',
    },
    deduplicationKey: generateWhatsAppDeduplicationKey('installment', installmentId, 'reminder'),
    installmentId,
    priority: 'high',
  });
}

export async function queueOverdueAlert(
  to: string,
  name: string,
  amount: string,
  bookingNumber: string,
  dueDate: string,
  installmentId: string,
): Promise<void> {
  const { queueWhatsAppMessage, generateWhatsAppDeduplicationKey } = await import('../queue');

  await queueWhatsAppMessage({
    to,
    templateName: 'payment_overdue',
    templateParams: {
      name,
      amount,
      bookingNumber,
      dueDate,
      supportPhone: process.env.SUPPORT_PHONE || 'Contact office',
    },
    deduplicationKey: generateWhatsAppDeduplicationKey('installment', installmentId, 'overdue'),
    installmentId,
    priority: 'high',
  });
}
