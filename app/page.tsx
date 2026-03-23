import Link from 'next/link';
import { Building2, MapPin, Shield, Zap, Users, ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import EnquiryFormClient from '@/components/public/EnquiryFormClient';

async function getFeaturedProjects() {
  try {
    const orgId = process.env.PUBLIC_ORG_ID;
    let targetOrgId = orgId;
    if (!targetOrgId) {
      const org = await prisma.organization.findFirst({ select: { id: true } });
      targetOrgId = org?.id;
    }
    if (!targetOrgId) return [];

    const projects = await prisma.project.findMany({
      where: { orgId: targetOrgId, deletedAt: null, status: { not: 'cancelled' } },
      take: 6,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        status: true,
        city: true,
        state: true,
        description: true,
        images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
        plots: { where: { deletedAt: null }, select: { status: true, price: true } },
        flats: { where: { deletedAt: null }, select: { status: true, price: true, bedrooms: true } },
      },
    });

    return projects.map((p) => {
      const allUnits = [...p.plots, ...p.flats];
      const prices = allUnits.map((u) => Number(u.price)).filter(Boolean);
      return {
        ...p,
        available: allUnits.filter((u) => u.status === 'available').length,
        totalUnits: allUnits.length,
        minPrice: prices.length ? Math.min(...prices) : null,
        maxPrice: prices.length ? Math.max(...prices) : null,
        primaryImage: p.images[0]?.url ?? null,
        configurations: [...new Set(p.flats.map((f) => f.bedrooms).filter(Boolean))].sort(),
      };
    });
  } catch {
    return [];
  }
}

function formatPrice(price: number) {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L`;
  return `₹${price.toLocaleString('en-IN')}`;
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
};

const typeLabel: Record<string, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  villa: 'Villa',
  plot: 'Plots',
  apartment: 'Apartment',
  mixed: 'Mixed Use',
};

export default async function HomePage() {
  const projects = await getFeaturedProjects();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-sm font-bold text-white">CP</span>
              </div>
              <span className="text-lg font-semibold text-slate-900">ClickProps</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/properties" className="text-sm text-slate-600 hover:text-blue-600 transition-colors">Properties</Link>
              <a href="#about" className="text-sm text-slate-600 hover:text-blue-600 transition-colors">About Us</a>
              <a href="#contact" className="text-sm text-slate-600 hover:text-blue-600 transition-colors">Contact</a>
            </nav>
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 transition-colors hidden sm:inline">Agent Login</Link>
              <Link href="/properties" className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                View Properties
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-36">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-300 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              Sri Sai Builders — Trusted Since 2005
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Find Your Dream<br />
              <span className="text-blue-400">Property</span> Today
            </h1>
            <p className="text-lg text-slate-300 mb-10 max-w-xl">
              Explore premium residential plots, villas, and apartments across prime locations.
              Transparent pricing, interactive layouts, and seamless booking experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/properties"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-base"
              >
                Explore Properties <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#contact"
                className="inline-flex items-center justify-center gap-2 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-base"
              >
                Talk to an Expert
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-8 mt-12 pt-10 border-t border-slate-700/50">
              {[
                { value: '20+', label: 'Projects Delivered' },
                { value: '1500+', label: 'Happy Families' },
                { value: '₹500Cr+', label: 'Inventory Managed' },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-sm text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-2">Our Projects</p>
              <h2 className="text-3xl font-bold text-slate-900">Featured Properties</h2>
            </div>
            <Link href="/properties" className="hidden sm:inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium">Projects launching soon</p>
              <p className="text-sm mt-1">Register your interest below to be notified.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/properties/${project.slug}`}
                  className="group bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200"
                >
                  <div className="relative h-48 bg-gradient-to-br from-blue-50 to-slate-100 overflow-hidden">
                    {project.primaryImage ? (
                      <img src={project.primaryImage} alt={project.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="h-16 w-16 text-slate-300" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[project.status] ?? 'bg-slate-100 text-slate-700'}`}>
                        {statusLabel[project.status] ?? project.status}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/90 text-slate-600">
                        {typeLabel[project.type] ?? project.type}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-slate-900 text-lg mb-1 group-hover:text-blue-600 transition-colors">{project.name}</h3>
                    {(project.city || project.state) && (
                      <div className="flex items-center gap-1 text-sm text-slate-500 mb-3">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        {[project.city, project.state].filter(Boolean).join(', ')}
                      </div>
                    )}
                    {project.description && (
                      <p className="text-sm text-slate-500 line-clamp-2 mb-4">{project.description}</p>
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
                      <span className={`text-xs font-medium px-2 py-1 rounded-md ${project.available > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {project.available > 0 ? `${project.available} available` : 'Sold out'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <div className="text-center mt-8 sm:hidden">
            <Link href="/properties" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all properties <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-2">Why Choose Us</p>
            <h2 className="text-3xl font-bold text-slate-900">The Smart Way to Buy Property</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Building2, title: 'Interactive Floor Plans', desc: 'Visualize every unit on an interactive digital layout. Select your plot or flat and check availability in real time.' },
              { icon: Shield, title: 'RERA Registered', desc: 'All projects are RERA registered. Complete transparency in pricing, documents, and timelines.' },
              { icon: Zap, title: 'Instant Booking', desc: 'Book your unit in minutes with our digital booking wizard. Pay token amount and lock your unit instantly.' },
              { icon: Users, title: 'Dedicated Support', desc: 'A dedicated sales agent walks you through every step — from site visit to possession.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-blue-50 text-blue-600 mb-4">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enquiry CTA */}
      <section id="contact" className="py-20 bg-blue-600">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Find Your Dream Home?</h2>
          <p className="text-blue-100 mb-8">Leave your details and our team will get back to you within 24 hours.</p>
          <div className="bg-white rounded-2xl p-6 sm:p-8 text-left shadow-xl">
            <EnquiryFormClient />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-sm font-bold text-white">CP</span>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">ClickProps</p>
                <p className="text-xs text-slate-500">Sri Sai Builders</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/properties" className="hover:text-white transition-colors">Properties</Link>
              <Link href="/login" className="hover:text-white transition-colors">Agent Login</Link>
              <Link href="/customer" className="hover:text-white transition-colors">Customer Portal</Link>
            </div>
            <p className="text-xs text-slate-600">© {new Date().getFullYear()} Sri Sai Builders. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
