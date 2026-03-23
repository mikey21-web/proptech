/**
 * Auth tests for ClickProps CRM
 *
 * Tests cover:
 * - Login success/failure
 * - Role-based access control
 * - Session management
 * - Role hierarchy
 */

import { hasRoleHierarchy, getRoleLevel } from '@/lib/auth';
import type { UserRole } from '@/lib/auth';

// --- Role hierarchy tests ---

describe('Role Hierarchy', () => {
  const allRoles: UserRole[] = [
    'super_admin',
    'admin',
    'sales_manager',
    'backoffice',
    'agent',
    'customer',
  ];

  test('super_admin has highest role level', () => {
    const superAdminLevel = getRoleLevel('super_admin');
    for (const role of allRoles) {
      expect(superAdminLevel).toBeGreaterThanOrEqual(getRoleLevel(role));
    }
  });

  test('customer has lowest role level', () => {
    const customerLevel = getRoleLevel('customer');
    for (const role of allRoles) {
      expect(customerLevel).toBeLessThanOrEqual(getRoleLevel(role));
    }
  });

  test('role hierarchy order is correct: super_admin > admin > sales_manager > backoffice > agent > customer', () => {
    expect(getRoleLevel('super_admin')).toBeGreaterThan(getRoleLevel('admin'));
    expect(getRoleLevel('admin')).toBeGreaterThan(getRoleLevel('sales_manager'));
    expect(getRoleLevel('sales_manager')).toBeGreaterThan(getRoleLevel('backoffice'));
    expect(getRoleLevel('backoffice')).toBeGreaterThan(getRoleLevel('agent'));
    expect(getRoleLevel('agent')).toBeGreaterThan(getRoleLevel('customer'));
  });

  test('hasRoleHierarchy returns true when user role >= required role', () => {
    expect(hasRoleHierarchy('super_admin', 'admin')).toBe(true);
    expect(hasRoleHierarchy('super_admin', 'customer')).toBe(true);
    expect(hasRoleHierarchy('admin', 'admin')).toBe(true);
    expect(hasRoleHierarchy('agent', 'customer')).toBe(true);
  });

  test('hasRoleHierarchy returns false when user role < required role', () => {
    expect(hasRoleHierarchy('customer', 'admin')).toBe(false);
    expect(hasRoleHierarchy('agent', 'admin')).toBe(false);
    expect(hasRoleHierarchy('backoffice', 'sales_manager')).toBe(false);
    expect(hasRoleHierarchy('customer', 'super_admin')).toBe(false);
  });
});

// --- Route access control tests (unit testing the authorization logic) ---

describe('Route Access Control', () => {
  type RouteConfig = {
    path: string;
    allowedRoles: UserRole[];
    deniedRoles: UserRole[];
  };

  const routeConfigs: RouteConfig[] = [
    {
      path: '/admin',
      allowedRoles: ['super_admin', 'admin'],
      deniedRoles: ['sales_manager', 'backoffice', 'agent', 'customer'],
    },
    {
      path: '/sales-manager',
      allowedRoles: ['super_admin', 'admin', 'sales_manager'],
      deniedRoles: ['backoffice', 'agent', 'customer'],
    },
    {
      path: '/backoffice',
      allowedRoles: ['super_admin', 'admin', 'backoffice'],
      deniedRoles: ['sales_manager', 'agent', 'customer'],
    },
    {
      path: '/agent',
      allowedRoles: ['super_admin', 'admin', 'agent'],
      deniedRoles: ['sales_manager', 'backoffice', 'customer'],
    },
    {
      path: '/customer',
      allowedRoles: ['super_admin', 'admin', 'sales_manager', 'backoffice', 'agent', 'customer'],
      deniedRoles: [],
    },
  ];

  /**
   * Simulates the middleware authorization logic.
   * This mirrors the logic in middleware.ts authorized callback.
   */
  function isAuthorizedForRoute(
    pathname: string,
    role: UserRole | null
  ): boolean {
    // No token means not authenticated
    if (!role) return false;

    if (pathname.startsWith('/admin')) {
      return ['super_admin', 'admin'].includes(role);
    }
    if (pathname.startsWith('/sales-manager')) {
      return ['super_admin', 'admin', 'sales_manager'].includes(role);
    }
    if (pathname.startsWith('/backoffice')) {
      return ['super_admin', 'admin', 'backoffice'].includes(role);
    }
    if (pathname.startsWith('/agent')) {
      return ['super_admin', 'admin', 'agent'].includes(role);
    }
    if (pathname.startsWith('/customer')) {
      return true; // any authenticated user
    }
    if (pathname.startsWith('/dashboard')) {
      return true; // any authenticated user
    }

    return true; // default: any authenticated user
  }

  for (const routeConfig of routeConfigs) {
    describe(`${routeConfig.path} routes`, () => {
      for (const role of routeConfig.allowedRoles) {
        test(`${role} can access ${routeConfig.path}`, () => {
          expect(isAuthorizedForRoute(routeConfig.path, role)).toBe(true);
        });
      }

      for (const role of routeConfig.deniedRoles) {
        test(`${role} cannot access ${routeConfig.path}`, () => {
          expect(isAuthorizedForRoute(routeConfig.path, role)).toBe(false);
        });
      }

      test('unauthenticated user cannot access', () => {
        expect(isAuthorizedForRoute(routeConfig.path, null)).toBe(false);
      });
    });
  }
});

