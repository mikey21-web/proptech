const fs = require('fs/promises');
const path = require('path');

const { PrismaClient } = require('@prisma/client');
const { Worker } = require('bullmq');
const Redis = require('ioredis');

const prisma = new PrismaClient();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const WHATSAPP_INSTANCES = (process.env.WHATSAPP_INSTANCES || process.env.EVOLUTION_INSTANCE || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const ARTIFACTS_DIR = process.env.RECEIPT_OUTPUT_DIR || '/tmp/clickprops-artifacts';

const WHATSAPP_TEMPLATES = {
  payment_received:
    'Hi {{name}},\n\nWe have received your payment.\n\nAmount: Rs {{amount}}\nBooking: {{bookingNumber}}\nReceipt: {{receiptLink}}\nOutstanding balance: Rs {{balance}}\n\nThank you.\n- Sri Sai Builders',
  payment_reminder_3_days:
    'Hi {{name}},\n\nReminder: your installment of Rs {{amount}} for booking {{bookingNumber}} is due on {{dueDate}}.\n\nBank: {{bankDetails}}\nUPI: {{upiId}}\n\n- Sri Sai Builders',
  payment_overdue:
    'Hi {{name}},\n\nYour installment of Rs {{amount}} for booking {{bookingNumber}} was due on {{dueDate}}.\nPlease pay at the earliest.\n\nSupport: {{supportPhone}}\n\n- Sri Sai Builders',
  weekly_report_summary:
    'Hi {{managerName}},\n\nWeekly summary\nLeads: {{leadsCreated}}\nBookings: {{bookingsCreated}}\nPayments: Rs {{paymentsReceived}}\nPeriod: {{reportPeriod}}\n\n- ClickProps CRM',
  agent_assigned:
    'New lead alert\n\nName: {{leadName}}\nPhone: {{leadPhone}}\nSource: {{source}}\nInterest: {{interest}}\n\nPlease contact within 1 hour.',
};

function parseRedisUrl(url) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '6379', 10),
      password: parsed.password || undefined,
    };
  } catch {
    return { host: 'localhost', port: 6379, password: undefined };
  }
}

function createRedisConnection() {
  const config = parseRedisUrl(REDIS_URL);
  const client = new Redis(config.port, config.host, {
    password: config.password,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: () => null,
  });

  client.on('error', (error) => {
    console.error('[worker:redis]', error.message);
  });

  return client;
}

function renderTemplate(template, params) {
  let result = template;
  for (const [key, value] of Object.entries(params || {})) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value ?? ''));
  }
  return result;
}

