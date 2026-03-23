/**
 * BullMQ Queue Definitions
 *
 * Central queue configuration for all background jobs.
 * Queue and Redis clients are created lazily so builds and
 * non-worker environments do not fail when Redis is unavailable.
 */

import { Job, Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

function parseRedisUrl(url: string): { host: string; port: number; password?: string } {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '6379', 10),
      password: parsed.password || undefined,
    };
  } catch {
    return { host: 'localhost', port: 6379 };
  }
}

const redisConfig = parseRedisUrl(REDIS_URL);

let redisConnectionInstance: Redis | null = null;
let redisClientInstance: Redis | null = null;

function attachSilentErrorHandler(client: Redis) {
  client.on('error', () => {
    // Queue-backed features can be unavailable in environments
    // where Redis is intentionally not running.
  });
}

export function getRedisConnection(): Redis {
  if (!redisConnectionInstance) {
    redisConnectionInstance = new Redis(redisConfig.port, redisConfig.host, {
      password: redisConfig.password,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy: () => null,
    });
    attachSilentErrorHandler(redisConnectionInstance);
  }

  return redisConnectionInstance;
}

export function getRedisClient(): Redis {
  if (!redisClientInstance) {
    redisClientInstance = new Redis(redisConfig.port, redisConfig.host, {
      password: redisConfig.password,
      lazyConnect: true,
      retryStrategy: () => null,
    });
    attachSilentErrorHandler(redisClientInstance);
  }

  return redisClientInstance;
}

export type QueueName =
  | 'whatsapp'
  | 'email'
  | 'pdf'
  | 'transcription'
  | 'notification';

export interface WhatsAppJobData {
  to: string;
  templateName: string;
  templateParams: Record<string, string>;
  instanceId?: string;
  deduplicationKey?: string;
  priority?: 'high' | 'normal' | 'low';
  customerId?: string;
  bookingId?: string;
  installmentId?: string;
}

export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  params: Record<string, unknown>;
  attachments?: Array<{ filename: string; content: string | Buffer }>;
}

export interface PdfJobData {
  type: 'receipt' | 'agreement' | 'report';
  data: Record<string, unknown>;
  outputPath?: string;
  bookingId?: string;
  paymentId?: string;
}

export interface TranscriptionJobData {
  audioUrl: string;
  callLogId: string;
  language?: 'en' | 'te' | 'hi';
}

export interface NotificationJobData {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 5000,
  },
  removeOnComplete: {
    age: 24 * 3600,
    count: 1000,
  },
  removeOnFail: {
    age: 7 * 24 * 3600,
  },
};

let whatsappQueueInstance: Queue<WhatsAppJobData> | null = null;
let emailQueueInstance: Queue<EmailJobData> | null = null;
let pdfQueueInstance: Queue<PdfJobData> | null = null;
let transcriptionQueueInstance: Queue<TranscriptionJobData> | null = null;
let notificationQueueInstance: Queue<NotificationJobData> | null = null;

export function getWhatsAppQueue() {
  if (!whatsappQueueInstance) {
    whatsappQueueInstance = new Queue<WhatsAppJobData>('whatsapp', {
      connection: getRedisConnection() as any,
      defaultJobOptions: {
        ...defaultJobOptions,
        priority: 2,
      },
    });
  }
  return whatsappQueueInstance;
}

export function getEmailQueue() {
  if (!emailQueueInstance) {
    emailQueueInstance = new Queue<EmailJobData>('email', {
      connection: getRedisConnection() as any,
      defaultJobOptions,
    });
  }
  return emailQueueInstance;
}

export function getPdfQueue() {
  if (!pdfQueueInstance) {
    pdfQueueInstance = new Queue<PdfJobData>('pdf', {
      connection: getRedisConnection() as any,
      defaultJobOptions: {
        ...defaultJobOptions,
        priority: 1,
      },
    });
  }
  return pdfQueueInstance;
}

