/**
 * Chart configuration helpers for Recharts
 * Provides consistent styling, colors, and formatters for all admin charts.
 */

// ---------------------------------------------------------------------------
// Color palettes
// ---------------------------------------------------------------------------

export const CHART_COLORS = {
  primary: '#3b82f6',   // blue-500
  secondary: '#8b5cf6', // violet-500
  success: '#22c55e',   // green-500
  warning: '#f59e0b',   // amber-500
  danger: '#ef4444',    // red-500
  info: '#06b6d4',      // cyan-500
  muted: '#94a3b8',     // slate-400
} as const;

export const PALETTE = [
  '#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1',
] as const;

// Unit status colors (matches Konva floor plan)
export const UNIT_STATUS_COLORS: Record<string, string> = {
  available: '#22c55e',
  booked: '#3b82f6',
  blocked: '#6b7280',
  reserved: '#f59e0b',
  sold: '#8b5cf6',
  pending: '#eab308',
  mortgaged: '#ef4444',
};

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

/** Format Indian currency (e.g. 14,85,000 or 14.85 Cr) */
export function formatINR(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_00_00_000) return `${(value / 1_00_00_000).toFixed(2)} Cr`;
    if (value >= 1_00_000) return `${(value / 1_00_000).toFixed(2)} L`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)} K`;
    return String(value);
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format percentage with 1 decimal */
export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

/** Format a number with commas (Indian numbering) */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function getMonthLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
}

/** Get the last N months as YYYY-MM strings */
export function getLastNMonths(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${yyyy}-${mm}`);
  }
  return months;
}

// ---------------------------------------------------------------------------
// Chart axis tick formatter
// ---------------------------------------------------------------------------

export function currencyTickFormatter(value: number): string {
  return formatINR(value, true);
}

// ---------------------------------------------------------------------------
// Trend calculation
// ---------------------------------------------------------------------------

export function calculateTrend(
  current: number,
  previous: number,
): { direction: 'up' | 'down' | 'flat'; percentage: number } {
  if (previous === 0) {
    return current > 0
      ? { direction: 'up', percentage: 100 }
      : { direction: 'flat', percentage: 0 };
  }
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.5) return { direction: 'flat', percentage: 0 };
  return {
    direction: pct > 0 ? 'up' : 'down',
    percentage: Math.abs(pct),
  };
}
