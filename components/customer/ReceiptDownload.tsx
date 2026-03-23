'use client';

import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';

interface ReceiptDownloadProps {
  paymentId: string;
  receiptNumber?: string | null;
  className?: string;
}

export default function ReceiptDownload({
  paymentId,
  receiptNumber,
  className,
}: ReceiptDownloadProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/customer/payments/${paymentId}/receipt`);
      if (!res.ok) throw new Error('Failed to download receipt');

      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${receiptNumber || paymentId}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Receipt download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors',
        downloading && 'opacity-50',
        className,
      )}
      aria-label={`Download receipt ${receiptNumber || ''}`}
    >
      {downloading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      Download
    </button>
  );
}
