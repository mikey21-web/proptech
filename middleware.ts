import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

/**
 * ClickProps CRM — Route protection middleware
 *
 * Page routes:
 *   /admin/*           → super_admin, admin
 *   /sales-manager/*   → super_admin, admin, sales_manager
 *   /backoffice/*      → super_admin, admin, backoffice
 *   /agent/*           → super_admin, admin, agent
 *   /customer/*        → any authenticated user
 *   /dashboard/*       → any authenticated user
 *
 * API routes:
 *   /api/leads/*       → super_admin, admin, sales_manager, backoffice, agent
 *   /api/bookings/*    → super_admin, admin, sales_manager, backoffice, agent
 *   /api/projects/*    → any authenticated user
 *   /api/agents/*      → super_admin, admin, sales_manager
 *   /api/customers/*   → super_admin, admin, sales_manager, backoffice, agent
 *
 * Public:
 *   /api/auth/*, /auth/*, /, /login, /properties
 */

type Role = string;

function deny(req: { url: string }, message: string, status: number) {
  const isApi = new URL(req.url).pathname.startsWith('/api/');
  if (isApi) {
    return new NextResponse(
      JSON.stringify({ success: false, error: message }),
      { status, headers: { 'Content-Type': 'application/json' } },
    );
  }
  const unauthorizedUrl = new URL('/login', req.url);
  unauthorizedUrl.searchParams.set('error', 'AccessDenied');
  return NextResponse.redirect(unauthorizedUrl);
}

const PAGE_RULES: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: '/admin', roles: ['super_admin', 'admin'] },
  { prefix: '/sales-manager', roles: ['super_admin', 'admin', 'sales_manager'] },
  { prefix: '/backoffice', roles: ['super_admin', 'admin', 'backoffice'] },
  { prefix: '/agent', roles: ['super_admin', 'admin', 'agent'] },
];

const API_RULES: Array<{ prefix: string; roles: Role[] }> = [
  {
    prefix: '/api/agents',
    roles: ['super_admin', 'admin', 'sales_manager'],
  },
  {
    prefix: '/api/customer/',
    roles: ['super_admin', 'admin', 'sales_manager', 'backoffice', 'agent', 'customer'],
  },
  {
    prefix: '/api/leads',
    roles: ['super_admin', 'admin', 'sales_manager', 'backoffice', 'agent'],
  },
  {
    prefix: '/api/bookings',
    roles: ['super_admin', 'admin', 'sales_manager', 'backoffice', 'agent'],
  },
  {
    prefix: '/api/commissions',
    roles: ['super_admin', 'admin', 'sales_manager', 'agent'],
  },
  {
    prefix: '/api/customers',
    roles: ['super_admin', 'admin', 'sales_manager', 'backoffice', 'agent'],
  },
  {
    prefix: '/api/tasks',
    roles: ['super_admin', 'admin', 'sales_manager', 'backoffice', 'agent'],
  },
  {
    prefix: '/api/call-logs',
    roles: ['super_admin', 'admin', 'sales_manager', 'backoffice', 'agent'],
  },
  {
    prefix: '/api/site-visits',
    roles: ['super_admin', 'admin', 'sales_manager', 'backoffice', 'agent'],
  },
  {
    prefix: '/api/notifications',
    roles: ['super_admin', 'admin', 'sales_manager', 'backoffice', 'agent'],
  },
  {
    prefix: '/api/wizard',
    roles: ['super_admin', 'admin', 'sales_manager', 'backoffice', 'agent'],
  },
  {
    prefix: '/api/automation',
    roles: ['super_admin', 'admin'],
  },
  {
    prefix: '/api/admin',
    roles: ['super_admin', 'admin', 'sales_manager'],
  },
  // /api/projects → any authenticated user (no role restriction)
];

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // For API routes without a token, let the route handler return JSON 401
    if (pathname.startsWith('/api/') && !token) {
      return NextResponse.next();
    }

    // Fail-deny: if token exists but has no role, reject
    const role = token?.role as string;
    if (!role) {
      return deny(req, 'Invalid session — missing role', 403);
    }

    // --- Page routes ---
    for (const rule of PAGE_RULES) {
      if (pathname.startsWith(rule.prefix)) {
        if (!rule.roles.includes(role)) {
          return deny(req, 'Insufficient permissions', 403);
        }
        break;
      }
    }

    // --- API routes ---
    for (const rule of API_RULES) {
      if (pathname.startsWith(rule.prefix)) {
        if (!rule.roles.includes(role)) {
          return deny(req, 'Insufficient permissions', 403);
        }
        break;
      }
    }

    // Attach user context via headers so API routes can read it
    const response = NextResponse.next();
    if (token) {
      response.headers.set('x-user-id', (token.id as string) || '');
      response.headers.set('x-user-role', role);
      response.headers.set('x-user-org', (token.orgId as string) || '');
    }
    return response;
  },
  {
    pages: {
      signIn: '/login',
    },
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;

        // Public routes
        if (
          pathname === '/' ||
          pathname === '/login' ||
          pathname.startsWith('/auth') ||
          pathname.startsWith('/api/auth') ||
          pathname === '/properties' ||
          pathname.startsWith('/api/properties')
        ) {
          return true;
        }

        // For API routes without a token, let the route handler return JSON 401
        // instead of redirecting to HTML login page
        if (pathname.startsWith('/api/') && !token) {
          return true; // allow through — requireAuth() in route handler will return proper JSON
        }

        return !!token;
      },
    },
  },
);

export const config = {
  matcher: [
    '/admin/:path*',
    '/sales-manager/:path*',
    '/backoffice/:path*',
    '/agent/:path*',
    '/customer/:path*',
    '/dashboard/:path*',
    '/api/leads',
    '/api/leads/:path*',
    '/api/bookings',
    '/api/bookings/:path*',
    '/api/projects',
    '/api/projects/:path*',
    '/api/agents',
    '/api/agents/:path*',
    '/api/customers',
    '/api/customers/:path*',
    '/api/customer/:path*',
    '/api/commissions',
    '/api/commissions/:path*',
    '/api/tasks',
    '/api/tasks/:path*',
    '/api/call-logs',
    '/api/call-logs/:path*',
    '/api/site-visits',
    '/api/site-visits/:path*',
    '/api/notifications',
    '/api/notifications/:path*',
    '/api/wizard',
    '/api/wizard/:path*',
    '/api/automation',
    '/api/automation/:path*',
    '/api/admin/:path*',
  ],
};
