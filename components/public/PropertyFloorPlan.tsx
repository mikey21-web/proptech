'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Group, Line, Image as KonvaImage } from 'react-konva';
import { ZoomIn, ZoomOut, RotateCcw, Grid3X3, Layers } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PublicUnit {
  id: string;
  number: string; // plotNumber or flatNumber
  area: number;
  price: number;
  pricePerSqft: number | null;
  status: string;
  facing: string | null;
  dimensions?: string | null;
  floor?: number;
  bedrooms?: number;
  coordinates: number[][] | null;
  type: 'plot' | 'flat';
}

interface PropertyFloorPlanProps {
  plots: Array<{
    id: string; plotNumber: string; area: number; price: number; pricePerSqft: number | null;
    status: string; facing: string | null; dimensions: string | null; coordinates: number[][] | null;
  }>;
  flats: Array<{
    id: string; flatNumber: string; floor: number; bedrooms: number; bathrooms: number;
    area: number; price: number; pricePerSqft: number | null; status: string;
    facing: string | null; coordinates: number[][] | null;
  }>;
  sitePlanUrl: string | null;
  sitePlanWidth: number | null;
  sitePlanHeight: number | null;
  onUnitSelect?: (unit: PublicUnit) => void;
}

// ---------------------------------------------------------------------------
// Status styling
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  available:  { fill: 'rgba(34,197,94,0.3)',  stroke: '#16a34a', label: 'Available'  },
  reserved:   { fill: 'rgba(251,191,36,0.3)', stroke: '#d97706', label: 'Reserved'   },
  booked:     { fill: 'rgba(239,68,68,0.3)',  stroke: '#dc2626', label: 'Booked'     },
  sold:       { fill: 'rgba(107,114,128,0.3)',stroke: '#4b5563', label: 'Sold'       },
};

