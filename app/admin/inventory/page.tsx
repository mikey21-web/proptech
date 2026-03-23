'use client';

import { useState, useEffect } from 'react';
import { Building2, Map, Home, Search } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface Project {
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

const statusColors: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  under_construction: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  ready_to_move: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

export default function InventoryPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/projects')
      .then(async (res) => {
        const json = await res.json();
        if (res.ok) setProjects(json.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalUnits = projects.reduce((s, p) => s + (p.available + p.booked + p.sold + p.blocked), 0);
  const totalAvailable = projects.reduce((s, p) => s + p.available, 0);
  const totalBooked = projects.reduce((s, p) => s + p.booked, 0);
  const totalSold = projects.reduce((s, p) => s + p.sold, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
        <p className="text-sm text-muted-foreground mt-1">Plots & flats across all projects</p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Units', value: totalUnits, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: Building2 },
          { label: 'Available', value: totalAvailable, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', icon: Map },
          { label: 'Booked', value: totalBooked, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20', icon: Home },
          { label: 'Sold', value: totalSold, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', icon: Home },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                <div className={cn('p-1.5 rounded-lg', card.bg)}>
                  <Icon className={cn('h-4 w-4', card.color)} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Projects with inventory breakdown */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-6 h-32 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const total = project.available + project.booked + project.sold + project.blocked;
            return (
              <div key={project.id} className="bg-card rounded-xl border border-border p-6 hover:shadow-sm transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{project.name}</h3>
                      <p className="text-xs text-muted-foreground capitalize">{project.type.replace('_', ' ')} {project.city ? `· ${project.city}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', statusColors[project.status] || 'bg-gray-100 text-gray-800')}>
                      {project.status.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-medium text-foreground">{total} units</span>
                  </div>
                </div>

                {/* Stacked bar */}
                <div className="h-6 rounded-lg overflow-hidden flex bg-muted">
                  {project.available > 0 && (
                    <div className="bg-green-500 transition-all flex items-center justify-center" style={{ width: `${(project.available / Math.max(total, 1)) * 100}%` }}>
                      {project.available > 2 && <span className="text-[10px] font-medium text-white">{project.available}</span>}
                    </div>
                  )}
                  {project.booked > 0 && (
                    <div className="bg-yellow-500 transition-all flex items-center justify-center" style={{ width: `${(project.booked / Math.max(total, 1)) * 100}%` }}>
                      {project.booked > 2 && <span className="text-[10px] font-medium text-white">{project.booked}</span>}
                    </div>
                  )}
                  {project.sold > 0 && (
                    <div className="bg-blue-500 transition-all flex items-center justify-center" style={{ width: `${(project.sold / Math.max(total, 1)) * 100}%` }}>
                      {project.sold > 2 && <span className="text-[10px] font-medium text-white">{project.sold}</span>}
                    </div>
                  )}
                  {project.blocked > 0 && (
                    <div className="bg-red-400 transition-all flex items-center justify-center" style={{ width: `${(project.blocked / Math.max(total, 1)) * 100}%` }}>
                      {project.blocked > 2 && <span className="text-[10px] font-medium text-white">{project.blocked}</span>}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 mt-3 flex-wrap">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Available: {project.available}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" /> Booked: {project.booked}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Sold: {project.sold}
                  </span>
                  {project.blocked > 0 && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-400" /> Blocked: {project.blocked}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
