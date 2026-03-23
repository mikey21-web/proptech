'use client';

import { useState, useEffect } from 'react';
import { UserCircle, Search, Plus, Phone, Mail, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  city: string | null;
  createdAt: string;
  totalBookings: number;
  totalLeads: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/customers')
      .then(async (res) => {
        const json = await res.json();
        if (res.ok) setCustomers(json.data?.customers || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all registered customers</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors w-fit">
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 w-full max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-6 h-40 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <UserCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? 'No customers match your search' : 'No customers yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((customer) => (
            <div key={customer.id} className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">{customer.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{customer.name}</h3>
                  {customer.city && (
                    <span className="text-xs text-muted-foreground">{customer.city}</span>
                  )}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" /> {customer.phone}
                </p>
                {customer.email && (
                  <p className="text-muted-foreground flex items-center gap-2 truncate">
                    <Mail className="h-3.5 w-3.5" /> {customer.email}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  {customer.totalBookings} bookings
                </div>
                <span className="text-xs text-muted-foreground">
                  Since {new Date(customer.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
