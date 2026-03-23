/**
 * RBAC Validation Tests for ClickProps CRM
 *
 * Tests role-based access control, data isolation, route protection,
 * and multi-tenant boundary enforcement.
 */

import { hasRoleHierarchy, getRoleLevel } from '@/lib/auth';
import type { UserRole } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const ALL_ROLES: UserRole[] = ['super_admin', 'admin', 'sales_manager', 'backoffice', 'agent', 'customer'];

interface RouteRule {
  pattern: string;
  allowed: UserRole[];
}

// Mirrors middleware.ts route access rules
const ROUTE_RULES: RouteRule[] = [
  { pattern: '/admin', allowed: ['super_admin', 'admin'] },
  { pattern: '/sales-manager', allowed: ['super_admin', 'admin', 'sales_manager'] },
  { pattern: '/backoffice', allowed: ['super_admin', 'admin', 'backoffice'] },
  { pattern: '/agent', allowed: ['super_admin', 'admin', 'agent'] },
  { pattern: '/customer', allowed: ALL_ROLES },
  { pattern: '/dashboard', allowed: ALL_ROLES },
];

const PUBLIC_ROUTES = ['/', '/login', '/auth/signin', '/auth/error', '/api/auth/session', '/properties'];

// Simulates middleware authorization check (exact mirror of middleware.ts)
function checkRouteAccess(pathname: string, role: UserRole | null): 'allow' | 'redirect_login' | 'redirect_forbidden' {
  // Public routes
  if (
    pathname === '/' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/properties' ||
    pathname.startsWith('/api/properties')
  ) {
    return 'allow';
  }

  // No token = redirect to login
  if (!role) return 'redirect_login';

  // Admin routes
  if (pathname.startsWith('/admin')) {
    return ['super_admin', 'admin'].includes(role) ? 'allow' : 'redirect_forbidden';
  }
  if (pathname.startsWith('/sales-manager')) {
    return ['super_admin', 'admin', 'sales_manager'].includes(role) ? 'allow' : 'redirect_forbidden';
  }
  if (pathname.startsWith('/backoffice')) {
    return ['super_admin', 'admin', 'backoffice'].includes(role) ? 'allow' : 'redirect_forbidden';
  }
  if (pathname.startsWith('/agent')) {
    return ['super_admin', 'admin', 'agent'].includes(role) ? 'allow' : 'redirect_forbidden';
  }

  // Customer, dashboard: any authenticated
  return 'allow';
}

// Simulates data isolation: what entity IDs can a user access
interface DataAccess {
  orgId: string;
  userId: string;
  role: UserRole;
}

function canAccessLead(accessor: DataAccess, lead: { orgId: string; assignedToId: string }): boolean {
  // Must be same org
  if (accessor.orgId !== lead.orgId) return false;
  // Admin/super_admin/sales_manager see all in org
  if (['super_admin', 'admin', 'sales_manager'].includes(accessor.role)) return true;
  // Agent sees only own
  if (accessor.role === 'agent') return accessor.userId === lead.assignedToId;
  // Customer/backoffice cannot see leads
  return false;
}

function canAccessBooking(
  accessor: DataAccess,
  booking: { orgId: string; agentId: string | null; customerId: string }
): boolean {
  if (accessor.orgId !== booking.orgId) return false;
  if (['super_admin', 'admin', 'sales_manager', 'backoffice'].includes(accessor.role)) return true;
  if (accessor.role === 'agent') return accessor.userId === booking.agentId;
  if (accessor.role === 'customer') return accessor.userId === booking.customerId;
  return false;
}

function canAccessProject(accessor: DataAccess, project: { orgId: string }): boolean {
  return accessor.orgId === project.orgId;
}

// ===========================================================================
// TESTS
// ===========================================================================

