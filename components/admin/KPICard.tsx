'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    direction: 'up' | 'down' | 'flat';
    percentage: number;
    label?: string;
  };
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'violet' | 'amber' | 'red' | 'cyan';
}

const COLOR_MAP = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    icon: 'bg-blue-500',
    text: 'text-blue-700 dark:text-blue-300',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-950/30',
    icon: 'bg-green-500',
    text: 'text-green-700 dark:text-green-300',
  },
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    icon: 'bg-violet-500',
    text: 'text-violet-700 dark:text-violet-300',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    icon: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    icon: 'bg-red-500',
    text: 'text-red-700 dark:text-red-300',
  },
  cyan: {
    bg: 'bg-cyan-50 dark:bg-cyan-950/30',
    icon: 'bg-cyan-500',
    text: 'text-cyan-700 dark:text-cyan-300',
  },
};

export default function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'blue',
}: KPICardProps) {
  const colors = COLOR_MAP[color];

  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-700 ${colors.bg} p-5 transition-shadow hover:shadow-md`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
            {title}
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white truncate">
            {value}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={`flex-shrink-0 p-2.5 rounded-lg ${colors.icon} text-white`}
        >
          {icon}
        </div>
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          {trend.direction === 'up' && (
            <TrendingUp className="h-4 w-4 text-green-500" />
          )}
          {trend.direction === 'down' && (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          {trend.direction === 'flat' && (
            <Minus className="h-4 w-4 text-slate-400" />
          )}
          <span
            className={`text-sm font-medium ${
              trend.direction === 'up'
                ? 'text-green-600 dark:text-green-400'
                : trend.direction === 'down'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-500'
            }`}
          >
            {trend.percentage.toFixed(1)}%
          </span>
          {trend.label && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {trend.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
