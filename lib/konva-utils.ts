/**
 * Konva.js floor plan utilities
 * Helpers for drawing unit grids, managing unit states, and interactions.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FloorPlanUnit {
  id: string;
  unitNumber: string;
  type: 'plot' | 'flat';
  status: 'available' | 'reserved' | 'booked' | 'sold' | 'blocked' | 'mortgaged';
  area: number;
  price: number;
  pricePerSqft?: number;
  facing?: string;
  dimensions?: string;
  floor?: number;
  bedrooms?: number;
  // Grid position
  row: number;
  col: number;
}

export interface FloorPlanConfig {
  cellWidth: number;
  cellHeight: number;
  padding: number;
  headerHeight: number;
  cols: number;
  rows: number;
  showLabels: boolean;
  showPrices: boolean;
}

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

export const DEFAULT_FLOOR_PLAN_CONFIG: FloorPlanConfig = {
  cellWidth: 100,
  cellHeight: 80,
  padding: 8,
  headerHeight: 40,
  cols: 10,
  rows: 10,
  showLabels: true,
  showPrices: false,
};

// ---------------------------------------------------------------------------
// Status colors (consistent with charts.ts)
// ---------------------------------------------------------------------------

export const STATUS_COLORS: Record<string, string> = {
  available: '#22c55e',   // green
  booked: '#ef4444',      // red (taken/occupied)
  reserved: '#f59e0b',    // amber/yellow
  sold: '#3b82f6',        // blue (completed sale)
  blocked: '#6b7280',     // gray
  mortgaged: '#8b5cf6',   // violet
  pending: '#eab308',     // yellow
};

export const STATUS_COLORS_HOVER: Record<string, string> = {
  available: '#16a34a',
  booked: '#dc2626',
  reserved: '#d97706',
  sold: '#2563eb',
  blocked: '#4b5563',
  mortgaged: '#7c3aed',
  pending: '#ca8a04',
};

export const STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  booked: 'Booked',
  blocked: 'Blocked',
  reserved: 'Reserved',
  sold: 'Sold',
  pending: 'Pending',
  mortgaged: 'Mortgaged',
};

// ---------------------------------------------------------------------------
// Grid layout helpers
// ---------------------------------------------------------------------------

/** Calculate the position of a unit cell given its row and col */
export function getCellPosition(
  row: number,
  col: number,
  config: FloorPlanConfig = DEFAULT_FLOOR_PLAN_CONFIG,
): { x: number; y: number } {
  const x = config.padding + col * (config.cellWidth + config.padding);
  const y = config.headerHeight + config.padding + row * (config.cellHeight + config.padding);
  return { x, y };
}

/** Calculate total canvas dimensions */
export function getCanvasDimensions(
  config: FloorPlanConfig = DEFAULT_FLOOR_PLAN_CONFIG,
): { width: number; height: number } {
  const width =
    config.padding + config.cols * (config.cellWidth + config.padding);
  const height =
    config.headerHeight +
    config.padding +
    config.rows * (config.cellHeight + config.padding);
  return { width, height };
}

/** Arrange units into grid positions (auto-layout) */
export function arrangeUnitsInGrid(
  units: Omit<FloorPlanUnit, 'row' | 'col'>[],
  cols: number,
): FloorPlanUnit[] {
  return units.map((unit, index) => ({
    ...unit,
    row: Math.floor(index / cols),
    col: index % cols,
  }));
}

/** Convert Plot/Flat DB records to FloorPlanUnit */
export function dbUnitsToFloorPlan(
  plots: Array<{
    id: string;
    plotNumber: string;
    status: string;
    area: number | string;
    price: number | string;
    pricePerSqft?: number | string | null;
    facing?: string | null;
    dimensions?: string | null;
  }>,
  flats: Array<{
    id: string;
    flatNumber: string;
    status: string;
    area: number | string;
    price: number | string;
    pricePerSqft?: number | string | null;
    facing?: string | null;
    floor: number;
    bedrooms: number;
  }>,
  cols: number = 10,
): FloorPlanUnit[] {
  const plotUnits: Omit<FloorPlanUnit, 'row' | 'col'>[] = plots.map((p) => ({
    id: p.id,
    unitNumber: p.plotNumber,
    type: 'plot' as const,
    status: p.status as FloorPlanUnit['status'],
    area: Number(p.area),
    price: Number(p.price),
    pricePerSqft: p.pricePerSqft ? Number(p.pricePerSqft) : undefined,
    facing: p.facing || undefined,
    dimensions: p.dimensions || undefined,
  }));

  const flatUnits: Omit<FloorPlanUnit, 'row' | 'col'>[] = flats.map((f) => ({
    id: f.id,
    unitNumber: f.flatNumber,
    type: 'flat' as const,
    status: f.status as FloorPlanUnit['status'],
    area: Number(f.area),
    price: Number(f.price),
    pricePerSqft: f.pricePerSqft ? Number(f.pricePerSqft) : undefined,
    facing: f.facing || undefined,
    floor: f.floor,
    bedrooms: f.bedrooms,
  }));

  return arrangeUnitsInGrid([...plotUnits, ...flatUnits], cols);
}

// ---------------------------------------------------------------------------
// Context menu actions
// ---------------------------------------------------------------------------

export type UnitAction =
  | 'mark_available'
  | 'mark_booked'
  | 'mark_blocked'
  | 'mark_sold'
  | 'mark_reserved'
  | 'view_details'
  | 'change_price';

export interface ContextMenuItem {
  label: string;
  action: UnitAction;
  icon?: string;
}

export function getContextMenuItems(currentStatus: string): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    { label: 'View Details', action: 'view_details' },
    { label: 'Change Price', action: 'change_price' },
  ];

  if (currentStatus !== 'available') {
    items.push({ label: 'Mark Available', action: 'mark_available' });
  }
  if (currentStatus !== 'reserved') {
    items.push({ label: 'Mark Reserved', action: 'mark_reserved' });
  }
  if (currentStatus !== 'booked') {
    items.push({ label: 'Mark Booked', action: 'mark_booked' });
  }
  if (currentStatus !== 'blocked') {
    items.push({ label: 'Block Unit', action: 'mark_blocked' });
  }
  if (currentStatus !== 'sold') {
    items.push({ label: 'Mark Sold', action: 'mark_sold' });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

export function formatUnitPrice(price: number): string {
  if (price >= 1_00_00_000) return `${(price / 1_00_00_000).toFixed(2)} Cr`;
  if (price >= 1_00_000) return `${(price / 1_00_000).toFixed(1)} L`;
  if (price >= 1_000) return `${(price / 1_000).toFixed(0)} K`;
  return String(price);
}