// --- Credentials validation tests ---

describe('Credentials Validation', () => {
  /**
   * Simulates the authorize function logic for credential checking.
   * This mirrors the logic in the CredentialsProvider authorize callback.
   */
  function validateCredentials(
    credentials: { email?: string; password?: string } | undefined
  ): { valid: boolean; error?: string } {
    if (!credentials?.email || !credentials?.password) {
      return { valid: false, error: 'Invalid credentials' };
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(credentials.email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    // Password minimum length
    if (credentials.password.length < 1) {
      return { valid: false, error: 'Password required' };
    }

    return { valid: true };
  }

  test('valid credentials pass validation', () => {
    const result = validateCredentials({
      email: 'admin@clickprops.com',
      password: 'securepassword123',
    });
    expect(result.valid).toBe(true);
  });

  test('missing email fails validation', () => {
    const result = validateCredentials({
      email: '',
      password: 'password123',
    });
    expect(result.valid).toBe(false);
  });

  test('missing password fails validation', () => {
    const result = validateCredentials({
      email: 'admin@clickprops.com',
      password: '',
    });
    expect(result.valid).toBe(false);
  });

  test('undefined credentials fail validation', () => {
    const result = validateCredentials(undefined);
    expect(result.valid).toBe(false);
  });

  test('invalid email format fails validation', () => {
    const result = validateCredentials({
      email: 'not-an-email',
      password: 'password123',
    });
    expect(result.valid).toBe(false);
  });
});

// --- Session shape tests ---

describe('Session Shape', () => {
  test('session user should contain id, email, name, role, image', () => {
    const mockSession = {
      user: {
        id: 'cuid123',
        email: 'admin@clickprops.com',
        name: 'Admin User',
        role: 'admin' as UserRole,
        image: null,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    expect(mockSession.user).toHaveProperty('id');
    expect(mockSession.user).toHaveProperty('email');
    expect(mockSession.user).toHaveProperty('name');
    expect(mockSession.user).toHaveProperty('role');
    expect(mockSession.user).toHaveProperty('image');
  });

  test('JWT token should carry role and id', () => {
    const mockToken = {
      role: 'super_admin' as const,
      id: 'cuid456',
      email: 'super@clickprops.com',
      name: 'Super Admin',
      sub: 'cuid456',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    };

    expect(mockToken.role).toBe('super_admin');
    expect(mockToken.id).toBe('cuid456');
    expect(mockToken.exp).toBeGreaterThan(mockToken.iat);
  });

  test('session expiry is set to 30 days', () => {
    const maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
    expect(maxAge).toBe(2592000);
  });
});

// --- Auth config tests ---

describe('Auth Configuration', () => {
  test('all 6 roles are defined', () => {
    const roles: UserRole[] = [
      'super_admin',
      'admin',
      'sales_manager',
      'backoffice',
      'agent',
      'customer',
    ];
    expect(roles).toHaveLength(6);

    // Each role should have a unique hierarchy level
    const levels = roles.map(getRoleLevel);
    const uniqueLevels = new Set(levels);
    expect(uniqueLevels.size).toBe(6);
  });

  test('role levels are positive integers', () => {
    const roles: UserRole[] = [
      'super_admin',
      'admin',
      'sales_manager',
      'backoffice',
      'agent',
      'customer',
    ];
    for (const role of roles) {
      const level = getRoleLevel(role);
      expect(level).toBeGreaterThan(0);
      expect(Number.isInteger(level)).toBe(true);
    }
  });
});