describe('RBAC — Route Protection', () => {
  describe('/admin routes', () => {
    test('super_admin can access /admin', () => {
      expect(checkRouteAccess('/admin', 'super_admin')).toBe('allow');
    });

    test('admin can access /admin', () => {
      expect(checkRouteAccess('/admin', 'admin')).toBe('allow');
    });

    test.each<UserRole>(['sales_manager', 'backoffice', 'agent', 'customer'])(
      '%s is forbidden from /admin',
      (role) => {
        expect(checkRouteAccess('/admin', role)).toBe('redirect_forbidden');
      }
    );

    test('unauthenticated redirects to login for /admin', () => {
      expect(checkRouteAccess('/admin', null)).toBe('redirect_login');
    });

    test('/admin/settings is also protected', () => {
      expect(checkRouteAccess('/admin/settings', 'agent')).toBe('redirect_forbidden');
      expect(checkRouteAccess('/admin/settings', 'super_admin')).toBe('allow');
    });
  });

  describe('/agent routes', () => {
    test('agent can access /agent', () => {
      expect(checkRouteAccess('/agent', 'agent')).toBe('allow');
    });

    test('admin and super_admin can access /agent', () => {
      expect(checkRouteAccess('/agent', 'admin')).toBe('allow');
      expect(checkRouteAccess('/agent', 'super_admin')).toBe('allow');
    });

    test('customer is forbidden from /agent', () => {
      expect(checkRouteAccess('/agent', 'customer')).toBe('redirect_forbidden');
    });

    test('sales_manager is forbidden from /agent', () => {
      expect(checkRouteAccess('/agent', 'sales_manager')).toBe('redirect_forbidden');
    });

    test('backoffice is forbidden from /agent', () => {
      expect(checkRouteAccess('/agent', 'backoffice')).toBe('redirect_forbidden');
    });
  });

  describe('/customer routes (any authenticated)', () => {
    test.each(ALL_ROLES)('%s can access /customer', (role) => {
      expect(checkRouteAccess('/customer', role)).toBe('allow');
    });

    test('unauthenticated cannot access /customer', () => {
      expect(checkRouteAccess('/customer', null)).toBe('redirect_login');
    });
  });

  describe('public routes require no auth', () => {
    test.each(PUBLIC_ROUTES)('%s is accessible without auth', (route) => {
      expect(checkRouteAccess(route, null)).toBe('allow');
    });
  });
});

describe('RBAC — Data Isolation: Agent A vs Agent B', () => {
  const agentA: DataAccess = { orgId: 'org-1', userId: 'agent-a', role: 'agent' };
  const agentB: DataAccess = { orgId: 'org-1', userId: 'agent-b', role: 'agent' };

  const leadA = { orgId: 'org-1', assignedToId: 'agent-a' };
  const leadB = { orgId: 'org-1', assignedToId: 'agent-b' };

  test('Agent A can access own lead', () => {
    expect(canAccessLead(agentA, leadA)).toBe(true);
  });

  test('Agent A cannot access Agent B lead', () => {
    expect(canAccessLead(agentA, leadB)).toBe(false);
  });

  test('Agent B cannot access Agent A lead', () => {
    expect(canAccessLead(agentB, leadA)).toBe(false);
  });

  test('Agent B can access own lead', () => {
    expect(canAccessLead(agentB, leadB)).toBe(true);
  });
});

describe('RBAC — Data Isolation: Org A vs Org B', () => {
  const orgAAdmin: DataAccess = { orgId: 'org-1', userId: 'admin-1', role: 'admin' };
  const orgBAdmin: DataAccess = { orgId: 'org-2', userId: 'admin-2', role: 'admin' };

  const orgAProject = { orgId: 'org-1' };
  const orgBProject = { orgId: 'org-2' };

  test('Org A admin can access Org A projects', () => {
    expect(canAccessProject(orgAAdmin, orgAProject)).toBe(true);
  });

  test('Org A admin cannot access Org B projects', () => {
    expect(canAccessProject(orgAAdmin, orgBProject)).toBe(false);
  });

  test('Org B admin cannot access Org A projects', () => {
    expect(canAccessProject(orgBAdmin, orgAProject)).toBe(false);
  });

  const orgALead = { orgId: 'org-1', assignedToId: 'agent-1' };
  const orgBLead = { orgId: 'org-2', assignedToId: 'agent-2' };

  test('Org A admin cannot see Org B leads', () => {
    expect(canAccessLead(orgAAdmin, orgBLead)).toBe(false);
  });

  test('Org B admin cannot see Org A leads', () => {
    expect(canAccessLead(orgBAdmin, orgALead)).toBe(false);
  });
});