function generateReceiptHtml(receipt) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Receipt - ${receipt.receiptNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; }
    .header { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 20px; }
    .header h1 { color: #1e293b; margin: 0; font-size: 24px; }
    .header p { color: #64748b; margin: 5px 0 0; }
    .receipt-info { display: flex; justify-content: space-between; margin-bottom: 30px; gap: 12px; }
    .receipt-info div { flex: 1; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f8fafc; color: #475569; font-weight: 600; }
    .amount { font-size: 24px; font-weight: bold; color: #059669; text-align: center; padding: 20px; }
    .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Sri Sai Builders</h1>
    <p>Payment Receipt</p>
  </div>
  <div class="receipt-info">
    <div>
      <strong>Receipt No:</strong> ${receipt.receiptNumber}<br>
      <strong>Date:</strong> ${receipt.paymentDate}
    </div>
    <div>
      <strong>Customer:</strong> ${receipt.customerName}<br>
      <strong>Booking:</strong> ${receipt.bookingNumber}
    </div>
  </div>
  <table>
    <tr><th>Description</th><th>Details</th></tr>
    <tr><td>Project</td><td>${receipt.projectName}</td></tr>
    <tr><td>Property</td><td>${receipt.propertyDetail}</td></tr>
    <tr><td>Payment Mode</td><td>${receipt.mode}</td></tr>
    <tr><td>Reference No</td><td>${receipt.referenceNo || 'N/A'}</td></tr>
  </table>
  <div class="amount">Amount Paid: &#8377;${Number(receipt.amount).toLocaleString('en-IN')}</div>
  <div class="footer">
    <p>This is a computer-generated receipt. No signature required.</p>
    <p>Sri Sai Builders - ClickProps CRM</p>
  </div>
</body>
</html>`;
}

async function sendWhatsApp(instanceId, to, message) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.log(`[worker:whatsapp:sandbox] ${to} :: ${message.replace(/\s+/g, ' ').slice(0, 120)}`);
    return { success: true, messageId: `sandbox_${Date.now()}` };
  }

  const formattedNumber = to.replace(/\D/g, '');
  const phoneNumber = formattedNumber.startsWith('91') ? formattedNumber : `91${formattedNumber}`;
  const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      number: phoneNumber,
      text: message,
      delay: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Evolution API returned ${response.status}`);
  }

  const payload = await response.json();
  return { success: true, messageId: payload.key?.id || payload.id || null };
}

function renderEmailTemplate(template, params) {
  switch (template) {
    case 'payment_receipt':
      return {
        text: `Hi ${params.customerName}, your payment of Rs ${Number(params.amount).toLocaleString('en-IN')} for booking ${params.bookingNumber} has been received. Receipt: ${params.receiptUrl}`,
        html: `<p>Hi ${params.customerName},</p><p>Your payment of <strong>Rs ${Number(params.amount).toLocaleString('en-IN')}</strong> for booking <strong>${params.bookingNumber}</strong> has been received.</p><p>Receipt number: <strong>${params.receiptNumber}</strong></p><p><a href="${params.receiptUrl}">View receipt</a></p><p>Project: ${params.projectName}<br>Property: ${params.propertyDetail}</p>`,
      };
    case 'payment_reminder':
      return {
        text: `Reminder: Rs ${Number(params.amount).toLocaleString('en-IN')} is due on ${params.dueDate} for booking ${params.bookingNumber}.`,
        html: `<p>Hi ${params.customerName},</p><p>This is a reminder that <strong>Rs ${Number(params.amount).toLocaleString('en-IN')}</strong> is due on <strong>${params.dueDate}</strong> for booking <strong>${params.bookingNumber}</strong>.</p><p>Project: ${params.projectName}</p><p>Bank: ${params.bankDetails}<br>UPI: ${params.upiId}</p>`,
      };
    case 'payment_overdue':
      return {
        text: `Overdue notice: Rs ${Number(params.amount).toLocaleString('en-IN')} for booking ${params.bookingNumber} was due on ${params.dueDate}.`,
        html: `<p>Hi ${params.customerName},</p><p>Your payment of <strong>Rs ${Number(params.amount).toLocaleString('en-IN')}</strong> for booking <strong>${params.bookingNumber}</strong> was due on <strong>${params.dueDate}</strong>.</p><p>Project: ${params.projectName}</p><p>Support: ${params.supportPhone}</p>`,
      };
    default:
      return {
        text: typeof params.body === 'string' ? params.body : JSON.stringify(params),
        html: `<pre>${JSON.stringify(params, null, 2)}</pre>`,
      };
  }
}

async function handleWhatsApp(job) {
  const template = WHATSAPP_TEMPLATES[job.data.templateName];
  if (!template) {
    throw new Error(`Unknown WhatsApp template: ${job.data.templateName}`);
  }

  const instanceId = WHATSAPP_INSTANCES[0] || 'default';
  const message = renderTemplate(template, job.data.templateParams || {});
  const result = await sendWhatsApp(instanceId, job.data.to, message);
  await job.updateProgress(100);
  return result;
}

async function handleEmail(job) {
  const payload = renderEmailTemplate(job.data.template, job.data.params || {});
  console.log(`[worker:email] to=${job.data.to} subject=${job.data.subject}`);
  console.log(payload.text);
  await job.updateProgress(100);
  return { delivered: true, provider: process.env.EMAIL_PROVIDER || 'mock' };
}

async function buildReceiptPayload(paymentId) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      receiptNumber: true,
      amount: true,
      mode: true,
      paymentDate: true,
      referenceNo: true,
      booking: {
        select: {
          bookingNumber: true,
          customer: { select: { name: true } },
          project: { select: { name: true } },
          plot: { select: { plotNumber: true } },
          flat: { select: { flatNumber: true } },
        },
      },
    },
  });

  if (!payment) {
    throw new Error(`Payment not found: ${paymentId}`);
  }

  const propertyDetail = payment.booking.plot
    ? `Plot ${payment.booking.plot.plotNumber}`
    : payment.booking.flat
      ? `Flat ${payment.booking.flat.flatNumber}`
      : 'N/A';

  return {
    receiptNumber: payment.receiptNumber || `RCP-${payment.id.slice(-8).toUpperCase()}`,
    amount: Number(payment.amount),
    currency: 'INR',
    paymentDate: new Date(payment.paymentDate).toLocaleDateString('en-IN'),
    mode: payment.mode.replace(/_/g, ' ').toUpperCase(),
    referenceNo: payment.referenceNo || '',
    bookingNumber: payment.booking.bookingNumber,
    customerName: payment.booking.customer.name,
    projectName: payment.booking.project.name,
    propertyDetail,
  };
}

