'use client';

import dynamic from 'next/dynamic';

const LayoutCanvas = dynamic(() => import('./layout-canvas'), { ssr: false });

export default function LayoutPage() {
  return <LayoutCanvas />;
}
