'use client';

import { useState } from 'react';
import EnquiryFormClient from '@/components/public/EnquiryFormClient';

interface Props {
  projectSlug: string;
  unitId?: string;
  unitType?: 'plot' | 'flat';
  unitLabel?: string;
}

export default function ProjectEnquiryForm({ projectSlug, unitId, unitType, unitLabel }: Props) {
  return (
    <EnquiryFormClient
      projectSlug={projectSlug}
      unitId={unitId}
      unitType={unitType}
      unitLabel={unitLabel}
    />
  );
}