export function getTranscriptionQueue() {
  if (!transcriptionQueueInstance) {
    transcriptionQueueInstance = new Queue<TranscriptionJobData>('transcription', {
      connection: getRedisConnection() as any,
      defaultJobOptions: {
        ...defaultJobOptions,
        priority: 5,
        attempts: 2,
      },
    });
  }
  return transcriptionQueueInstance;
}

export function getNotificationQueue() {
  if (!notificationQueueInstance) {
    notificationQueueInstance = new Queue<NotificationJobData>('notification', {
      connection: getRedisConnection() as any,
      defaultJobOptions: {
        ...defaultJobOptions,
        priority: 1,
      },
    });
  }
  return notificationQueueInstance;
}

export async function shouldSkipDuplicate(
  key: string,
  ttlSeconds: number = 3600,
): Promise<boolean> {
  const exists = await getRedisClient().exists(key);
  return exists === 1;
}

export async function markAsProcessed(
  key: string,
  ttlSeconds: number = 3600,
): Promise<void> {
  await getRedisClient().setex(key, ttlSeconds, '1');
}

export function generateWhatsAppDeduplicationKey(
  type: string,
  entityId: string,
  action: string,
): string {
  return `whatsapp:${type}:${entityId}:${action}`;
}

export function setupQueueEventHandlers(): void {
  const queueNames: QueueName[] = ['whatsapp', 'email', 'pdf', 'transcription', 'notification'];

  for (const name of queueNames) {
    const events = new QueueEvents(name, { connection: getRedisConnection() as any });

    events.on('completed', ({ jobId }) => {
      console.log(`[${name}] Job ${jobId} completed`);
    });

    events.on('failed', ({ jobId, failedReason }) => {
      console.error(`[${name}] Job ${jobId} failed: ${failedReason}`);
    });

    events.on('stalled', ({ jobId }) => {
      console.warn(`[${name}] Job ${jobId} stalled`);
    });
  }
}

export async function queueWhatsAppMessage(
  data: WhatsAppJobData,
): Promise<Job<WhatsAppJobData> | null> {
  if (data.deduplicationKey) {
    const shouldSkip = await shouldSkipDuplicate(data.deduplicationKey);
    if (shouldSkip) {
      console.log(`[whatsapp] Skipping duplicate message: ${data.deduplicationKey}`);
      return null;
    }
  }

  const priority = data.priority === 'high' ? 1 : data.priority === 'low' ? 5 : 3;
  const job = (await getWhatsAppQueue().add(data.templateName as any, data, { priority })) as Job<WhatsAppJobData>;

  if (data.deduplicationKey) {
    await markAsProcessed(data.deduplicationKey);
  }

  return job;
}

export async function queueEmail(data: EmailJobData): Promise<Job<EmailJobData>> {
  return (await getEmailQueue().add('send' as any, data)) as Job<EmailJobData>;
}

export async function queuePdf(data: PdfJobData): Promise<Job<PdfJobData>> {
  const priority = data.type === 'receipt' ? 1 : 3;
  return (await getPdfQueue().add(data.type as any, data, { priority })) as Job<PdfJobData>;
}

export async function queueTranscription(
  data: TranscriptionJobData,
): Promise<Job<TranscriptionJobData>> {
  return (await getTranscriptionQueue().add('transcribe' as any, data)) as Job<TranscriptionJobData>;
}

export async function queueNotification(
  data: NotificationJobData,
): Promise<Job<NotificationJobData>> {
  return (await getNotificationQueue().add(data.type as any, data)) as Job<NotificationJobData>;
}

export async function getQueueStats(): Promise<Record<string, unknown>> {
  const queues = [
    { name: 'whatsapp', queue: getWhatsAppQueue() },
    { name: 'email', queue: getEmailQueue() },
    { name: 'pdf', queue: getPdfQueue() },
    { name: 'transcription', queue: getTranscriptionQueue() },
    { name: 'notification', queue: getNotificationQueue() },
  ];

  const stats: Record<string, unknown> = {};

  for (const { name, queue } of queues) {
    stats[name] = await queue.getJobCounts();
  }

  return stats;
}
