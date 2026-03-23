'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Text, Group, Line, Image as KonvaImage } from 'react-konva';
import type Konva from 'konva';
import {
  Building2,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  X,
  Layers,
  Grid3X3,
  AlertCircle,
  Download,
  RefreshCw,
  Pencil,
  Eye,
  Upload,
  Save,
  Undo2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Plot {
  id: string;
  plotNumber: string;
  area: number;
  dimensions: string | null;
  facing: string | null;
  price: number;
  pricePerSqft: number | null;
  status: string;
  remarks: string | null;
  coordinates: number[][] | null;
}

interface Flat {
  id: string;
  flatNumber: string;
  floor: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  superArea: number | null;
  facing: string | null;
  price: number;
  pricePerSqft: number | null;
  status: string;
  remarks: string | null;
  coordinates: number[][] | null;
}

interface BookingInfo {
  id: string;
  bookingNumber: string;
  status: string;
  createdAt: string;
  customer?: { name: string; email: string; phone: string } | null;
}

interface ProjectSummary {
  id: string;
  name: string;
  type: string;
  status: string;
  city: string | null;
  totalUnits: number | null;
  available: number;
  booked: number;
  sold: number;
  blocked: number;
}

interface ProjectDetail {
  id: string;
  name: string;
  type: string;
  sitePlanUrl: string | null;
  sitePlanWidth: number | null;
  sitePlanHeight: number | null;
  plots: Plot[];
  flats: Flat[];
}

type UnitType = 'plot' | 'flat';
type LayoutMode = 'view' | 'draw';

interface CanvasUnit {
  id: string;
  unitType: UnitType;
  label: string;
  status: string;
  coordinates: number[][] | null;
  // Grid fallback fields
  x: number;
  y: number;
  width: number;
  height: number;
  facing: string | null;
  price: number;
  area: number;
  extra: string;
}

interface ContextMenu {
  x: number;
  y: number;
  unit: CanvasUnit;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  available: { fill: '#22c55e', stroke: '#16a34a', text: '#fff' },
  reserved: { fill: '#f59e0b', stroke: '#d97706', text: '#fff' },
  booked: { fill: '#ef4444', stroke: '#dc2626', text: '#fff' },
  sold: { fill: '#3b82f6', stroke: '#2563eb', text: '#fff' },
  mortgaged: { fill: '#8b5cf6', stroke: '#7c3aed', text: '#fff' },
  blocked: { fill: '#6b7280', stroke: '#4b5563', text: '#fff' },
};

const UNIT_GAP = 8;
const CANVAS_PADDING = 40;
const POLL_INTERVAL = 30_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseDimensions(dim: string | null): { w: number; h: number } | null {
  if (!dim) return null;
  const match = dim.match(/(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return { w: parseFloat(match[1]), h: parseFloat(match[2]) };
}

function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

/** Get polygon centroid for placing text labels */
function getPolygonCentroid(coords: number[][]): { x: number; y: number } {
  let cx = 0, cy = 0;
  for (const [x, y] of coords) {
    cx += x;
    cy += y;
  }
  return { x: cx / coords.length, y: cy / coords.length };
}

/** Flatten polygon coords for Konva Line: [[x1,y1],[x2,y2]] → [x1,y1,x2,y2] */
function flattenCoords(coords: number[][]): number[] {
  return coords.flat();
}

/** Check if point is inside polygon (ray casting) */
function isPointInPolygon(px: number, py: number, coords: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const [xi, yi] = coords[i];
    const [xj, yj] = coords[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function buildPlotUnits(plots: Plot[], scale: number): CanvasUnit[] {
  const sorted = [...plots].sort((a, b) =>
    a.plotNumber.localeCompare(b.plotNumber, undefined, { numeric: true }),
  );
  const cols = Math.ceil(Math.sqrt(sorted.length * 1.5));
  let col = 0;
  let currentX = CANVAS_PADDING;
  let currentY = CANVAS_PADDING + 40;
  let rowHeight = 0;
  const maxWidth = cols * (120 * scale + UNIT_GAP) + CANVAS_PADDING;

  return sorted.map((plot) => {
    const dims = parseDimensions(plot.dimensions);
    const w = dims ? Math.max(dims.w * scale, 60) : 100 * scale;
    const h = dims ? Math.max(dims.h * scale, 40) : 70 * scale;

    if (currentX + w > maxWidth && col > 0) {
      currentX = CANVAS_PADDING;
      currentY += rowHeight + UNIT_GAP;
      rowHeight = 0;
      col = 0;
    }

    const unit: CanvasUnit = {
      id: plot.id,
      unitType: 'plot',
      label: plot.plotNumber,
      status: plot.status,
      coordinates: plot.coordinates as number[][] | null,
      x: currentX,
      y: currentY,
      width: w,
      height: h,
      facing: plot.facing,
      price: Number(plot.price),
      area: Number(plot.area),
      extra: plot.dimensions || `${plot.area} sqft`,
    };

    currentX += w + UNIT_GAP;
    rowHeight = Math.max(rowHeight, h);
    col++;
    return unit;
  });
}

function buildFlatUnits(flats: Flat[], scale: number): CanvasUnit[] {
  const sorted = [...flats].sort((a, b) => {
    if (a.floor !== b.floor) return a.floor - b.floor;
    return a.flatNumber.localeCompare(b.flatNumber, undefined, { numeric: true });
  });
  const floors = [...new Set(sorted.map((f) => f.floor))].sort((a, b) => b - a);
  const units: CanvasUnit[] = [];
  const unitW = 120 * scale;
  const unitH = 70 * scale;

  floors.forEach((floor, fi) => {
    const floorFlats = sorted.filter((f) => f.floor === floor);
    const y = CANVAS_PADDING + 50 + fi * (unitH + UNIT_GAP + 30);
    floorFlats.forEach((flat, idx) => {
      units.push({
        id: flat.id,
        unitType: 'flat',
        label: flat.flatNumber,
        status: flat.status,
        coordinates: flat.coordinates as number[][] | null,
        x: CANVAS_PADDING + 60 + idx * (unitW + UNIT_GAP),
        y,
        width: unitW,
        height: unitH,
        facing: flat.facing,
        price: Number(flat.price),
        area: Number(flat.area),
        extra: `${flat.bedrooms} BHK · ${flat.area} sqft`,
      });
    });
  });
  return units;
}

function getContextMenuItems(currentStatus: string) {
  const items: { label: string; status: string }[] = [];
  if (currentStatus !== 'available') items.push({ label: 'Mark Available', status: 'available' });
  if (currentStatus !== 'reserved') items.push({ label: 'Mark Reserved', status: 'reserved' });
  if (currentStatus !== 'booked') items.push({ label: 'Mark Booked', status: 'booked' });
  if (currentStatus !== 'sold') items.push({ label: 'Mark Sold', status: 'sold' });
  if (currentStatus !== 'blocked') items.push({ label: 'Block Unit', status: 'blocked' });
  return items;
}

// ---------------------------------------------------------------------------
// Custom hook: load image
// ---------------------------------------------------------------------------

function useImage(url: string | null | undefined): HTMLImageElement | null {
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
// Unit detail panel
// ---------------------------------------------------------------------------

function UnitDetailPanel({
  unit,
  bookingInfo,
  onClose,
  onBook,
}: {
  unit: CanvasUnit;
  bookingInfo?: BookingInfo | null;
  onClose: () => void;
  onBook?: () => void;
}) {
  const colors = STATUS_COLORS[unit.status] || STATUS_COLORS.available;
  return (
    <div className="absolute top-4 right-4 w-80 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-foreground">
          {unit.unitType === 'plot' ? 'Plot' : 'Flat'} {unit.label}
        </h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <div className="p-4 space-y-3">
        {[
          {
            label: 'Status',
            value: (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                style={{ backgroundColor: colors.fill + '22', color: colors.fill }}>
                {unit.status}
              </span>
            ),
          },
          { label: 'Price', value: <span className="text-sm font-semibold text-foreground">{formatCurrency(unit.price)}</span> },
          { label: 'Area', value: <span className="text-sm text-foreground">{unit.area} sqft</span> },
          { label: 'Details', value: <span className="text-sm text-foreground">{unit.extra}</span> },
          ...(unit.facing ? [{ label: 'Facing', value: <span className="text-sm text-foreground capitalize">{unit.facing}</span> }] : []),
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{row.label}</span>
            {row.value}
          </div>
        ))}

        {/* Action buttons for available plots */}
        {unit.status === 'available' && (
          <div className="pt-2 flex gap-2">
            <button
              onClick={onBook}
              className="flex-1 bg-primary text-primary-foreground text-sm font-medium rounded-lg py-2 hover:bg-primary/90 transition-colors"
            >
              Book Now
            </button>
          </div>
        )}

        {/* Booking info for booked/sold/reserved */}
        {bookingInfo && (
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booking Info</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Booking #</span>
              <span className="text-sm font-medium text-foreground">{bookingInfo.bookingNumber}</span>
            </div>
            {bookingInfo.customer && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Customer</span>
                  <span className="text-sm text-foreground">{bookingInfo.customer.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Phone</span>
                  <span className="text-sm text-foreground">{bookingInfo.customer.phone}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Date</span>
              <span className="text-sm text-foreground">
                {new Date(bookingInfo.createdAt).toLocaleDateString('en-IN')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

function Legend() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {Object.entries(STATUS_COLORS).map(([status, c]) => (
        <span key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-3 w-3 rounded" style={{ backgroundColor: c.fill }} />
          <span className="capitalize">{status}</span>
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Polygon overlay layer — renders polygons on top of site plan image
// ---------------------------------------------------------------------------

function PolygonLayer({
  units,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
  onContextMenu,
}: {
  units: CanvasUnit[];
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (unit: CanvasUnit) => void;
  onContextMenu: (e: Konva.KonvaEventObject<MouseEvent>, unit: CanvasUnit) => void;
}) {
  return (
    <>
      {units.map((unit) => {
        if (!unit.coordinates || unit.coordinates.length < 3) return null;
        const colors = STATUS_COLORS[unit.status] || STATUS_COLORS.available;
        const isHovered = hoveredId === unit.id;
        const isSelected = selectedId === unit.id;
        const centroid = getPolygonCentroid(unit.coordinates);
        const flatCoords = flattenCoords(unit.coordinates);

        return (
          <Group key={unit.id}>
            {/* Selection glow */}
            {isSelected && (
              <Line
                points={flatCoords}
                closed
                stroke="#facc15"
                strokeWidth={4}
                fill="transparent"
              />
            )}

            {/* Polygon fill */}
            <Line
              points={flatCoords}
              closed
              fill={colors.fill}
              opacity={isHovered ? 0.7 : 0.5}
              stroke={isHovered ? '#fff' : colors.stroke}
              strokeWidth={isHovered ? 2.5 : 1.5}
              onMouseEnter={(e: any) => {
                onHover(unit.id);
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'pointer';
              }}
              onMouseLeave={(e: any) => {
                onHover(null);
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'grab';
              }}
              onClick={() => onSelect(unit)}
              onTap={() => onSelect(unit)}
              onContextMenu={(e) => onContextMenu(e, unit)}
            />

            {/* Label at centroid */}
            <Text
              x={centroid.x - 25}
              y={centroid.y - 12}
              width={50}
              text={unit.label}
              fontSize={11}
              fontStyle="bold"
              fill="#fff"
              align="center"
              listening={false}
            />
            <Text
              x={centroid.x - 30}
              y={centroid.y + 2}
              width={60}
              text={formatCurrency(unit.price)}
              fontSize={9}
              fill="#fff"
              opacity={0.9}
              align="center"
              listening={false}
            />
          </Group>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Grid fallback layer — renders rectangles in auto-layout when no site plan
// ---------------------------------------------------------------------------

function GridLayer({
  units,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
  onContextMenu,
}: {
  units: CanvasUnit[];
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (unit: CanvasUnit) => void;
  onContextMenu: (e: Konva.KonvaEventObject<MouseEvent>, unit: CanvasUnit) => void;
}) {
  return (
    <>
      {units.map((unit) => {
        const colors = STATUS_COLORS[unit.status] || STATUS_COLORS.available;
        const isHovered = hoveredId === unit.id;
        const isSelected = selectedId === unit.id;

        return (
          <Group
            key={unit.id}
            x={unit.x}
            y={unit.y}
            onClick={() => onSelect(unit)}
            onTap={() => onSelect(unit)}
            onContextMenu={(e) => onContextMenu(e, unit)}
            onMouseEnter={(e: any) => {
              onHover(unit.id);
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'pointer';
            }}
            onMouseLeave={(e: any) => {
              onHover(null);
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'grab';
            }}
          >
            {isSelected && (
              <Rect x={-3} y={-3} width={unit.width + 6} height={unit.height + 6}
                fill="transparent" stroke="#facc15" strokeWidth={3} cornerRadius={6} />
            )}
            <Rect width={unit.width} height={unit.height} fill={colors.fill}
              stroke={isHovered ? '#fff' : colors.stroke}
              strokeWidth={isHovered ? 2 : 1} cornerRadius={4}
              opacity={isHovered ? 1 : 0.85}
              shadowColor="black" shadowBlur={isHovered ? 8 : 2}
              shadowOpacity={isHovered ? 0.3 : 0.1} shadowOffsetY={isHovered ? 3 : 1} />
            <Text x={4} y={6} width={unit.width - 8} text={unit.label}
              fontSize={Math.min(13, unit.width / 6)} fontStyle="bold"
              fill={colors.text} align="center" />
            <Text x={4} y={unit.height / 2} width={unit.width - 8} text={unit.extra}
              fontSize={Math.min(9, unit.width / 10)} fill={colors.text}
              opacity={0.85} align="center" />
            <Text x={4} y={unit.height - 18} width={unit.width - 8}
              text={formatCurrency(unit.price)}
              fontSize={Math.min(10, unit.width / 8)} fill={colors.text}
              opacity={0.9} align="center" />
            {unit.facing && (
              <Text x={unit.width - 18} y={4}
                text={unit.facing.charAt(0).toUpperCase()}
                fontSize={9} fill={colors.text} opacity={0.7} />
            )}
          </Group>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function LayoutCanvas() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<CanvasUnit | null>(null);
  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewMode, setViewMode] = useState<'all' | 'plots' | 'flats'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('view');
  const [drawingPoints, setDrawingPoints] = useState<number[][]>([]);
  const [drawingForUnit, setDrawingForUnit] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [stageSize, setStageSize] = useState({ width: 900, height: 600 });
  const lastPinchDistRef = useRef<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load site plan image
  const sitePlanImage = useImage(projectDetail?.sitePlanUrl);
  const hasSitePlan = !!(projectDetail?.sitePlanUrl && sitePlanImage);

  // Check if polygons exist — site plan mode
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
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  // Close context menu
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [contextMenu]);

  // Load project list
  useEffect(() => {
    fetch('/api/admin/projects')
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load projects (${res.status})`);
        const json = await res.json();
        const list = json.data || [];
        setProjects(list);
        if (list.length > 0) setSelectedProjectId(list[0].id);
      })
      .catch((err) => setError(err.message || 'Failed to load projects'))
      .finally(() => setLoadingList(false));
  }, []);

  // Fetch project detail
  const fetchProjectDetail = useCallback(
    (silent = false) => {
      if (!selectedProjectId) return;
      if (!silent) {
        setLoadingDetail(true);
        setSelectedUnit(null);
        setBookingInfo(null);
      }
      fetch(`/api/admin/projects?projectId=${selectedProjectId}`)
        .then(async (res) => {
          if (!res.ok) throw new Error(`Failed to load project (${res.status})`);
          const json = await res.json();
          setProjectDetail(json.data);
          setError(null);
        })
        .catch((err) => {
          if (!silent) setError(err.message || 'Failed to load project');
        })
        .finally(() => {
          if (!silent) setLoadingDetail(false);
        });
    },
    [selectedProjectId],
  );

  useEffect(() => { fetchProjectDetail(false); }, [fetchProjectDetail]);

  // Auto-poll
  useEffect(() => {
    if (!selectedProjectId) return;
    const interval = setInterval(() => fetchProjectDetail(true), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [selectedProjectId, fetchProjectDetail]);

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

  // Build canvas units
  const scale = useMemo(() => Math.max(Math.min(stageSize.width / 1200, 1.5), 0.5), [stageSize.width]);

  const allUnits = useMemo(() => {
    if (!projectDetail) return [];
    const plotUnits = projectDetail.plots?.length ? buildPlotUnits(projectDetail.plots, scale) : [];
    const flatUnits = projectDetail.flats?.length ? buildFlatUnits(projectDetail.flats, scale) : [];

    if (!useSitePlanMode && plotUnits.length > 0 && flatUnits.length > 0) {
      const maxPlotY = Math.max(...plotUnits.map((u) => u.y + u.height));
      const minFlatY = Math.min(...flatUnits.map((u) => u.y));
      const offset = maxPlotY - minFlatY + 60;
      flatUnits.forEach((u) => (u.y += offset));
    }

    return [...plotUnits, ...flatUnits];
  }, [projectDetail, scale, useSitePlanMode]);

  const filteredUnits = useMemo(() => {
    let units = allUnits;
    if (viewMode === 'plots') units = units.filter((u) => u.unitType === 'plot');
    if (viewMode === 'flats') units = units.filter((u) => u.unitType === 'flat');
    if (statusFilter !== 'all') units = units.filter((u) => u.status === statusFilter);
    return units;
  }, [allUnits, viewMode, statusFilter]);

  const canvasHeight = useMemo(() => {
    if (useSitePlanMode && projectDetail?.sitePlanHeight) {
      return projectDetail.sitePlanHeight;
    }
    if (filteredUnits.length === 0) return 500;
    const maxY = Math.max(...filteredUnits.map((u) => u.y + u.height));
    return maxY + CANVAS_PADDING + 40;
  }, [filteredUnits, useSitePlanMode, projectDetail]);

  const canvasWidth = useMemo(() => {
    if (useSitePlanMode && projectDetail?.sitePlanWidth) {
      return projectDetail.sitePlanWidth;
    }
    return stageSize.width / zoomLevel;
  }, [useSitePlanMode, projectDetail, stageSize.width, zoomLevel]);

  // Zoom
  const handleZoom = useCallback((dir: 'in' | 'out' | 'reset') => {
    if (dir === 'reset') setZoomLevel(1);
    else setZoomLevel((z) => Math.max(0.3, Math.min(3, z + (dir === 'in' ? 0.2 : -0.2))));
  }, []);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const delta = e.evt.deltaY > 0 ? -0.05 : 0.05;
    setZoomLevel((z) => Math.max(0.3, Math.min(3, z + delta)));
  }, []);

  const handleTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    if (touches.length !== 2) return;
    e.evt.preventDefault();
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (lastPinchDistRef.current !== null) {
      const ratio = dist / lastPinchDistRef.current;
      setZoomLevel((z) => Math.max(0.3, Math.min(3, z * ratio)));
    }
    lastPinchDistRef.current = dist;
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastPinchDistRef.current = null;
  }, []);

  // Drag bounds
  const handleDragBound = useCallback(
    (pos: { x: number; y: number }) => {
      const stageW = stageSize.width;
      const stageH = Math.min(canvasHeight * zoomLevel, 800);
      const contentW = canvasWidth * zoomLevel;
      const contentH = canvasHeight * zoomLevel;
      const minX = Math.min(0, stageW - contentW);
      const minY = Math.min(0, stageH - contentH);
      return { x: Math.max(minX, Math.min(0, pos.x)), y: Math.max(minY, Math.min(0, pos.y)) };
    },
    [stageSize.width, canvasWidth, canvasHeight, zoomLevel],
  );

  // Context menu
  const handleContextMenu = useCallback((e: Konva.KonvaEventObject<MouseEvent>, unit: CanvasUnit) => {
    e.evt.preventDefault();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    setContextMenu({ x: e.evt.clientX - containerRect.left, y: e.evt.clientY - containerRect.top, unit });
  }, []);

  // Status change
  const handleStatusChange = useCallback(
    async (unit: CanvasUnit, newStatus: string) => {
      setContextMenu(null);
      setStatusUpdating(true);
      try {
        const res = await fetch('/api/admin/projects', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unitId: unit.id, unitType: unit.unitType, newStatus }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || `Failed to update status (${res.status})`);
        }
        fetchProjectDetail(true);
      } catch (err: any) {
        setError(err.message || 'Failed to update unit status');
      } finally {
        setStatusUpdating(false);
      }
    },
    [fetchProjectDetail],
  );

  // Unit select + fetch booking info
  const handleUnitSelect = useCallback(
    (unit: CanvasUnit) => {
      if (layoutMode === 'draw') return; // Don't select in draw mode
      setSelectedUnit(unit);
      setBookingInfo(null);
      if (['booked', 'sold', 'reserved'].includes(unit.status) && selectedProjectId) {
        fetch(`/api/bookings?${unit.unitType}Id=${unit.id}&limit=1`)
          .then(async (res) => {
            if (!res.ok) return;
            const json = await res.json();
            const bookings = json.data?.bookings || json.data || [];
            if (bookings.length > 0) setBookingInfo(bookings[0]);
          })
          .catch(() => {});
      }
    },
    [selectedProjectId, layoutMode],
  );

  // Navigate to booking wizard with unit pre-filled
  const handleBook = useCallback(() => {
    if (!selectedUnit || !selectedProjectId) return;
    const params = new URLSearchParams({
      projectId: selectedProjectId,
      [`${selectedUnit.unitType}Id`]: selectedUnit.id,
    });
    window.location.href = `/admin/bookings/new?${params.toString()}`;
  }, [selectedUnit, selectedProjectId]);

  // Export
  const handleExport = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const uri = stage.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = `${projectDetail?.name || 'layout'}-floor-plan.png`;
    link.href = uri;
    link.click();
  }, [projectDetail]);

  // ─── Drawing mode: click to add polygon points ───
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (layoutMode !== 'draw' || !drawingForUnit) return;
      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      // Convert screen coords to canvas coords
      const x = (pos.x - stage.x()) / zoomLevel;
      const y = (pos.y - stage.y()) / zoomLevel;
      setDrawingPoints((prev) => [...prev, [Math.round(x), Math.round(y)]]);
    },
    [layoutMode, drawingForUnit, zoomLevel],
  );

  // Save drawn polygon
  const savePolygon = useCallback(async () => {
    if (!drawingForUnit || drawingPoints.length < 3) return;
    const unit = allUnits.find((u) => u.id === drawingForUnit);
    if (!unit) return;

    try {
      const res = await fetch('/api/admin/projects/coordinates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId: drawingForUnit,
          unitType: unit.unitType,
          coordinates: drawingPoints,
        }),
      });
      if (!res.ok) throw new Error('Failed to save polygon');
      setDrawingPoints([]);
      setDrawingForUnit(null);
      fetchProjectDetail(true);
    } catch (err: any) {
      setError(err.message);
    }
  }, [drawingForUnit, drawingPoints, allUnits, fetchProjectDetail]);

  // Site plan image upload
  const handleSitePlanUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedProjectId) return;

      // For now, create object URL (in production, upload to R2)
      const url = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = async () => {
        try {
          const res = await fetch('/api/admin/projects', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: selectedProjectId,
              sitePlanUrl: url,
              sitePlanWidth: img.naturalWidth,
              sitePlanHeight: img.naturalHeight,
            }),
          });
          if (!res.ok) throw new Error('Failed to save site plan');
          fetchProjectDetail(false);
        } catch (err: any) {
          setError(err.message);
        }
      };
      img.src = url;
    },
    [selectedProjectId, fetchProjectDetail],
  );

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Floor labels (grid mode only)
  const floorLabels = useMemo(() => {
    if (useSitePlanMode || !projectDetail?.flats?.length) return [];
    const floors = [...new Set(projectDetail.flats.map((f) => f.floor))].sort((a, b) => b - a);
    return floors
      .map((floor) => {
        const fUnits = filteredUnits.filter(
          (u) => u.unitType === 'flat' && projectDetail.flats.some((f) => f.id === u.id && f.floor === floor),
        );
        if (fUnits.length === 0) return null;
        const minY = Math.min(...fUnits.map((u) => u.y));
        const maxY = Math.max(...fUnits.map((u) => u.y + u.height));
        return { floor, y: minY + (maxY - minY) / 2 };
      })
      .filter(Boolean) as { floor: number; y: number }[];
  }, [projectDetail, filteredUnits, useSitePlanMode]);

  const plotUnitsFiltered = filteredUnits.filter((u) => u.unitType === 'plot');
  const flatUnitsFiltered = filteredUnits.filter((u) => u.unitType === 'flat');

  // Units with polygons (for site plan mode) — show all that have coordinates
  const polygonUnits = useMemo(() => {
    return filteredUnits.filter((u) => u.coordinates && u.coordinates.length >= 3);
  }, [filteredUnits]);

  // Units without polygons (show as list in draw mode)
  const undrawnUnits = useMemo(() => {
    return allUnits.filter((u) => !u.coordinates || u.coordinates.length < 3);
  }, [allUnits]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">2D Layout</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {useSitePlanMode
              ? 'Site plan with polygon overlays — right-click units to change status'
              : 'Grid layout — upload a site plan image for polygon mode'}
          </p>
        </div>
        {/* Mode badge */}
        <div className="flex items-center gap-2">
          {useSitePlanMode && (
            <span className="px-2 py-1 rounded-md bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs font-medium">
              Site Plan Mode
            </span>
          )}
          {!useSitePlanMode && (
            <span className="px-2 py-1 rounded-md bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium">
              Grid Mode (no site plan)
            </span>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
            <X className="h-3 w-3 text-red-600" />
          </button>
        </div>
      )}

      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Project selector */}
        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors min-w-[220px]">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            {loadingList ? 'Loading...' : selectedProject?.name || 'Select Project'}
            <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
          </button>
          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border rounded-lg shadow-lg z-30 max-h-60 overflow-y-auto">
              {projects.map((p) => (
                <button key={p.id} onClick={() => { setSelectedProjectId(p.id); setDropdownOpen(false); }}
                  className={cn('w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors', p.id === selectedProjectId ? 'bg-accent font-medium' : '')}>
                  <span className="text-foreground">{p.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{p.available + p.booked + p.sold + p.blocked} units</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View mode */}
        <div className="flex items-center bg-card border border-border rounded-lg overflow-hidden">
          {(['all', 'plots', 'flats'] as const).map((mode) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={cn('px-3 py-2 text-xs font-medium capitalize transition-colors',
                viewMode === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent')}>
              {mode === 'all' ? <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> All</span>
                : mode === 'plots' ? <span className="flex items-center gap-1"><Grid3X3 className="h-3.5 w-3.5" /> Plots</span>
                : <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> Flats</span>}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none">
          <option value="all">All Statuses</option>
          <option value="available">Available</option>
          <option value="booked">Booked</option>
          <option value="sold">Sold</option>
          <option value="reserved">Reserved</option>
          <option value="blocked">Blocked</option>
          <option value="mortgaged">Mortgaged</option>
        </select>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-auto">
          {/* Upload site plan */}
          <label className="p-2 rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer" title="Upload site plan image">
            <Upload className="h-4 w-4 text-muted-foreground" />
            <input type="file" accept="image/*" className="hidden" onChange={handleSitePlanUpload} />
          </label>

          {/* Draw mode toggle */}
          {hasSitePlan && (
            <button
              onClick={() => {
                if (layoutMode === 'draw') {
                  setLayoutMode('view');
                  setDrawingPoints([]);
                  setDrawingForUnit(null);
                } else {
                  setLayoutMode('draw');
                }
              }}
              className={cn(
                'p-2 rounded-lg border transition-colors',
                layoutMode === 'draw'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-accent',
              )}
              title={layoutMode === 'draw' ? 'Exit draw mode' : 'Draw polygons'}
            >
              {layoutMode === 'draw' ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4 text-muted-foreground" />}
            </button>
          )}

          <button onClick={() => fetchProjectDetail(false)}
            className="p-2 rounded-lg border border-border hover:bg-accent transition-colors" title="Refresh">
            <RefreshCw className={cn('h-4 w-4 text-muted-foreground', loadingDetail && 'animate-spin')} />
          </button>
          <button onClick={handleExport}
            className="p-2 rounded-lg border border-border hover:bg-accent transition-colors" title="Export PNG">
            <Download className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="w-px h-6 bg-border mx-1" />
          <button onClick={() => handleZoom('out')} className="p-2 rounded-lg border border-border hover:bg-accent transition-colors" title="Zoom out">
            <ZoomOut className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
          <button onClick={() => handleZoom('in')} className="p-2 rounded-lg border border-border hover:bg-accent transition-colors" title="Zoom in">
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
          </button>
          <button onClick={() => handleZoom('reset')} className="p-2 rounded-lg border border-border hover:bg-accent transition-colors" title="Reset zoom">
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <Legend />

      {/* Draw mode: unit selector panel */}
      {layoutMode === 'draw' && (
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">
              {drawingForUnit
                ? `Drawing polygon for: ${allUnits.find((u) => u.id === drawingForUnit)?.label || drawingForUnit}`
                : 'Select a unit below to draw its polygon on the site plan'}
            </p>
            {drawingForUnit && drawingPoints.length >= 3 && (
              <div className="flex gap-2">
                <button onClick={() => { setDrawingPoints([]); }}
                  className="flex items-center gap-1 px-2 py-1 text-xs border border-border rounded hover:bg-accent">
                  <Undo2 className="h-3 w-3" /> Clear
                </button>
                <button onClick={savePolygon}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">
                  <Save className="h-3 w-3" /> Save ({drawingPoints.length} pts)
                </button>
              </div>
            )}
          </div>
          {undrawnUnits.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {undrawnUnits.map((u) => (
                <button key={u.id}
                  onClick={() => { setDrawingForUnit(u.id); setDrawingPoints([]); }}
                  className={cn('px-2 py-1 text-xs rounded border transition-colors',
                    drawingForUnit === u.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-accent text-foreground')}>
                  {u.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-green-600">All units have polygons drawn!</p>
          )}
        </div>
      )}

      {/* Canvas */}
      <div className="relative bg-card rounded-xl border border-border overflow-hidden" ref={containerRef}>
        {loadingDetail ? (
          <div className="flex items-center justify-center h-[500px]">
            <div className="text-sm text-muted-foreground animate-pulse">Loading layout...</div>
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
            <Maximize2 className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">
              {!selectedProjectId ? 'Select a project to view its layout' : 'No units found for the selected filters'}
            </p>
          </div>
        ) : (
          <>
            {statusUpdating && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-card border border-border rounded-lg px-3 py-1.5 shadow-md">
                <p className="text-xs text-muted-foreground animate-pulse">Updating status...</p>
              </div>
            )}

            <Stage
              ref={stageRef as any}
              width={stageSize.width}
              height={Math.min(canvasHeight * zoomLevel, 800)}
              scaleX={zoomLevel}
              scaleY={zoomLevel}
              draggable={layoutMode === 'view'}
              dragBoundFunc={handleDragBound}
              onWheel={handleWheel}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={handleStageClick}
              style={{ cursor: layoutMode === 'draw' ? 'crosshair' : 'grab' }}
            >
              <Layer>
                {/* Site plan background image */}
                {sitePlanImage && (
                  <KonvaImage
                    image={sitePlanImage}
                    x={0}
                    y={0}
                    width={projectDetail?.sitePlanWidth || sitePlanImage.naturalWidth}
                    height={projectDetail?.sitePlanHeight || sitePlanImage.naturalHeight}
                  />
                )}

                {/* Background grid (only in grid mode) */}
                {!useSitePlanMode && (
                  <>
                    {Array.from({ length: Math.ceil(canvasHeight / 50) }, (_, i) => (
                      <Line key={`hg-${i}`} points={[0, i * 50, stageSize.width / zoomLevel, i * 50]} stroke="#e5e7eb" strokeWidth={0.5} opacity={0.3} />
                    ))}
                    {Array.from({ length: Math.ceil(stageSize.width / 50) }, (_, i) => (
                      <Line key={`vg-${i}`} points={[i * 50, 0, i * 50, canvasHeight]} stroke="#e5e7eb" strokeWidth={0.5} opacity={0.3} />
                    ))}
                  </>
                )}

                {/* Section headers (grid mode) */}
                {!useSitePlanMode && plotUnitsFiltered.length > 0 && (
                  <Text x={CANVAS_PADDING} y={CANVAS_PADDING + 10} text="PLOTS" fontSize={14} fontStyle="bold" fill="#6b7280" />
                )}
                {!useSitePlanMode && flatUnitsFiltered.length > 0 && (
                  <Text x={CANVAS_PADDING} y={Math.min(...flatUnitsFiltered.map((u) => u.y)) - 25} text="FLATS" fontSize={14} fontStyle="bold" fill="#6b7280" />
                )}

                {/* Floor labels (grid mode) */}
                {!useSitePlanMode && floorLabels.map((fl) => (
                  <Text key={`fl-${fl.floor}`} x={CANVAS_PADDING} y={fl.y - 8} text={`F${fl.floor}`} fontSize={11} fill="#9ca3af" fontStyle="bold" />
                ))}

                {/* Render units */}
                {useSitePlanMode ? (
                  <PolygonLayer
                    units={polygonUnits}
                    hoveredId={hoveredId}
                    selectedId={selectedUnit?.id || null}
                    onHover={setHoveredId}
                    onSelect={handleUnitSelect}
                    onContextMenu={handleContextMenu}
                  />
                ) : (
                  <GridLayer
                    units={filteredUnits}
                    hoveredId={hoveredId}
                    selectedId={selectedUnit?.id || null}
                    onHover={setHoveredId}
                    onSelect={handleUnitSelect}
                    onContextMenu={handleContextMenu}
                  />
                )}

                {/* Drawing in-progress polygon */}
                {layoutMode === 'draw' && drawingPoints.length > 0 && (
                  <>
                    <Line
                      points={flattenCoords(drawingPoints)}
                      stroke="#facc15"
                      strokeWidth={2}
                      dash={[5, 3]}
                      closed={drawingPoints.length >= 3}
                      fill={drawingPoints.length >= 3 ? 'rgba(250, 204, 21, 0.2)' : undefined}
                    />
                    {drawingPoints.map((pt, i) => (
                      <Rect
                        key={`dp-${i}`}
                        x={pt[0] - 4}
                        y={pt[1] - 4}
                        width={8}
                        height={8}
                        fill="#facc15"
                        stroke="#000"
                        strokeWidth={1}
                        cornerRadius={2}
                      />
                    ))}
                  </>
                )}
              </Layer>
            </Stage>

            {/* Context menu */}
            {contextMenu && (
              <div className="absolute z-30 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[180px]"
                style={{ left: contextMenu.x, top: contextMenu.y }}
                onClick={(e) => e.stopPropagation()}>
                <div className="px-3 py-1.5 border-b border-border">
                  <p className="text-xs font-semibold text-foreground">
                    {contextMenu.unit.unitType === 'plot' ? 'Plot' : 'Flat'} {contextMenu.unit.label}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{contextMenu.unit.status}</p>
                </div>
                {getContextMenuItems(contextMenu.unit.status).map((item) => (
                  <button key={item.status} disabled={statusUpdating}
                    onClick={() => handleStatusChange(contextMenu.unit, item.status)}
                    className="w-full text-left px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50">
                    <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: STATUS_COLORS[item.status]?.fill || '#6b7280' }} />
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {/* Detail panel */}
            {selectedUnit && (
              <UnitDetailPanel
                unit={selectedUnit}
                bookingInfo={bookingInfo}
                onClose={() => { setSelectedUnit(null); setBookingInfo(null); }}
                onBook={handleBook}
              />
            )}
          </>
        )}

        {/* Stats overlay */}
        {filteredUnits.length > 0 && (
          <div className="absolute bottom-3 left-3 flex items-center gap-4 bg-card/90 backdrop-blur border border-border rounded-lg px-3 py-2">
            <span className="text-xs text-muted-foreground">{filteredUnits.length} units</span>
            <span className="text-xs text-green-600 font-medium">{filteredUnits.filter((u) => u.status === 'available').length} available</span>
            <span className="text-xs text-red-600 font-medium">{filteredUnits.filter((u) => u.status === 'booked').length} booked</span>
            <span className="text-xs text-blue-600 font-medium">{filteredUnits.filter((u) => u.status === 'sold').length} sold</span>
          </div>
        )}
      </div>
    </div>
  );
}
