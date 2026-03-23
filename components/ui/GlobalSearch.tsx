'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Loader2,
  Users,
  BookOpen,
  UserCircle,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface SearchResult {
  leads?: Array<{ id: string; name: string; phone: string; email: string | null; status: string; priority: string }>;
  customers?: Array<{ id: string; name: string; phone: string; email: string | null }>;
  bookings?: Array<{ id: string; bookingNumber: string; status: string; customer: { name: string }; project: { name: string } }>;
  agents?: Array<{ id: string; agentCode: string; user: { name: string; email: string } }>;
  projects?: Array<{ id: string; name: string; type: string; status: string }>;
}

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const allItems: Array<{ type: string; label: string; sub: string; href: string }> = results
    ? [
        ...(results.leads?.map((l) => ({
          type: 'Lead',
          label: l.name || l.phone,
          sub: `${l.status} • ${l.priority} priority`,
          href: `/admin/leads/${l.id}`,
        })) || []),
        ...(results.customers?.map((c) => ({
          type: 'Customer',
          label: c.name || c.phone,
          sub: c.email || c.phone,
          href: `/admin/customers`,
        })) || []),
        ...(results.bookings?.map((b) => ({
          type: 'Booking',
          label: b.bookingNumber,
          sub: `${b.customer?.name} • ${b.project?.name}`,
          href: `/admin/bookings`,
        })) || []),
        ...(results.agents?.map((a) => ({
          type: 'Agent',
          label: a.user.name || a.agentCode,
          sub: a.user.email || a.agentCode,
          href: `/admin/agents`,
        })) || []),
        ...(results.projects?.map((p) => ({
          type: 'Project',
          label: p.name,
          sub: `${p.type} • ${p.status}`,
          href: `/admin/projects`,
        })) || []),
      ]
    : [];

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (json.success) {
          setResults(json.data);
          setOpen(true);
          setSelectedIndex(-1);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const item = allItems[selectedIndex];
      if (item) {
        router.push(item.href);
        setOpen(false);
        setQuery('');
        inputRef.current?.blur();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const totalResults = allItems.length;

  return (
    <div className="relative flex-1 max-w-md" ref={panelRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder="Search leads, bookings, customers..."
          className="w-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground pl-9 pr-8 py-2"
        />
        {loading && (
          <Loader2 className="absolute right-3 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
        {query && !loading && (
          <button
            onClick={() => { setQuery(''); setResults(null); setOpen(false); inputRef.current?.focus(); }}
            className="absolute right-3 rounded-md p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Results panel */}
      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 max-h-[400px] overflow-y-auto">
          {!loading && totalResults === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
              <Search className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
            </div>
          ) : (
            <>
              {results?.leads && results.leads.length > 0 && (
                <Section title="Leads" icon={Users} items={allItems.filter((i) => i.type === 'Lead')} selectedIndex={selectedIndex} onSelect={(idx) => { router.push(allItems.filter((i) => i.type === 'Lead')[idx].href); setOpen(false); setQuery(''); }} />
              )}
              {results?.customers && results.customers.length > 0 && (
                <Section title="Customers" icon={UserCircle} items={allItems.filter((i) => i.type === 'Customer')} selectedIndex={selectedIndex} onSelect={(idx) => { router.push(allItems.filter((i) => i.type === 'Customer')[idx].href); setOpen(false); setQuery(''); }} />
              )}
              {results?.bookings && results.bookings.length > 0 && (
                <Section title="Bookings" icon={BookOpen} items={allItems.filter((i) => i.type === 'Booking')} selectedIndex={selectedIndex} onSelect={(idx) => { router.push(allItems.filter((i) => i.type === 'Booking')[idx].href); setOpen(false); setQuery(''); }} />
              )}
              {results?.agents && results.agents.length > 0 && (
                <Section title="Agents" icon={Users} items={allItems.filter((i) => i.type === 'Agent')} selectedIndex={selectedIndex} onSelect={(idx) => { router.push(allItems.filter((i) => i.type === 'Agent')[idx].href); setOpen(false); setQuery(''); }} />
              )}
              {results?.projects && results.projects.length > 0 && (
                <Section title="Projects" icon={Building2} items={allItems.filter((i) => i.type === 'Project')} selectedIndex={selectedIndex} onSelect={(idx) => { router.push(allItems.filter((i) => i.type === 'Project')[idx].href); setOpen(false); setQuery(''); }} />
              )}
              {totalResults > 0 && (
                <div className="px-3 py-2 border-t border-border">
                  <button
                    onClick={() => { setOpen(false); setQuery(''); }}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground w-full py-1"
                  >
                    <span>View all results</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  items,
  selectedIndex,
  onSelect,
}: {
  title: string;
  icon: typeof Users;
  items: Array<{ type: string; label: string; sub: string; href: string }>;
  selectedIndex: number;
  onSelect: (idx: number) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="px-3 py-1.5 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
      </div>
      {items.map((item, i) => (
        <button
          key={`${item.type}-${i}`}
          onClick={() => onSelect(i)}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 hover:bg-accent/50 transition-colors text-left',
            selectedIndex >= 0 && 'bg-accent/30'
          )}
        >
          <div className="min-w-0">
            <p className="text-sm text-foreground truncate">{item.label}</p>
            <p className="text-xs text-muted-foreground truncate">{item.sub}</p>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        </button>
      ))}
    </div>
  );
}
