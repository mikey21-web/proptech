'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Stage, Layer, Line, Rect, Text, Group, Image as KonvaImage } from 'react-konva';
import type Konva from 'konva';
import {
  Building2,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  AlertCircle,
  RefreshCw,
  Send,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CanvasUnit {
  id: string;
  unitType: 'plot' | 'flat';
  label: string;
  status: string;
  coordinates: number[][] | null;
  x: number;
  y: number;
  width: number;
  height: number;
  facing: string | null;
  price: number;
  area: number;
  extra: string;
}

interface ProjectSummary {
  id: string;
  name: string;
  type: string;
  city: string | null;
  available: number;
  booked: number;
  sold: number;
  blocked: number;
}

interface Plot {
  id: string;
  plotNumber: string;
  area: number;
  dimensions: string | null;
  facing: string | null;
  price: number;
  pricePerSqft: number | null;
  status: string;
  coordinates: number[][] | null;
}

interface Flat {
  id: string;
  flatNumber: string;
  floor: number;
  bedrooms: number;
  area: number;
  facing: string | null;
  price: number;
  pricePerSqft: number | null;
  status: string;
  coordinates: number[][] | null;
}

interface ProjectDetail {
  id: string;
  name: string;
  type: string;
  city: string | null;
  sitePlanUrl: string | null;
  sitePlanWidth: number | null;
  sitePlanHeight: number | null;
  plots: Plot[];
  flats: Flat[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  available: { fill: '#22c55e', stroke: '#16a34a', text: '#fff' },
  reserved:  { fill: '#f59e0b', stroke: '#d97706', text: '#fff' },
  booked:    { fill: '#ef4444', stroke: '#dc2626', text: '#fff' },
  sold:      { fill: '#3b82f6', stroke: '#2563eb', text: '#fff' },
  blocked:   { fill: '#6b7280', stroke: '#4b5563', text: '#fff' },
  mortgaged: { fill: '#8b5cf6', stroke: '#7c3aed', text: '#fff' },
};

const UNIT_GAP = 8;
const CANVAS_PADDING = 40;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function getPolygonCentroid(coords: number[][]) {
  let cx = 0, cy = 0;
  for (const [x, y] of coords) { cx += x; cy += y; }
  return { x: cx / coords.length, y: cy / coords.length };
}

function parseDimensions(dim: string | null) {
  if (!dim) return null;
  const m = dim.match(/(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/);
  return m ? { w: parseFloat(m[1]), h: parseFloat(m[2]) } : null;
}

function buildPlotUnits(plots: Plot[], scale: number): CanvasUnit[] {
  const sorted = [...plots].sort((a, b) =>
    a.plotNumber.localeCompare(b.plotNumber, undefined, { numeric: true }),
  );
  const cols = Math.ceil(Math.sqrt(sorted.length * 1.5));
  let col = 0, currentX = CANVAS_PADDING, currentY = CANVAS_PADDING + 40, rowH = 0;
  const maxW = cols * (120 * scale + UNIT_GAP) + CANVAS_PADDING;
  return sorted.map((p) => {
    const dims = parseDimensions(p.dimensions);
    const w = dims ? Math.max(dims.w * scale, 60) : 100 * scale;
    const h = dims ? Math.max(dims.h * scale, 40) : 70 * scale;
    if (currentX + w > maxW && col > 0) { currentX = CANVAS_PADDING; currentY += rowH + UNIT_GAP; rowH = 0; col = 0; }
    const unit: CanvasUnit = {
      id: p.id, unitType: 'plot', label: p.plotNumber, status: p.status,
      coordinates: p.coordinates as number[][] | null,
      x: currentX, y: currentY, width: w, height: h,
      facing: p.facing, price: Number(p.price), area: Number(p.area),
      extra: p.dimensions || `${p.area} sqft`,
    };
    currentX += w + UNIT_GAP; rowH = Math.max(rowH, h); col++;
    return unit;
  });
}

function buildFlatUnits(flats: Flat[], scale: number): CanvasUnit[] {
  const sorted = [...flats].sort((a, b) => a.floor !== b.floor ? a.floor - b.floor : a.flatNumber.localeCompare(b.flatNumber, undefined, { numeric: true }));
  const floors = [...new Set(sorted.map((f) => f.floor))].sort((a, b) => b - a);
  const units: CanvasUnit[] = [];
  const unitW = 120 * scale, unitH = 70 * scale;
  floors.forEach((floor, fi) => {
    const ff = sorted.filter((f) => f.floor === floor);
    const y = CANVAS_PADDING + 50 + fi * (unitH + UNIT_GAP + 30);
    ff.forEach((flat, idx) => {
      units.push({
        id: flat.id, unitType: 'flat', label: flat.flatNumber, status: flat.status,
        coordinates: flat.coordinates as number[][] | null,
        x: CANVAS_PADDING + 60 + idx * (unitW + UNIT_GAP), y,
        width: unitW, height: unitH,
        facing: flat.facing, price: Number(flat.price), area: Number(flat.area),
        extra: `${flat.bedrooms} BHK · ${flat.area} sqft`,
      });
    });
  });
  return units;
}

// ---------------------------------------------------------------------------
// useImage hook
// ---------------------------------------------------------------------------

function useImage(url: string | null | undefined) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) { setImage(null); return; }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
    img.src = url;
  }, [url]);
  return image;
}

