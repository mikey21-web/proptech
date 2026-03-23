import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar, Shield, Home, CheckCircle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import ProjectDetailClient from './ProjectDetailClient';

async function getPublicOrgId() {
  const envId = process.env.PUBLIC_ORG_ID;
  if (envId) return envId;
  const org = await prisma.organization.findFirst({ select: { id: true } });
  return org?.id ?? null;
}

async function getProject(slug: string) {
  const orgId = await getPublicOrgId();
  if (!orgId) return null;

  const project = await prisma.project.findFirst({
    where: { slug, orgId, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      status: true,
      description: true,
      address: true,
      city: true,
      state: true,
      pincode: true,
      totalUnits: true,
      totalArea: true,
      launchDate: true,
      completionDate: true,
      reraNumber: true,
      brochureUrl: true,
      sitePlanUrl: true,
      sitePlanWidth: true,
      sitePlanHeight: true,
      images: { orderBy: { sortOrder: 'asc' }, select: { url: true, caption: true, isPrimary: true } },
      amenities: { select: { name: true, icon: true, description: true } },
      plots: {
        where: { deletedAt: null },
        orderBy: { plotNumber: 'asc' },
        select: {
          id: true, plotNumber: true, area: true, dimensions: true,
          facing: true, price: true, pricePerSqft: true, status: true, coordinates: true,
        },
      },
      flats: {
        where: { deletedAt: null },
        orderBy: [{ floor: 'asc' }, { flatNumber: 'asc' }],
        select: {
          id: true, flatNumber: true, floor: true, bedrooms: true, bathrooms: true,
          area: true, superArea: true, facing: true, price: true, pricePerSqft: true,
          status: true, coordinates: true,
        },
      },
    },
  });

  if (!project) return null;

  const sanitizeStatus = (s: string) => (s === 'blocked' ? 'reserved' : s);

  return {
    ...project,
    totalArea: project.totalArea ? Number(project.totalArea) : null,
    plots: project.plots.map((p) => ({
      ...p,
      area: Number(p.area),
      price: Number(p.price),
      pricePerSqft: p.pricePerSqft ? Number(p.pricePerSqft) : null,
      status: sanitizeStatus(p.status),
      coordinates: p.coordinates as number[][] | null,
    })),
    flats: project.flats.map((f) => ({
      ...f,
      area: Number(f.area),
      superArea: f.superArea ? Number(f.superArea) : null,
      price: Number(f.price),
      pricePerSqft: f.pricePerSqft ? Number(f.pricePerSqft) : null,
      status: sanitizeStatus(f.status),
      coordinates: f.coordinates as number[][] | null,
    })),
  };
}

const statusLabel: Record<string, string> = {
  upcoming: 'Upcoming', under_construction: 'Under Construction',
  ready_to_move: 'Ready to Move', completed: 'Completed', on_hold: 'On Hold',
};

const statusColor: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-700',
  under_construction: 'bg-amber-100 text-amber-700',
  ready_to_move: 'bg-green-100 text-green-700',
  completed: 'bg-slate-100 text-slate-700',
};

