import { prisma } from '@/lib/prisma';
import { WebhookPayload, WebhookEventType } from './types';
import crypto from 'crypto';

interface RetryQueue {
  webhookId: string;
  payload: WebhookPayload;
  attempt: number;
  nextRetry: Date;
}

const retryQueue: Map<string, RetryQueue> = new Map();

async function signPayload(
  payload: string,
  secret: string,
): Promise<string> {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

export async function triggerWebhook(
  event: WebhookEventType,
  orgId: string,
  entityId: string,
  entityType: string,
  data: Record<string, any>,
  metadata?: Record<string, any>,
): Promise<void> {
  const payload: WebhookPayload = {
    event,
    timestamp: new Date(),
    orgId,
    entityId,
    entityType,
    data,
    metadata,
  };

  // Get all active webhooks for this organization and event
  const webhooks = await prisma.webhook.findMany({
    where: {
      orgId,
      isActive: true,
      event: event as any, // event is stored in DB
    },
  });

  // Dispatch to all matching webhooks
  for (const webhook of webhooks) {
    dispatch(webhook, payload).catch((error) => {
      console.error(`Failed to dispatch webhook ${webhook.id}:`, error);
      // Queue for retry
      queueRetry(webhook, payload, 0);
    });
  }
}

async function dispatch(
  webhook: any,
  payload: WebhookPayload,
): Promise<void> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'ClickProps-CRM/1.0',
    'X-Webhook-Event': payload.event,
    'X-Webhook-ID': webhook.id,
    'X-Webhook-Timestamp': payload.timestamp.toISOString(),
  };

  // Add signature if secret is configured
  if (webhook.secret) {
    headers['X-Webhook-Signature'] = await signPayload(body, webhook.secret);
  }

  // Add custom headers
  if (webhook.headers) {
    Object.assign(headers, webhook.headers);
  }

  const response = await fetch(webhook.url, {
    method: 'POST',
    headers,
    body,
  });

  if (!response.ok) {
    throw new Error(
      `Webhook returned ${response.status}: ${response.statusText}`,
    );
  }
}

function queueRetry(
  webhook: any,
  payload: WebhookPayload,
  attempt: number,
): void {
  const retryPolicy = webhook.retryPolicy || {
    maxRetries: 3,
    backoffMs: 5000,
  };

  if (attempt >= retryPolicy.maxRetries) {
    console.error(
      `Webhook ${webhook.id} failed after ${attempt} attempts. Giving up.`,
    );
    return;
  }

  const backoffMs = retryPolicy.backoffMs * Math.pow(2, attempt); // exponential backoff
  const nextRetry = new Date(Date.now() + backoffMs);

  const queueKey = `${webhook.id}:${payload.event}:${payload.entityId}`;
  retryQueue.set(queueKey, {
    webhookId: webhook.id,
    payload,
    attempt: attempt + 1,
    nextRetry,
  });

  console.log(
    `Queued retry for webhook ${webhook.id}, attempt ${attempt + 1}, retry at ${nextRetry.toISOString()}`,
  );
}

export async function processWebhookRetries(): Promise<void> {
  const now = new Date();

  for (const [key, retry] of retryQueue.entries()) {
    if (retry.nextRetry <= now) {
      try {
        const webhook = await prisma.webhook.findUnique({
          where: { id: retry.webhookId },
        });

        if (!webhook || !webhook.isActive) {
          retryQueue.delete(key);
          continue;
        }

        await dispatch(webhook, retry.payload);
        retryQueue.delete(key);
        console.log(`Webhook retry succeeded for ${key}`);
      } catch (error) {
        console.error(`Webhook retry failed for ${key}:`, error);
        queueRetry(
          await prisma.webhook.findUnique({ where: { id: retry.webhookId } }),
          retry.payload,
          retry.attempt,
        );
      }
    }
  }
}

// Export for background job processing
export async function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!signature || !secret) return false;
  const expectedSignature = await signPayload(body, secret);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}