// ---------------------------------------------------------------------------
// Enquiry modal
// ---------------------------------------------------------------------------

function EnquiryModal({
  unit,
  projectName,
  onClose,
  onSubmit,
  submitting,
}: {
  unit: CanvasUnit;
  projectName: string;
  onClose: () => void;
  onSubmit: (msg: string) => void;
  submitting: boolean;
}) {
  const [message, setMessage] = useState(
    `Hi, I am interested in ${unit.unitType === 'plot' ? 'Plot' : 'Flat'} ${unit.label} at ${projectName}. Area: ${unit.area} sqft, Price: ${formatCurrency(unit.price)}. Please contact me.`,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-foreground">Send Enquiry</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {unit.unitType === 'plot' ? 'Plot' : 'Flat'} {unit.label} · {formatCurrency(unit.price)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">Area</p>
              <p className="font-medium text-foreground">{unit.area} sqft</p>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">Price</p>
              <p className="font-medium text-foreground">{formatCurrency(unit.price)}</p>
            </div>
            {unit.facing && (
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">Facing</p>
                <p className="font-medium text-foreground capitalize">{unit.facing}</p>
              </div>
            )}
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">Details</p>
              <p className="font-medium text-foreground">{unit.extra}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Your message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmit(message)}
              disabled={submitting || !message.trim()}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {submitting ? 'Sending...' : 'Send Enquiry'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unit detail popup
// ---------------------------------------------------------------------------

function UnitPopup({
  unit,
  onClose,
  onEnquire,
}: {
  unit: CanvasUnit;
  onClose: () => void;
  onEnquire: () => void;
}) {
  const colors = STATUS_COLORS[unit.status] || STATUS_COLORS.available;
  const isAvailable = unit.status === 'available';

  return (
    <div className="absolute top-4 right-4 w-72 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h3 className="font-semibold text-foreground text-sm">
            {unit.unitType === 'plot' ? 'Plot' : 'Flat'} {unit.label}
          </h3>
          <span
            className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium capitalize"
            style={{ backgroundColor: colors.fill + '22', color: colors.fill }}
          >
            {unit.status}
          </span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="p-4 space-y-2.5">
        {[
          { label: 'Price', value: formatCurrency(unit.price) },
          { label: 'Area', value: `${unit.area} sqft` },
          { label: 'Details', value: unit.extra },
          ...(unit.facing ? [{ label: 'Facing', value: unit.facing }] : []),
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{row.label}</span>
            <span className="text-sm font-medium text-foreground capitalize">{row.value}</span>
          </div>
        ))}

        {isAvailable ? (
          <button
            onClick={onEnquire}
            className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            Enquire Now
          </button>
        ) : (
          <p className="mt-2 text-center text-xs text-muted-foreground py-1">
            This {unit.unitType} is {unit.status}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CustomerCanvas() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<CanvasUnit | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [enquiryUnit, setEnquiryUnit] = useState<CanvasUnit | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastPinchDistRef = useRef<number | null>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 550 });

  const sitePlanImage = useImage(projectDetail?.sitePlanUrl);
  const hasSitePlan = !!(projectDetail?.sitePlanUrl && sitePlanImage);

  const hasPolygons = useMemo(() => {
    if (!projectDetail) return false;
    return (
      projectDetail.plots.some((p) => p.coordinates && (p.coordinates as number[][]).length >= 3) ||
      projectDetail.flats.some((f) => f.coordinates && (f.coordinates as number[][]).length >= 3)
    );
  }, [projectDetail]);

  const useSitePlanMode = hasSitePlan && hasPolygons;

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [dropdownOpen]);

  // Load projects
  useEffect(() => {
    fetch('/api/admin/projects')
      .then(async (r) => {
        if (!r.ok) throw new Error('Failed to load projects');
        const j = await r.json();
        const list = j.data || [];
        setProjects(list);
        if (list.length > 0) setSelectedProjectId(list[0].id);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingList(false));
  }, []);

  // Load project detail
  const fetchDetail = useCallback((silent = false) => {
    if (!selectedProjectId) return;
    if (!silent) { setLoadingDetail(true); setSelectedUnit(null); }
    fetch(`/api/admin/projects?projectId=${selectedProjectId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('Failed to load project');
        const j = await r.json();
        setProjectDetail(j.data);
        setError(null);
      })
      .catch((e) => { if (!silent) setError(e.message); })
      .finally(() => { if (!silent) setLoadingDetail(false); });
  }, [selectedProjectId]);

  useEffect(() => { fetchDetail(false); }, [fetchDetail]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setStageSize({ width: entry.contentRect.width, height: Math.max(entry.contentRect.height, 500) });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const scale = useMemo(() => Math.max(Math.min(stageSize.width / 1200, 1.5), 0.5), [stageSize.width]);

  const allUnits = useMemo(() => {
    if (!projectDetail) return [];
    const plotUnits = projectDetail.plots?.length ? buildPlotUnits(projectDetail.plots, scale) : [];
    const flatUnits = projectDetail.flats?.length ? buildFlatUnits(projectDetail.flats, scale) : [];
    if (!useSitePlanMode && plotUnits.length > 0 && flatUnits.length > 0) {
      const maxPlotY = Math.max(...plotUnits.map((u) => u.y + u.height));
      const minFlatY = Math.min(...flatUnits.map((u) => u.y));
      flatUnits.forEach((u) => (u.y += maxPlotY - minFlatY + 60));
    }
    return [...plotUnits, ...flatUnits];
  }, [projectDetail, scale, useSitePlanMode]);

  const filteredUnits = useMemo(() => {
    if (statusFilter === 'all') return allUnits;
    return allUnits.filter((u) => u.status === statusFilter);
  }, [allUnits, statusFilter]);

  const canvasHeight = useMemo(() => {
    if (useSitePlanMode && projectDetail?.sitePlanHeight) return projectDetail.sitePlanHeight;
    if (filteredUnits.length === 0) return 500;
    return Math.max(...filteredUnits.map((u) => u.y + u.height)) + CANVAS_PADDING + 40;
  }, [filteredUnits, useSitePlanMode, projectDetail]);

  const polygonUnits = useMemo(() => filteredUnits.filter((u) => u.coordinates && u.coordinates.length >= 3), [filteredUnits]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    setZoomLevel((z) => Math.max(0.3, Math.min(3, z + (e.evt.deltaY > 0 ? -0.05 : 0.05))));
  }, []);

  const handleTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    if (touches.length !== 2) return;
    e.evt.preventDefault();
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (lastPinchDistRef.current !== null) {
      setZoomLevel((z) => Math.max(0.3, Math.min(3, z * (dist / lastPinchDistRef.current!))));
    }
    lastPinchDistRef.current = dist;
  }, []);

  const handleTouchEnd = useCallback(() => { lastPinchDistRef.current = null; }, []);

  // Submit enquiry via customer messages API
  const handleEnquirySubmit = useCallback(async (message: string) => {
    if (!enquiryUnit || !projectDetail) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/customer/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `Enquiry: ${enquiryUnit.unitType === 'plot' ? 'Plot' : 'Flat'} ${enquiryUnit.label} at ${projectDetail.name}`,
          body: message,
          type: 'enquiry',
          metadata: {
            unitId: enquiryUnit.id,
            unitType: enquiryUnit.unitType,
            unitLabel: enquiryUnit.label,
            projectId: projectDetail.id,
            projectName: projectDetail.name,
            price: enquiryUnit.price,
            area: enquiryUnit.area,
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to send enquiry');
      setEnquiryUnit(null);
      setSelectedUnit(null);
      setSuccessMsg(`Enquiry sent for ${enquiryUnit.unitType === 'plot' ? 'Plot' : 'Flat'} ${enquiryUnit.label}! Our team will contact you shortly.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (e: any) {
      setError(e.message || 'Failed to send enquiry');
    } finally {
      setSubmitting(false);
    }
  }, [enquiryUnit, projectDetail]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const stats = useMemo(() => ({
    available: allUnits.filter((u) => u.status === 'available').length,
    booked: allUnits.filter((u) => u.status === 'booked').length,
    sold: allUnits.filter((u) => u.status === 'sold').length,
    total: allUnits.length,
  }), [allUnits]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Browse Plots</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View available plots and flats. Click any unit to see details and enquire.
        </p>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-3">
          <Send className="h-4 w-4 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-400">{successMsg}</p>
          <button onClick={() => setSuccessMsg(null)} className="ml-auto">
            <X className="h-4 w-4 text-green-600" />
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-3 w-3 text-red-600" />
          </button>
        </div>
      )}

      {/* Stats bar */}
      {stats.total > 0 && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-green-500" /><span className="text-xs text-muted-foreground">{stats.available} Available</span></div>
          <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-red-500" /><span className="text-xs text-muted-foreground">{stats.booked} Booked</span></div>
          <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-blue-500" /><span className="text-xs text-muted-foreground">{stats.sold} Sold</span></div>
          <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-amber-500" /><span className="text-xs text-muted-foreground">Orange = On Hold</span></div>
          <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-gray-500" /><span className="text-xs text-muted-foreground">Grey = Blocked</span></div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Project selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors min-w-[220px]"
          >
            <Building2 className="h-4 w-4 text-muted-foreground" />
            {loadingList ? 'Loading...' : selectedProject?.name || 'Select Project'}
            <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
          </button>
          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border rounded-lg shadow-lg z-30 max-h-60 overflow-y-auto">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedProjectId(p.id); setDropdownOpen(false); }}
                  className={cn('w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors', p.id === selectedProjectId ? 'bg-accent font-medium' : '')}
                >
                  <span className="text-foreground">{p.name}</span>
                  {p.city && <span className="text-xs text-muted-foreground ml-2 flex items-center gap-0.5 inline-flex"><MapPin className="h-3 w-3" />{p.city}</span>}
                  <span className="text-xs text-green-600 ml-2">{p.available} available</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none"
        >
          <option value="all">All Units</option>
          <option value="available">Available Only</option>
          <option value="booked">Booked</option>
          <option value="reserved">On Hold</option>
        </select>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => fetchDetail(false)} className="p-2 rounded-lg border border-border hover:bg-accent transition-colors" title="Refresh">
            <RefreshCw className={cn('h-4 w-4 text-muted-foreground', loadingDetail && 'animate-spin')} />
          </button>
          <button onClick={() => setZoomLevel((z) => Math.max(0.3, z - 0.2))} className="p-2 rounded-lg border border-border hover:bg-accent">
            <ZoomOut className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
          <button onClick={() => setZoomLevel((z) => Math.min(3, z + 0.2))} className="p-2 rounded-lg border border-border hover:bg-accent">
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
          </button>
          <button onClick={() => setZoomLevel(1)} className="p-2 rounded-lg border border-border hover:bg-accent">
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative bg-card rounded-xl border border-border overflow-hidden" ref={containerRef}>
        {loadingDetail ? (
          <div className="flex items-center justify-center h-[500px]">
            <div className="text-sm text-muted-foreground animate-pulse">Loading layout...</div>
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
            <Building2 className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">
              {!selectedProjectId ? 'Select a project to view' : 'No units found'}
            </p>
          </div>
        ) : (
          <>
            <Stage
              ref={stageRef as any}
              width={stageSize.width}
              height={Math.min(canvasHeight * zoomLevel, 750)}
              scaleX={zoomLevel}
              scaleY={zoomLevel}
              draggable
              onWheel={handleWheel}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ cursor: 'grab', touchAction: 'none' }}
            >
              <Layer>
                {/* Site plan image */}
                {sitePlanImage && (
                  <KonvaImage
                    image={sitePlanImage}
                    x={0} y={0}
                    width={projectDetail?.sitePlanWidth || sitePlanImage.naturalWidth}
                    height={projectDetail?.sitePlanHeight || sitePlanImage.naturalHeight}
                  />
                )}

                {/* Grid background */}
                {!useSitePlanMode && Array.from({ length: Math.ceil(canvasHeight / 50) }, (_, i) => (
                  <Line key={`h-${i}`} points={[0, i * 50, stageSize.width / zoomLevel, i * 50]} stroke="#e5e7eb" strokeWidth={0.5} opacity={0.3} />
                ))}

                {/* Units */}
                {useSitePlanMode ? (
                  /* Polygon mode */
                  polygonUnits.map((unit) => {
                    const colors = STATUS_COLORS[unit.status] || STATUS_COLORS.available;
                    const isHovered = hoveredId === unit.id;
                    const isSelected = selectedUnit?.id === unit.id;
                    const centroid = getPolygonCentroid(unit.coordinates!);
                    const flat = unit.coordinates!.flat();
                    return (
                      <Group key={unit.id}>
                        {isSelected && <Line points={flat} closed stroke="#facc15" strokeWidth={4} fill="transparent" />}
                        <Line
                          points={flat} closed
                          fill={colors.fill} opacity={isHovered ? 0.75 : 0.55}
                          stroke={isHovered ? '#fff' : colors.stroke} strokeWidth={isHovered ? 2.5 : 1.5}
                          onMouseEnter={(e: any) => { setHoveredId(unit.id); const c = e.target.getStage()?.container(); if (c) c.style.cursor = 'pointer'; }}
                          onMouseLeave={(e: any) => { setHoveredId(null); const c = e.target.getStage()?.container(); if (c) c.style.cursor = 'grab'; }}
                          onClick={() => setSelectedUnit(unit)}
                          onTap={() => setSelectedUnit(unit)}
                        />
                        <Text x={centroid.x - 25} y={centroid.y - 10} width={50} text={unit.label} fontSize={11} fontStyle="bold" fill="#fff" align="center" listening={false} />
                        <Text x={centroid.x - 30} y={centroid.y + 4} width={60} text={formatCurrency(unit.price)} fontSize={9} fill="#fff" opacity={0.9} align="center" listening={false} />
                      </Group>
                    );
                  })
                ) : (
                  /* Grid mode */
                  filteredUnits.map((unit) => {
                    const colors = STATUS_COLORS[unit.status] || STATUS_COLORS.available;
                    const isHovered = hoveredId === unit.id;
                    const isSelected = selectedUnit?.id === unit.id;
                    return (
                      <Group
                        key={unit.id} x={unit.x} y={unit.y}
                        onClick={() => setSelectedUnit(unit)} onTap={() => setSelectedUnit(unit)}
                        onMouseEnter={(e: any) => { setHoveredId(unit.id); const c = e.target.getStage()?.container(); if (c) c.style.cursor = 'pointer'; }}
                        onMouseLeave={(e: any) => { setHoveredId(null); const c = e.target.getStage()?.container(); if (c) c.style.cursor = 'grab'; }}
                      >
                        {isSelected && <Rect x={-3} y={-3} width={unit.width + 6} height={unit.height + 6} fill="transparent" stroke="#facc15" strokeWidth={3} cornerRadius={6} />}
                        <Rect width={unit.width} height={unit.height} fill={colors.fill} stroke={isHovered ? '#fff' : colors.stroke} strokeWidth={isHovered ? 2 : 1} cornerRadius={4} opacity={isHovered ? 1 : 0.85} shadowColor="black" shadowBlur={isHovered ? 8 : 2} shadowOpacity={isHovered ? 0.3 : 0.1} shadowOffsetY={isHovered ? 3 : 1} />
                        <Text x={4} y={6} width={unit.width - 8} text={unit.label} fontSize={Math.min(13, unit.width / 6)} fontStyle="bold" fill={colors.text} align="center" />
                        <Text x={4} y={unit.height / 2} width={unit.width - 8} text={unit.extra} fontSize={Math.min(9, unit.width / 10)} fill={colors.text} opacity={0.85} align="center" />
                        <Text x={4} y={unit.height - 18} width={unit.width - 8} text={formatCurrency(unit.price)} fontSize={Math.min(10, unit.width / 8)} fill={colors.text} opacity={0.9} align="center" />
                      </Group>
                    );
                  })
                )}
              </Layer>
            </Stage>

            {/* Unit popup */}
            {selectedUnit && (
              <UnitPopup
                unit={selectedUnit}
                onClose={() => setSelectedUnit(null)}
                onEnquire={() => setEnquiryUnit(selectedUnit)}
              />
            )}

            {/* Stats overlay */}
            <div className="absolute bottom-3 left-3 flex items-center gap-4 bg-card/90 backdrop-blur border border-border rounded-lg px-3 py-2">
              <span className="text-xs text-muted-foreground">{filteredUnits.length} units</span>
              <span className="text-xs text-green-600 font-medium">{stats.available} available</span>
            </div>
          </>
        )}
      </div>

      {/* Enquiry modal */}
      {enquiryUnit && projectDetail && (
        <EnquiryModal
          unit={enquiryUnit}
          projectName={projectDetail.name}
          onClose={() => setEnquiryUnit(null)}
          onSubmit={handleEnquirySubmit}
          submitting={submitting}
        />
      )}
    </div>
  );
}