async function handlePdf(job) {
  const outputDir = path.join(ARTIFACTS_DIR, job.data.type);
  await fs.mkdir(outputDir, { recursive: true });

  if (job.data.type === 'receipt' && job.data.paymentId) {
    const receipt = await buildReceiptPayload(job.data.paymentId);
    const outputPath = job.data.outputPath || path.join(outputDir, `${receipt.receiptNumber}.html`);
    await fs.writeFile(outputPath, generateReceiptHtml(receipt), 'utf8');
    await job.updateProgress(100);
    console.log(`[worker:pdf] receipt written to ${outputPath}`);
    return { outputPath, type: 'html-receipt' };
  }

  const outputPath = job.data.outputPath || path.join(outputDir, `${job.id || Date.now()}.json`);
  await fs.writeFile(outputPath, JSON.stringify(job.data.data || {}, null, 2), 'utf8');
  await job.updateProgress(100);
  console.log(`[worker:pdf] artifact written to ${outputPath}`);
  return { outputPath, type: 'json-artifact' };
}

async function handleNotification(job) {
  if (!job.data.userId) {
    console.log('[worker:notification] skipped notification without userId');
    await job.updateProgress(100);
    return { skipped: true };
  }

  await prisma.activity.create({
    data: {
      type: 'other',
      title: job.data.title,
      description: job.data.body,
      userId: job.data.userId,
      metadata: {
        notificationType: job.data.type,
        ...(job.data.data || {}),
      },
    },
  });

  await job.updateProgress(100);
  return { delivered: true };
}

async function handleTranscription(job) {
  console.log(`[worker:transcription] placeholder job ${job.id} for ${job.data.callLogId}`);
  await job.updateProgress(100);
  return { accepted: true };
}

let workers = [];

function attachWorkerEvents(worker) {
  worker.on('completed', (job) => {
    console.log(`[worker:${worker.name}] completed job ${job.id}`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[worker:${worker.name}] failed job ${job && job.id}: ${error.message}`);
  });

  worker.on('error', (error) => {
    console.error(`[worker:${worker.name}] error: ${error.message || String(error)}`);
  });
}

async function bootstrap() {
  const probe = createRedisConnection();
  try {
    await probe.connect();
    await probe.ping();
  } catch (error) {
    console.error(`[workers] Redis unavailable at ${REDIS_URL}: ${error.message || String(error)}`);
    process.exit(1);
  } finally {
    probe.disconnect();
  }

  workers = [
    new Worker('whatsapp', handleWhatsApp, { connection: createRedisConnection(), concurrency: 5 }),
    new Worker('email', handleEmail, { connection: createRedisConnection(), concurrency: 3 }),
    new Worker('pdf', handlePdf, { connection: createRedisConnection(), concurrency: 2 }),
    new Worker('notification', handleNotification, { connection: createRedisConnection(), concurrency: 5 }),
    new Worker('transcription', handleTranscription, { connection: createRedisConnection(), concurrency: 1 }),
  ];

  for (const worker of workers) {
    attachWorkerEvents(worker);
  }

  console.log('[workers] started queues:', workers.map((worker) => worker.name).join(', '));
}

async function shutdown(signal) {
  console.log(`[workers] received ${signal}, shutting down`);
  await Promise.allSettled(workers.map((worker) => worker.close()));
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});

bootstrap().catch(async (error) => {
  console.error(`[workers] bootstrap failed: ${error.message || String(error)}`);
  await prisma.$disconnect();
  process.exit(1);
});