function formatPrice(price: number) {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L`;
  return `₹${price.toLocaleString('en-IN')}`;
}

export default async function ProjectDetailPage({ params }: { params: { slug: string } }) {
  const project = await getProject(params.slug);
  if (!project) notFound();

  const allUnits = [...project.plots, ...project.flats];
  const prices = allUnits.map((u) => u.price).filter(Boolean);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;
  const available = allUnits.filter((u) => u.status === 'available').length;
  const booked = allUnits.filter((u) => u.status === 'booked' || u.status === 'sold').length;
  const reserved = allUnits.filter((u) => u.status === 'reserved').length;

  const primaryImage = project.images.find((i) => i.isPrimary)?.url ?? project.images[0]?.url ?? null;
  const galleryImages = project.images.slice(0, 5);
  const configurations = [...new Set(project.flats.map((f) => f.bedrooms).filter(Boolean))].sort();

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
              <Link href="/properties" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">Properties</Link>
              <span className="text-slate-300">/</span>
              <span className="text-sm text-slate-900 font-medium truncate max-w-[160px]">{project.name}</span>
            </div>
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 transition-colors hidden sm:inline">
              Agent Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero image */}
      {primaryImage && (
        <div className="relative h-64 sm:h-80 lg:h-96 bg-slate-900 overflow-hidden">
          <img src={primaryImage} alt={project.name} className="w-full h-full object-cover opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor[project.status] ?? 'bg-slate-100 text-slate-700'}`}>
                {statusLabel[project.status] ?? project.status}
              </span>
              {project.reraNumber && (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-white/20 text-white backdrop-blur flex items-center gap-1">
                  <Shield className="h-3 w-3" /> RERA: {project.reraNumber}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{project.name}</h1>
            {(project.city || project.state) && (
              <div className="flex items-center gap-1 text-white/80 text-sm mt-1">
                <MapPin className="h-4 w-4" />
                {[project.address, project.city, project.state, project.pincode].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!primaryImage && (
          <div className="mb-6">
            <Link href="/properties" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors">
              <ArrowLeft className="h-4 w-4" /> All Properties
            </Link>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
                {(project.city || project.state) && (
                  <div className="flex items-center gap-1 text-slate-500 text-sm mt-1">
                    <MapPin className="h-4 w-4" />
                    {[project.address, project.city, project.state].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
              <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${statusColor[project.status] ?? 'bg-slate-100 text-slate-700'}`}>
                {statusLabel[project.status] ?? project.status}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Units', value: project.totalUnits || allUnits.length },
                { label: 'Available', value: available, highlight: true },
                { label: 'Booked', value: booked },
                { label: 'Reserved', value: reserved },
              ].map(({ label, value, highlight }) => (
                <div key={label} className={`bg-white rounded-xl border p-4 text-center ${highlight ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}>
                  <p className={`text-2xl font-bold ${highlight ? 'text-green-700' : 'text-slate-900'}`}>{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Pricing */}
            {minPrice && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900 mb-3">Pricing</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">{formatPrice(minPrice)}</span>
                  {minPrice !== maxPrice && maxPrice && (
                    <span className="text-slate-500"> – {formatPrice(maxPrice)}</span>
                  )}
                </div>
                {configurations.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {configurations.map((bhk) => (
                      <span key={bhk} className="text-xs font-medium px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md">{bhk} BHK</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {project.description && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900 mb-3">About the Project</h3>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{project.description}</p>
              </div>
            )}

            {/* Interactive Floor Plan */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Interactive Floor Plan</h3>
              <p className="text-sm text-slate-500 mb-4">
                Click on any unit to view details. Green = Available, Yellow = Reserved, Red = Booked.
              </p>
              <ProjectDetailClient
                plots={project.plots}
                flats={project.flats}
                sitePlanUrl={project.sitePlanUrl}
                sitePlanWidth={project.sitePlanWidth}
                sitePlanHeight={project.sitePlanHeight}
                projectSlug={project.slug}
              />
            </div>

            {/* Gallery */}
            {galleryImages.length > 1 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900 mb-4">Gallery</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {galleryImages.map((img, i) => (
                    <div key={i} className="aspect-video rounded-lg overflow-hidden bg-slate-100">
                      <img src={img.url} alt={img.caption ?? `Image ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Amenities */}
            {project.amenities.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900 mb-4">Amenities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {project.amenities.map((a) => (
                    <div key={a.name} className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {a.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Details */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">Project Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Project Type', value: project.type },
                  { label: 'Total Area', value: project.totalArea ? `${project.totalArea.toLocaleString()} sq.ft` : null },
                  { label: 'Launch Date', value: project.launchDate ? new Date(project.launchDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' }) : null },
                  { label: 'Completion Date', value: project.completionDate ? new Date(project.completionDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' }) : null },
                  { label: 'RERA Number', value: project.reraNumber },
                  { label: 'Location', value: [project.city, project.state].filter(Boolean).join(', ') || null },
                ].filter((d) => d.value).map(({ label, value }) => (
                  <div key={label} className="flex gap-2">
                    <span className="text-sm text-slate-500 min-w-[120px]">{label}:</span>
                    <span className="text-sm font-medium text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
              {project.brochureUrl && (
                <a
                  href={project.brochureUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium border border-blue-200 rounded-lg px-4 py-2 hover:bg-blue-50 transition-colors"
                >
                  <Home className="h-4 w-4" /> Download Brochure
                </a>
              )}
            </div>
          </div>

          {/* Right: Sticky enquiry sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-blue-600 px-5 py-4">
                  <h3 className="text-white font-semibold">Request a Callback</h3>
                  <p className="text-blue-100 text-xs mt-0.5">Our team will contact you within 24 hours</p>
                </div>
                <div className="p-5">
                  <ProjectEnquiryForm projectSlug={project.slug} />
                </div>
              </div>

              {/* Quick facts */}
              {minPrice && (
                <div className="mt-4 bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-500">Starting from</span>
                    <span className="font-bold text-slate-900 text-base">{formatPrice(minPrice)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Available units</span>
                    <span className={`font-semibold ${available > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {available > 0 ? available : 'Sold out'}
                    </span>
                  </div>
                  {project.reraNumber && (
                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                      <Shield className="h-3.5 w-3.5 text-green-600" />
                      RERA Registered
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">CP</span>
            </div>
            <span className="text-white font-semibold text-sm">ClickProps</span>
            <span className="text-slate-600 text-xs">— Sri Sai Builders</span>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/properties" className="hover:text-white transition-colors">Properties</Link>
            <Link href="/login" className="hover:text-white transition-colors">Agent Login</Link>
            <Link href="/customer" className="hover:text-white transition-colors">Customer Portal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// These are separate client components
import ProjectEnquiryForm from './ProjectEnquiryForm';
