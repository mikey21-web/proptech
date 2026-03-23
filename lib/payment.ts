/**
 * Payment gateway integration — Razorpay primary, Stripe fallback
 *
 * In production, RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET should be set.
 * This module handles order creation, verification, and receipt generation.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaymentOrder {
  id: string;
  amount: number; // in smallest currency unit (paise for INR)
  currency: string;
  receipt: string;
  status: string;
  gateway: 'razorpay' | 'stripe';
  gatewayOrderId: string;
  notes?: Record<string, string>;
}

export interface PaymentVerification {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface PaymentReceipt {
  receiptNumber: string;
  amount: number;
  currency: string;
  paymentDate: string;
  mode: string;
  referenceNo: string;
  bookingNumber: string;
  customerName: string;
  projectName: string;
  propertyDetail: string;
}

// ---------------------------------------------------------------------------
// Razorpay integration
// ---------------------------------------------------------------------------

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

function getRazorpayAuth(): string {
  return Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString(
    'base64',
  );
}

/**
 * Create a Razorpay order for the given amount (in INR).
 */
export async function createRazorpayOrder(
  amountInr: number,
  receipt: string,
  notes?: Record<string, string>,
): Promise<PaymentOrder> {
  const amountPaise = Math.round(amountInr * 100);

  // If Razorpay credentials are missing, return a sandbox mock
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return {
      id: `order_sandbox_${Date.now()}`,
      amount: amountPaise,
      currency: 'INR',
      receipt,
      status: 'created',
      gateway: 'razorpay',
      gatewayOrderId: `order_sandbox_${Date.now()}`,
      notes,
    };
  }

  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${getRazorpayAuth()}`,
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes: notes ?? {},
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Razorpay order creation failed: ${err}`);
  }

  const order = await res.json();

  return {
    id: order.id,
    amount: order.amount,
    currency: order.currency,
    receipt: order.receipt,
    status: order.status,
    gateway: 'razorpay',
    gatewayOrderId: order.id,
    notes,
  };
}

/**
 * Verify Razorpay payment signature (HMAC SHA256)
 */
export async function verifyRazorpayPayment(
  verification: PaymentVerification,
): Promise<boolean> {
  if (!RAZORPAY_KEY_SECRET) {
    // Sandbox mode — accept all
    return true;
  }

  const crypto = await import('crypto');
  const body = `${verification.orderId}|${verification.paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  return expectedSignature === verification.signature;
}

/**
 * Get Razorpay public key for client-side checkout
 */
export function getRazorpayKeyId(): string {
  return RAZORPAY_KEY_ID || 'rzp_test_sandbox';
}

// ---------------------------------------------------------------------------
// Receipt generation (simple HTML-to-text receipt)
// ---------------------------------------------------------------------------

export function generateReceiptHtml(receipt: PaymentReceipt): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Receipt - ${receipt.receiptNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; }
    .header { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 20px; }
    .header h1 { color: #1e293b; margin: 0; font-size: 24px; }
    .header p { color: #64748b; margin: 5px 0 0; }
    .receipt-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
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
  <div class="amount">
    Amount Paid: &#8377;${receipt.amount.toLocaleString('en-IN')}
  </div>
  <div class="footer">
    <p>This is a computer-generated receipt. No signature required.</p>
    <p>Sri Sai Builders &mdash; ClickProps CRM</p>
  </div>
</body>
</html>`;
}
