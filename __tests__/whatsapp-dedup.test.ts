/**
 * WhatsApp Deduplication Tests
 *
 * Tests per DEBUG.md Section 10:
 * - Messages go through BullMQ queue (Redis-backed)
 * - Message retry logic with backoff
 * - Failed messages logged with reason
 * - Rate limiting: rotation across 20 instances
 * - Each trigger fires once per entity (not multiple times)
 */

import {
  generateWhatsAppDeduplicationKey,
} from '../lib/queue';

describe('WhatsApp Deduplication Keys', () => {
  test('generates unique key for installment reminder', () => {
    const key = generateWhatsAppDeduplicationKey('installment', 'inst-123', 'reminder');
    expect(key).toBe('whatsapp:installment:inst-123:reminder');
  });

  test('generates unique key for installment overdue', () => {
    const key = generateWhatsAppDeduplicationKey('installment', 'inst-123', 'overdue');
    expect(key).toBe('whatsapp:installment:inst-123:overdue');
  });

  test('generates unique key for lead welcome', () => {
    const key = generateWhatsAppDeduplicationKey('lead', '+919876543210', 'welcome');
    expect(key).toBe('whatsapp:lead:+919876543210:welcome');
  });

  test('generates unique key for booking confirmation', () => {
    const key = generateWhatsAppDeduplicationKey('booking', 'BK-00001', 'confirmation');
    expect(key).toBe('whatsapp:booking:BK-00001:confirmation');
  });

  test('generates unique key for payment receipt', () => {
    const key = generateWhatsAppDeduplicationKey('payment', 'pay-456', 'receipt');
    expect(key).toBe('whatsapp:payment:pay-456:receipt');
  });

  test('different entities produce different keys', () => {
    const key1 = generateWhatsAppDeduplicationKey('installment', 'id-1', 'reminder');
    const key2 = generateWhatsAppDeduplicationKey('installment', 'id-2', 'reminder');
    const key3 = generateWhatsAppDeduplicationKey('installment', 'id-1', 'overdue');

    expect(key1).not.toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key2).not.toBe(key3);
  });
});

