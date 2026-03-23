'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { getNavigation } from '@/lib/navigation';
import { ToastProvider } from '@/components/ui/Toast';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { GlobalSearch } from '@/components/ui/GlobalSearch';
import { cn } from '@/lib/utils/cn';
import {
  Menu,
  X,
  LogOut,
  Moon,
  Sun,
  ChevronDown,
} from 'lucide-react';

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, signOut, hasRole } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('clickprops-dark-mode');
    if (stored === 'true' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium text-foreground">Access Denied</p>
          <p className="text-sm text-muted-foreground">Please sign in to access the agent portal.</p>
          <Link
            href="/login"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (!hasRole(['agent', 'admin', 'super_admin'])) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium text-foreground">Unauthorized</p>
          <p className="text-sm text-muted-foreground">You do not have permission to access this area.</p>
        </div>
      </div>
    );
  }

  const navigation = getNavigation('agent');

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-64 transform bg-card border-r border-border transition-transform duration-200 ease-in-out lg:static lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center justify-between px-6 border-b border-border">
              <Link href="/agent" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-foreground">CP</span>
                </div>
                <span className="text-lg font-semibold text-foreground">ClickProps</span>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden rounded-md p-1 text-muted-foreground hover:text-foreground"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nav sections */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Sidebar navigation">
              {navigation.map((section) => (
                <div key={section.title}>
                  <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </p>
                  <ul className="space-y-1" role="list">
                    {section.items.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        (item.href !== '/agent' && pathname.startsWith(item.href));
                      const Icon = item.icon;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                            )}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            <Icon className="h-5 w-5 flex-shrink-0" />
                            {item.label}
                            {item.badge !== undefined && item.badge > 0 && (
                              <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>

            {/* User footer */}
            <div className="border-t border-border p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {(user.name ?? user.email).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top header */}
          <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-accent"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex-1" />

            <div className="hidden md:block w-64 mr-2">
              <GlobalSearch />
            </div>

            <div className="flex items-center gap-2">
              {/* Dark mode toggle */}
              <button
                onClick={toggleDarkMode}
                className="rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {/* Notifications */}
              <NotificationBell />

              {/* Sign out */}
              <button
                onClick={() => signOut()}
                className="rounded-md p-2 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-accent transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