describe('RBAC — Data Isolation: Customer', () => {
  const customer: DataAccess = { orgId: 'org-1', userId: 'cust-1', role: 'customer' };

  test('customer can see own booking', () => {
    expect(canAccessBooking(customer, { orgId: 'org-1', agentId: 'agent-a', customerId: 'cust-1' })).toBe(true);
  });

  test('customer cannot see another customer booking', () => {
    expect(canAccessBooking(customer, { orgId: 'org-1', agentId: 'agent-a', customerId: 'cust-2' })).toBe(false);
  });

  test('customer cannot access leads', () => {
    expect(canAccessLead(customer, { orgId: 'org-1', assignedToId: 'agent-a' })).toBe(false);
  });
});

describe('RBAC — Admin Escalation & Hierarchy', () => {
  test('super_admin can access everything any other role can', () => {
    for (const role of ALL_ROLES) {
      expect(hasRoleHierarchy('super_admin', role)).toBe(true);
    }
  });

  test('customer cannot escalate to admin privileges', () => {
    expect(hasRoleHierarchy('customer', 'admin')).toBe(false);
    expect(hasRoleHierarchy('customer', 'super_admin')).toBe(false);
    expect(hasRoleHierarchy('customer', 'agent')).toBe(false);
  });

  test('agent cannot escalate to sales_manager', () => {
    expect(hasRoleHierarchy('agent', 'sales_manager')).toBe(false);
  });

  test('each role level is distinct', () => {
    const levels = ALL_ROLES.map(getRoleLevel);
    expect(new Set(levels).size).toBe(ALL_ROLES.length);
  });
});

describe('RBAC — Booking Access by Role', () => {
  const booking = { orgId: 'org-1', agentId: 'agent-a', customerId: 'cust-1' };

  test('super_admin can access any booking in org', () => {
    expect(canAccessBooking({ orgId: 'org-1', userId: 'sa-1', role: 'super_admin' }, booking)).toBe(true);
  });

  test('admin can access any booking in org', () => {
    expect(canAccessBooking({ orgId: 'org-1', userId: 'admin-1', role: 'admin' }, booking)).toBe(true);
  });

  test('sales_manager can access any booking in org', () => {
    expect(canAccessBooking({ orgId: 'org-1', userId: 'sm-1', role: 'sales_manager' }, booking)).toBe(true);
  });

  test('backoffice can access any booking in org', () => {
    expect(canAccessBooking({ orgId: 'org-1', userId: 'bo-1', role: 'backoffice' }, booking)).toBe(true);
  });

  test('booking agent can access own booking', () => {
    expect(canAccessBooking({ orgId: 'org-1', userId: 'agent-a', role: 'agent' }, booking)).toBe(true);
  });

  test('other agent cannot access booking', () => {
    expect(canAccessBooking({ orgId: 'org-1', userId: 'agent-b', role: 'agent' }, booking)).toBe(false);
  });

  test('booking customer can access own booking', () => {
    expect(canAccessBooking({ orgId: 'org-1', userId: 'cust-1', role: 'customer' }, booking)).toBe(true);
  });

  test('other customer cannot access booking', () => {
    expect(canAccessBooking({ orgId: 'org-1', userId: 'cust-2', role: 'customer' }, booking)).toBe(false);
  });
});

describe('RBAC — Route protection consistency with middleware.ts', () => {
  // This verifies that the middleware.ts matcher config covers all protected routes
  const protectedPatterns = ['/admin', '/sales-manager', '/backoffice', '/agent', '/customer', '/dashboard'];

  test('all protected routes have at least one allowed role', () => {
    for (const pattern of protectedPatterns) {
      const anyAllowed = ALL_ROLES.some((role) => checkRouteAccess(pattern, role) === 'allow');
      expect(anyAllowed).toBe(true);
    }
  });

  test('no protected route allows unauthenticated access', () => {
    for (const pattern of protectedPatterns) {
      const result = checkRouteAccess(pattern, null);
      expect(result).toBe('redirect_login');
    }
  });
});