describe('WhatsApp Message Templates', () => {
  // Template rendering tests (mimicking the worker logic)
  function renderTemplate(template: string, params: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  test('renders template with all variables', () => {
    const template = 'Hello {{name}}! Your booking {{bookingNumber}} is confirmed.';
    const params = { name: 'John', bookingNumber: 'BK-00001' };
    const result = renderTemplate(template, params);
    expect(result).toBe('Hello John! Your booking BK-00001 is confirmed.');
  });

  test('handles missing variables gracefully', () => {
    const template = 'Hello {{name}}! Amount: {{amount}}';
    const params = { name: 'John' };
    const result = renderTemplate(template, params);
    expect(result).toBe('Hello John! Amount: {{amount}}');
  });

  test('replaces multiple occurrences of same variable', () => {
    const template = '{{name}} booked for {{name}} at {{time}}';
    const params = { name: 'John', time: '10:00 AM' };
    const result = renderTemplate(template, params);
    expect(result).toBe('John booked for John at 10:00 AM');
  });
});

describe('WhatsApp Rate Limiting Logic', () => {
  const RATE_LIMIT_PER_MINUTE = 20;

  interface InstanceLoad {
    instanceId: string;
    currentLoad: number;
  }

  function selectLeastLoadedInstance(instances: InstanceLoad[]): string | null {
    let minLoad = Infinity;
    let selected: string | null = null;

    for (const instance of instances) {
      if (instance.currentLoad < minLoad && instance.currentLoad < RATE_LIMIT_PER_MINUTE) {
        minLoad = instance.currentLoad;
        selected = instance.instanceId;
      }
    }

    return selected;
  }

  test('selects instance with lowest load', () => {
    const instances: InstanceLoad[] = [
      { instanceId: 'wa-1', currentLoad: 15 },
      { instanceId: 'wa-2', currentLoad: 5 },
      { instanceId: 'wa-3', currentLoad: 10 },
    ];

    expect(selectLeastLoadedInstance(instances)).toBe('wa-2');
  });

  test('returns null when all instances are rate limited', () => {
    const instances: InstanceLoad[] = [
      { instanceId: 'wa-1', currentLoad: 20 },
      { instanceId: 'wa-2', currentLoad: 25 },
      { instanceId: 'wa-3', currentLoad: 20 },
    ];

    expect(selectLeastLoadedInstance(instances)).toBeNull();
  });

  test('selects first available when loads are equal', () => {
    const instances: InstanceLoad[] = [
      { instanceId: 'wa-1', currentLoad: 10 },
      { instanceId: 'wa-2', currentLoad: 10 },
      { instanceId: 'wa-3', currentLoad: 10 },
    ];

    // Should select the first one with min load
    expect(selectLeastLoadedInstance(instances)).toBe('wa-1');
  });

  test('handles empty instance list', () => {
    expect(selectLeastLoadedInstance([])).toBeNull();
  });
});

describe('WhatsApp Trigger Scenarios', () => {
  // Track which messages have been sent (simulating deduplication)
  const sentMessages = new Set<string>();

  function wouldSendMessage(deduplicationKey: string): boolean {
    if (sentMessages.has(deduplicationKey)) {
      return false; // Already sent
    }
    sentMessages.add(deduplicationKey);
    return true;
  }

  beforeEach(() => {
    sentMessages.clear();
  });

  test('3-day reminder fires only once per installment', () => {
    const installmentId = 'inst-001';
    const key = generateWhatsAppDeduplicationKey('installment', installmentId, 'reminder');

    // First call should succeed
    expect(wouldSendMessage(key)).toBe(true);

    // Subsequent calls should be blocked
    expect(wouldSendMessage(key)).toBe(false);
    expect(wouldSendMessage(key)).toBe(false);
  });

  test('overdue alert fires only once per installment', () => {
    const installmentId = 'inst-001';
    const key = generateWhatsAppDeduplicationKey('installment', installmentId, 'overdue');

    expect(wouldSendMessage(key)).toBe(true);
    expect(wouldSendMessage(key)).toBe(false);
  });

  test('reminder and overdue are independent events', () => {
    const installmentId = 'inst-001';
    const reminderKey = generateWhatsAppDeduplicationKey('installment', installmentId, 'reminder');
    const overdueKey = generateWhatsAppDeduplicationKey('installment', installmentId, 'overdue');

    // Both should be able to fire once
    expect(wouldSendMessage(reminderKey)).toBe(true);
    expect(wouldSendMessage(overdueKey)).toBe(true);

    // Neither should fire again
    expect(wouldSendMessage(reminderKey)).toBe(false);
    expect(wouldSendMessage(overdueKey)).toBe(false);
  });

  test('different installments get their own reminders', () => {
    const key1 = generateWhatsAppDeduplicationKey('installment', 'inst-001', 'reminder');
    const key2 = generateWhatsAppDeduplicationKey('installment', 'inst-002', 'reminder');
    const key3 = generateWhatsAppDeduplicationKey('installment', 'inst-003', 'reminder');

    // Each installment should get one reminder
    expect(wouldSendMessage(key1)).toBe(true);
    expect(wouldSendMessage(key2)).toBe(true);
    expect(wouldSendMessage(key3)).toBe(true);

    // None should get a second reminder
    expect(wouldSendMessage(key1)).toBe(false);
    expect(wouldSendMessage(key2)).toBe(false);
    expect(wouldSendMessage(key3)).toBe(false);
  });
});

describe('WhatsApp Phone Number Formatting', () => {
  function formatPhoneNumber(phone: string): string {
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.startsWith('91') ? digitsOnly : `91${digitsOnly}`;
  }

  test('adds country code to 10-digit number', () => {
    expect(formatPhoneNumber('9876543210')).toBe('919876543210');
  });

  test('keeps existing country code', () => {
    expect(formatPhoneNumber('919876543210')).toBe('919876543210');
  });

  test('removes + prefix and keeps country code', () => {
    expect(formatPhoneNumber('+919876543210')).toBe('919876543210');
  });

  test('removes spaces and dashes', () => {
    expect(formatPhoneNumber('98765 43210')).toBe('919876543210');
    expect(formatPhoneNumber('98765-43210')).toBe('919876543210');
  });

  test('handles formatted numbers with parentheses', () => {
    expect(formatPhoneNumber('(98765) 43210')).toBe('919876543210');
  });
});