function formatPrice(price: number) {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L`;
  return `₹${price.toLocaleString('en-IN')}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PropertyFloorPlan({
  plots,
  flats,
  sitePlanUrl,
  sitePlanWidth,
  sitePlanHeight,
  onUnitSelect,
}: PropertyFloorPlanProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 500 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [mode, setMode] = useState<'grid' | 'plan'>(sitePlanUrl ? 'plan' : 'grid');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [floorFilter, setFloorFilter] = useState<number | null>(null);

  // Combine plots + flats into unified units
  const allUnits: PublicUnit[] = [
    ...plots.map((p) => ({ ...p, number: p.plotNumber, type: 'plot' as const })),
    ...flats.map((f) => ({ ...f, number: f.flatNumber, type: 'flat' as const })),
  ];

  const floors = [...new Set(flats.map((f) => f.floor))].sort((a, b) => a - b);

  const visibleUnits = allUnits.filter((u) => {
    if (mode === 'grid') {
      if (floorFilter !== null && u.floor !== undefined && u.floor !== floorFilter) return false;
    }
    return true;
  });

  // Responsive sizing
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        setStageSize({ width: w, height: Math.min(w * 0.6, 520) });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Load bg image for plan mode
  useEffect(() => {
    if (!sitePlanUrl) return;
    const img = new window.Image();
    img.src = sitePlanUrl;
    img.onload = () => setBgImage(img);
  }, [sitePlanUrl]);

  // Grid layout: auto-position units
  const GRID_COLS = Math.ceil(Math.sqrt(visibleUnits.length)) || 1;
  const CELL = 80;
  const PAD = 10;

  const getUnitRect = (u: PublicUnit, idx: number) => {
    if (mode === 'plan' && u.coordinates && u.coordinates.length >= 3) {
      return null; // use polygon
    }
    const col = idx % GRID_COLS;
    const row = Math.floor(idx / GRID_COLS);
    return {
      x: PAD + col * (CELL + PAD),
      y: PAD + row * (CELL + PAD),
      width: CELL,
      height: CELL,
    };
  };

  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const zoom = (delta: number) => {
    setScale((s) => Math.max(0.3, Math.min(4, s + delta)));
  };

  const selectedUnit = allUnits.find((u) => u.id === selectedId);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Mode toggle */}
        <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => setMode('grid')}
            className={cn('flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors', mode === 'grid' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700')}
          >
            <Grid3X3 className="h-3.5 w-3.5" /> Grid View
          </button>
          {sitePlanUrl && (
            <button
              onClick={() => setMode('plan')}
              className={cn('flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors', mode === 'plan' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700')}
            >
              <Layers className="h-3.5 w-3.5" /> Site Plan
            </button>
          )}
        </div>

        {/* Floor filter for flats */}
        {floors.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Floor:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setFloorFilter(null)}
                className={cn('text-xs px-2 py-1 rounded border transition-colors', floorFilter === null ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-300')}
              >
                All
              </button>
              {floors.map((f) => (
                <button
                  key={f}
                  onClick={() => setFloorFilter(f)}
                  className={cn('text-xs px-2 py-1 rounded border transition-colors', floorFilter === f ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:border-blue-300')}
                >
                  F{f}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button onClick={() => zoom(0.2)} className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button onClick={() => zoom(-0.2)} className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            <ZoomOut className="h-4 w-4" />
          </button>
          <button onClick={resetView} className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(STATUS_COLORS).map(([key, { fill, stroke, label }]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-slate-600">
            <div className="h-3 w-4 rounded-sm" style={{ background: fill, border: `1.5px solid ${stroke}` }} />
            {label}
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 cursor-grab active:cursor-grabbing">
        <Stage
          width={stageSize.width}
          height={stageSize.height}
          scaleX={scale}
          scaleY={scale}
          x={position.x}
          y={position.y}
          draggable
          onDragEnd={(e) => setPosition({ x: e.target.x(), y: e.target.y() })}
        >
          <Layer>
            {/* Background site plan image */}
            {mode === 'plan' && bgImage && sitePlanWidth && sitePlanHeight && (
              <KonvaImage
                image={bgImage}
                x={0}
                y={0}
                width={stageSize.width / scale}
                height={(stageSize.width / scale) * (sitePlanHeight / sitePlanWidth)}
                opacity={0.8}
              />
            )}

            {/* Units */}
            {visibleUnits.map((unit, idx) => {
              const colors = STATUS_COLORS[unit.status] ?? STATUS_COLORS.available;
              const isHovered = hoveredId === unit.id;
              const isSelected = selectedId === unit.id;

              // Polygon mode (site plan overlay)
              if (mode === 'plan' && unit.coordinates && unit.coordinates.length >= 3) {
                const flatPoints = unit.coordinates.flatMap(([x, y]) => {
                  // Scale coordinates to stage size
                  const scaleX2 = sitePlanWidth ? (stageSize.width / scale) / sitePlanWidth : 1;
                  const scaleY2 = sitePlanHeight ? ((stageSize.width / scale) * (sitePlanHeight / sitePlanWidth)) / sitePlanHeight : 1;
                  return [x * scaleX2, y * scaleY2];
                });
                const cx = flatPoints.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0) / (flatPoints.length / 2);
                const cy = flatPoints.filter((_, i) => i % 2 !== 0).reduce((a, b) => a + b, 0) / (flatPoints.length / 2);
                return (
                  <Group
                    key={unit.id}
                    onMouseEnter={() => setHoveredId(unit.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => {
                      setSelectedId(unit.id);
                      if (unit.status === 'available') onUnitSelect?.(unit);
                    }}
                  >
                    <Line
                      points={flatPoints}
                      closed
                      fill={isSelected ? colors.fill.replace('0.3', '0.6') : isHovered ? colors.fill.replace('0.3', '0.5') : colors.fill}
                      stroke={isSelected || isHovered ? colors.stroke : colors.stroke}
                      strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1.5}
                    />
                    <Text
                      x={cx - 16}
                      y={cy - 8}
                      text={unit.number}
                      fontSize={10}
                      fill="#1e293b"
                      fontStyle="bold"
                      width={32}
                      align="center"
                    />
                  </Group>
                );
              }

              // Grid rect mode
              const rect = getUnitRect(unit, idx);
              if (!rect) return null;

              return (
                <Group
                  key={unit.id}
                  x={rect.x}
                  y={rect.y}
                  onMouseEnter={() => setHoveredId(unit.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => {
                    setSelectedId(unit.id);
                    if (unit.status === 'available') onUnitSelect?.(unit);
                  }}
                >
                  <Rect
                    width={rect.width}
                    height={rect.height}
                    fill={isSelected ? colors.fill.replace('0.3', '0.6') : isHovered ? colors.fill.replace('0.3', '0.5') : colors.fill}
                    stroke={isSelected || isHovered ? colors.stroke : '#cbd5e1'}
                    strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
                    cornerRadius={4}
                  />
                  <Text
                    x={4} y={8}
                    text={unit.number}
                    fontSize={10}
                    fill="#1e293b"
                    fontStyle="bold"
                    width={rect.width - 8}
                    align="center"
                  />
                  <Text
                    x={4} y={24}
                    text={`${unit.area}sqft`}
                    fontSize={8}
                    fill="#64748b"
                    width={rect.width - 8}
                    align="center"
                  />
                  <Text
                    x={4} y={38}
                    text={formatPrice(unit.price)}
                    fontSize={8}
                    fill="#0f172a"
                    fontStyle="bold"
                    width={rect.width - 8}
                    align="center"
                  />
                  {(isHovered || isSelected) && (
                    <Text
                      x={4} y={52}
                      text={colors.label}
                      fontSize={8}
                      fill={colors.stroke}
                      width={rect.width - 8}
                      align="center"
                    />
                  )}
                </Group>
              );
            })}
          </Layer>
        </Stage>
      </div>

      {/* Selected unit panel */}
      {selectedUnit && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-slate-900">
                  {selectedUnit.type === 'plot' ? 'Plot' : `Flat`} #{selectedUnit.number}
                </span>
                {selectedUnit.bedrooms && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{selectedUnit.bedrooms} BHK</span>
                )}
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded"
                  style={{ background: STATUS_COLORS[selectedUnit.status]?.fill ?? '#f1f5f9', color: STATUS_COLORS[selectedUnit.status]?.stroke ?? '#64748b' }}
                >
                  {STATUS_COLORS[selectedUnit.status]?.label ?? selectedUnit.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                <span>{selectedUnit.area} sq.ft</span>
                {selectedUnit.dimensions && <span>{selectedUnit.dimensions}</span>}
                {selectedUnit.facing && <span>Facing: {selectedUnit.facing}</span>}
                {selectedUnit.floor !== undefined && <span>Floor: {selectedUnit.floor}</span>}
              </div>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {formatPrice(selectedUnit.price)}
                {selectedUnit.pricePerSqft && (
                  <span className="text-sm font-normal text-slate-500 ml-2">({formatPrice(selectedUnit.pricePerSqft)}/sqft)</span>
                )}
              </p>
            </div>
            {selectedUnit.status === 'available' && onUnitSelect && (
              <button
                onClick={() => onUnitSelect(selectedUnit)}
                className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                Enquire Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center gap-6 flex-wrap text-sm">
        {Object.entries(STATUS_COLORS).map(([key, { label, stroke }]) => {
          const count = allUnits.filter((u) => u.status === key).length;
          if (count === 0) return null;
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span className="font-semibold" style={{ color: stroke }}>{count}</span>
              <span className="text-slate-500">{label}</span>
            </div>
          );
        })}
        <span className="text-slate-400 ml-auto text-xs">Click a unit to view details & enquire</span>
      </div>
    </div>
  );
}
