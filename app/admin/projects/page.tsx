'use client';

import { useState, useEffect } from 'react';
import { Building2, Plus, MapPin, Search } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface Project {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  city: string | null;
  totalUnits: number | null;
  available: number;
  booked: number;
  sold: number;
  totalBookings: number;
}

function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(1)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

const statusColors: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  under_construction: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  ready_to_move: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  on_hold: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/admin/projects')
      .then(async (res) => {
        const json = await res.json();
        if (res.ok) setProjects(json.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage real estate projects and inventory</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors w-fit">
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 w-full max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-6 h-48 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? 'No projects match your search' : 'No projects yet. Create your first project.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <div key={project.id} className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{project.name}</h3>
                    <span className="text-xs text-muted-foreground capitalize">{project.type.replace('_', ' ')}</span>
                  </div>
                </div>
                <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', statusColors[project.status] || 'bg-gray-100 text-gray-800')}>
                  {project.status.replace('_', ' ')}
                </span>
              </div>

              {project.city && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mb-4">
                  <MapPin className="h-3.5 w-3.5" /> {project.city}
                </p>
              )}

              <div className="grid grid-cols-4 gap-2 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Units</p>
                  <p className="text-sm font-semibold text-foreground">{project.totalUnits || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Available</p>
                  <p className="text-sm font-semibold text-green-600">{project.available}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Booked</p>
                  <p className="text-sm font-semibold text-yellow-600">{project.booked}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sold</p>
                  <p className="text-sm font-semibold text-blue-600">{project.sold}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
