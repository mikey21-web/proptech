'use client';

import dynamic from 'next/dynamic';

const CustomerCanvas = dynamic(() => import('./customer-canvas'), { ssr: false });

export default function PlotsPage() {
  return <CustomerCanvas />;
}
