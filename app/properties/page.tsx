'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Building2, MapPin, SlidersHorizontal, Search, X, ArrowLeft, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface Project {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  description: string | null;
  city: string | null;
  state: string | null;
  totalUnits: number | null;
  available: number;
  booked: number;
  minPrice: number | null;
  maxPrice: number | null;
  primaryImage: string | null;
  amenities: { name: string; icon: string | null }[];
  configurations: number[];
}

const statusLabel: Record<string, string> = {
  upcoming: 'Upcoming',
  under_construction: 'Under Construction',
  ready_to_move: 'Ready to Move',
  completed: 'Completed',
  on_hold: 'On Hold',
};

const statusColor: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-700',
  under_construction: 'bg-amber-100 text-amber-700',
  ready_to_move: 'bg-green-100 text-green-700',
  completed: 'bg-slate-100 text-slate-700',
  on_hold: 'bg-orange-100 text-orange-700',
};

const typeLabel: Record<string, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  villa: 'Villa',
  plot: 'Plots',
  apartment: 'Apartment',
  mixed: 'Mixed Use',
};

function formatPrice(price: number) {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L`;
  return `₹${price.toLocaleString('en-IN')}`;
}

export default function PropertiesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(`/api/public/projects?${params}`);
      const data = await res.json();
      if (data.success) setProjects(data.data);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.state?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q);
    const matchesStatus = !statusFilter || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('');
    setStatusFilter('');
  };

  const hasFilters = search || typeFilter || statusFilter;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">CP</span>
                </div>
                <span className="text-lg font-semibold text-slate-900 hidden sm:inline">ClickProps</span>
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-sm text-slate-600 font-medium">Properties</span>
            </div>
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
              Agent Login
            </Link>
          </div>
        </div>
      </header>

      {/* Page title */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">All Properties</h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? 'Loading...' : `${filtered.length} project${filtered.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, city, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[140px]"
            >
              <option value="">All Types</option>
              {Object.entries(typeLabel).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[160px]"
            >
              <option value="">All Statuses</option>
              {Object.entries(statusLabel).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 px-3 py-2.5 border border-slate-200 rounded-lg transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-200 animate-pulse">
                <div className="h-48 bg-slate-200" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                  <div className="h-3 bg-slate-200 rounded w-full" />
                  <div className="h-3 bg-slate-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium text-slate-700">No properties found</p>
            <p className="text-sm text-slate-500 mt-1">Try adjusting your filters</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((project) => (
              <Link
                key={project.id}
                href={`/properties/${project.slug}`}
                className="group bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200"
              >
                {/* Image */}
                <div className="relative h-48 bg-gradient-to-br from-blue-50 to-slate-100 overflow-hidden">
                  {project.primaryImage ? (
                    <img
                      src={project.primaryImage}
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="h-16 w-16 text-slate-300" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', statusColor[project.status] ?? 'bg-slate-100 text-slate-700')}>
                      {statusLabel[project.status] ?? project.status}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/90 text-slate-600">
                      {typeLabel[project.type] ?? project.type}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-5">
                  <h3 className="font-semibold text-slate-900 text-lg mb-1 group-hover:text-blue-600 transition-colors">
                    {project.name}
                  </h3>
                  {(project.city || project.state) && (
                    <div className="flex items-center gap-1 text-sm text-slate-500 mb-3">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      {[project.city, project.state].filter(Boolean).join(', ')}
                    </div>
                  )}
                  {project.description && (
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4">{project.description}</p>
                  )}

                  {/* Configurations */}
                  {project.configurations.length > 0 && (
                    <div className="flex gap-2 mb-4 flex-wrap">
                      {project.configurations.map((bhk) => (
                        <span key={bhk} className="text-xs font-medium px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-slate-600">
                          {bhk} BHK
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Amenities preview */}
                  {project.amenities.length > 0 && (
                    <div className="flex gap-1.5 mb-4 flex-wrap">
                      {project.amenities.slice(0, 4).map((a) => (
                        <span key={a.name} className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded">
                          {a.name}
                        </span>
                      ))}
                      {project.amenities.length > 4 && (
                        <span className="text-xs text-slate-400">+{project.amenities.length - 4} more</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div>
                      {project.minPrice ? (
                        <p className="text-base font-bold text-slate-900">
                          {formatPrice(project.minPrice)}
                          {project.minPrice !== project.maxPrice && project.maxPrice && (
                            <span className="text-slate-500 font-normal text-sm"> – {formatPrice(project.maxPrice)}</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-400">Price on request</p>
                      )}
                    </div>
                    <span className={cn('text-xs font-medium px-2 py-1 rounded-md', project.available > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
                      {project.available > 0 ? `${project.available} available` : 'Sold out'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
