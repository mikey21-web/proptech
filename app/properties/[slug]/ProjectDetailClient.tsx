'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import to avoid SSR issues with Konva
const PropertyFloorPlan = dynamic(() => import('@/components/public/PropertyFloorPlan'), { ssr: false, loading: () => (
  <div className="h-64 bg-slate-100 rounded-xl animate-pulse flex items-center justify-center text-slate-400 text-sm">
    Loading floor plan...
  </div>
)});

interface Plot {
  id: string; plotNumber: string; area: number; dimensions: string | null;
  facing: string | null; price: number; pricePerSqft: number | null;
  status: string; coordinates: number[][] | null;
}

interface Flat {
  id: string; flatNumber: string; floor: number; bedrooms: number; bathrooms: number;
  area: number; superArea: number | null; facing: string | null; price: number;
  pricePerSqft: number | null; status: string; coordinates: number[][] | null;
}

interface Props {
  plots: Plot[];
  flats: Flat[];
  sitePlanUrl: string | null;
  sitePlanWidth: number | null;
  sitePlanHeight: number | null;
  projectSlug: string;
}

interface SelectedUnit {
  id: string;
  number: string;
  type: 'plot' | 'flat';
  price: number;
}

export default function ProjectDetailClient({ plots, flats, sitePlanUrl, sitePlanWidth, sitePlanHeight, projectSlug }: Props) {
  const [enquiryUnit, setEnquiryUnit] = useState<SelectedUnit | null>(null);
  const [showEnquiry, setShowEnquiry] = useState(false);

  const handleUnitSelect = (unit: SelectedUnit) => {
    setEnquiryUnit(unit);
    setShowEnquiry(true);
    // Scroll to enquiry form
    setTimeout(() => {
      document.getElementById('unit-enquiry-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  return (
    <div className="space-y-4">
      <PropertyFloorPlan
        plots={plots}
        flats={flats}
        sitePlanUrl={sitePlanUrl}
        sitePlanWidth={sitePlanWidth}
        sitePlanHeight={sitePlanHeight}
        onUnitSelect={handleUnitSelect}
      />

      {/* Unit-specific enquiry panel — shown when user clicks an available unit */}
      {showEnquiry && enquiryUnit && (
        <div id="unit-enquiry-panel" className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-slate-900">
              Enquire about {enquiryUnit.type === 'plot' ? 'Plot' : 'Flat'} #{enquiryUnit.number}
            </h4>
            <button
              onClick={() => setShowEnquiry(false)}
              className="text-slate-400 hover:text-slate-600 text-xl leading-none"
            >
              ×
            </button>
          </div>
          <UnitEnquiryForm
            projectSlug={projectSlug}
            unitId={enquiryUnit.id}
            unitType={enquiryUnit.type}
            unitLabel={`${enquiryUnit.type === 'plot' ? 'Plot' : 'Flat'} #${enquiryUnit.number}`}
            onSuccess={() => setShowEnquiry(false)}
          />
        </div>
      )}
    </div>
  );
}

import EnquiryFormClient from '@/components/public/EnquiryFormClient';

function UnitEnquiryForm({ projectSlug, unitId, unitType, unitLabel, onSuccess }: {
  projectSlug: string; unitId: string; unitType: 'plot' | 'flat';
  unitLabel: string; onSuccess?: () => void;
}) {
  return (
    <EnquiryFormClient
      projectSlug={projectSlug}
      unitId={unitId}
      unitType={unitType}
      unitLabel={unitLabel}
      onSuccess={onSuccess}
    />
  );
}
