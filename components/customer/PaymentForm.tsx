'use client';

import { useState } from 'react';
import { CreditCard, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';

interface PaymentFormProps {
  bookingId: string;
  bookingNumber: string;
  projectName: string;
  maxAmount: number;
  installmentId?: string;
  suggestedAmount?: number;
  razorpayKeyId: string;
  onSuccess: (result: { receiptNumber: string; paymentId: string }) => void;
  onCancel: () => void;
}

type PaymentState = 'form' | 'processing' | 'success' | 'error';

export default function PaymentForm({
  bookingId,
  bookingNumber,
  projectName,
  maxAmount,
  installmentId,
  suggestedAmount,
  razorpayKeyId,
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  const [amount, setAmount] = useState(suggestedAmount?.toString() || '');
  const [state, setState] = useState<PaymentState>('form');
  const [error, setError] = useState('');

  const numAmount = parseFloat(amount) || 0;
  const isValid = numAmount > 0 && numAmount <= maxAmount;

  const handlePay = async () => {
    if (!isValid) return;

    setState('processing');
    setError('');

    try {
      // 1. Create order
      const orderRes = await fetch('/api/customer/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          installmentId,
          amount: numAmount,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderData.success) {
        throw new Error(orderData.error || 'Failed to create payment order');
      }

      const { order } = orderData.data;

      // 2. Open Razorpay checkout
      // Check if Razorpay SDK is loaded
      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        const rzp = new (window as any).Razorpay({
          key: razorpayKeyId,
          amount: order.amount,
          currency: order.currency,
          name: 'Sri Sai Builders',
          description: `Payment for ${bookingNumber}`,
          order_id: order.gatewayOrderId,
          handler: async (response: any) => {
            // 3. Verify payment
            try {
              const verifyRes = await fetch('/api/customer/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  bookingId,
                  installmentId,
                  amount: numAmount,
                }),
              });

              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                setState('success');
                onSuccess(verifyData.data);
              } else {
                throw new Error(verifyData.error || 'Verification failed');
              }
            } catch (err) {
              setError(String(err));
              setState('error');
            }
          },
          prefill: {},
          theme: { color: '#3b82f6' },
        });
        rzp.open();
      } else {
        // Sandbox mode — simulate payment success
        const verifyRes = await fetch('/api/customer/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpayOrderId: order.gatewayOrderId,
            razorpayPaymentId: `pay_sandbox_${Date.now()}`,
            razorpaySignature: `sig_sandbox_${Date.now()}`,
            bookingId,
            installmentId,
            amount: numAmount,
          }),
        });

        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          setState('success');
          onSuccess(verifyData.data);
        } else {
          throw new Error(verifyData.error || 'Payment failed');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
      setState('error');
    }
  };

  if (state === 'success') {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Payment Successful!
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Your payment of {formatCurrency(numAmount)} for {bookingNumber} has been
          processed.
        </p>
        <button
          onClick={onCancel}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          Make Payment
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {projectName} — {bookingNumber}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Amount input */}
      <div>
        <label
          htmlFor="payment-amount"
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          Payment Amount (INR)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
            &#8377;
          </span>
          <input
            id="payment-amount"
            type="number"
            min="1"
            max={maxAmount}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full rounded-lg border border-input bg-background px-4 py-3 pl-8 text-lg font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            disabled={state === 'processing'}
            aria-describedby="amount-help"
          />
        </div>
        <p id="amount-help" className="mt-1.5 text-xs text-muted-foreground">
          Maximum payable: {formatCurrency(maxAmount)}
        </p>
        {numAmount > maxAmount && (
          <p className="mt-1 text-xs text-destructive">
            Amount exceeds outstanding balance.
          </p>
        )}
      </div>

      {/* Quick amount buttons */}
      {suggestedAmount && suggestedAmount !== numAmount && (
        <div>
          <button
            onClick={() => setAmount(suggestedAmount.toString())}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            Pay installment: {formatCurrency(suggestedAmount)}
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          disabled={state === 'processing'}
        >
          Cancel
        </button>
        <button
          onClick={handlePay}
          disabled={!isValid || state === 'processing'}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
            isValid && state !== 'processing'
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed',
          )}
        >
          {state === 'processing' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              Pay {numAmount > 0 ? formatCurrency(numAmount) : ''}
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Powered by Razorpay. Your payment is secured with 256-bit encryption.
      </p>
    </div>
  );
}
