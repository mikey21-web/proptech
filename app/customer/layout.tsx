'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  IndianRupee,
  FileText,
  MessageSquare,
  Map,
  Menu,
  X,
  LogOut,
  Moon,
  Sun,
  Bell,
  User,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const navigation = [
  { label: 'Dashboard', href: '/customer', icon: LayoutDashboard },
  { label: 'Browse Plots', href: '/customer/plots', icon: Map },
  { label: 'My Bookings', href: '/customer/bookings', icon: BookOpen },
  { label: 'Payments', href: '/customer/payments', icon: IndianRupee },
  { label: 'Documents', href: '/customer/documents', icon: FileText },
  { label: 'Messages', href: '/customer/messages', icon: MessageSquare },
];

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const saved = localStorage.getItem('clickprops-dark-mode');
    if (saved === 'true' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('clickprops-dark-mode', String(next));
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (status === 'unauthenticated') return null;

  const user = session?.user;

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          role="presentation"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link href="/customer" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              CP
            </div>
            <span className="text-lg font-semibold text-foreground">
              ClickProps
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto p-4" role="navigation" aria-label="Customer portal navigation">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/customer' && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User info */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {user?.name || 'Customer'}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-muted-foreground hover:text-foreground"
              aria-label="Open sidebar"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
              <Link href="/customer" className="hover:text-foreground">
                Home
              </Link>
              {pathname !== '/customer' && (
                <>
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-foreground capitalize">
                    {pathname.split('/').filter(Boolean).pop()?.replace(/[-[\]]/g, ' ') || ''}
                  </span>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button
              className="relative rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            {/* Logout */}
            <Link
              href="/api/auth/signout"
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}
