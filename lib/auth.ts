import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import type { Session } from 'next-auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'sales_manager'
  | 'backoffice'
  | 'agent'
  | 'customer';

export interface UserContext {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  orgId: string;
  image: string | null;
}

export interface AuthSession extends Session {
  user: UserContext;
}

// ---------------------------------------------------------------------------
// Role hierarchy — higher number = more authority
// ---------------------------------------------------------------------------

const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 6,
  admin: 5,
  sales_manager: 4,
  backoffice: 3,
  agent: 2,
  customer: 1,
};

// ---------------------------------------------------------------------------
// Server helpers
// ---------------------------------------------------------------------------

/** Get the authenticated session on the server (RSC / API routes). */
export async function getAuth(): Promise<AuthSession | null> {
  return getServerSession(authOptions) as Promise<AuthSession | null>;
}

/** Get the authenticated user or null. */
export async function getCurrentUser(): Promise<UserContext | null> {
  const session = await getAuth();
  return session?.user ?? null;
}

// ---------------------------------------------------------------------------
// Role checks
// ---------------------------------------------------------------------------

/** Does the current user hold (at least) one of the given roles? */
export async function hasRole(
  requiredRole: UserRole | UserRole[],
): Promise<boolean> {
  const session = await getAuth();
  if (!session?.user) return false;
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(session.user.role);
}

/** Alias — same semantics, different name for readability. */
export async function hasPermission(roles: UserRole[]): Promise<boolean> {
  return hasRole(roles);
}

/** Is the user's role at least as high as `requiredRole` in the hierarchy? */
export function hasRoleHierarchy(
  userRole: UserRole,
  requiredRole: UserRole,
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/** Numeric level — useful for comparisons. */
export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY[role];
}

// ---------------------------------------------------------------------------
// Convenience predicates
// ---------------------------------------------------------------------------

export function isAdmin(role: UserRole): boolean {
  return hasRoleHierarchy(role, 'admin');
}

export function isSalesManager(role: UserRole): boolean {
  return hasRoleHierarchy(role, 'sales_manager');
}

export function isBackoffice(role: UserRole): boolean {
  return role === 'backoffice' || isAdmin(role);
}

export function isAgent(role: UserRole): boolean {
  return role === 'agent' || isAdmin(role);
}

export function isCustomer(role: UserRole): boolean {
  // Everyone authenticated is at least customer-level
  return true;
}

// ---------------------------------------------------------------------------
// RBAC helper for API routes
// ---------------------------------------------------------------------------

export interface RBACResult {
  authorized: boolean;
  user: UserContext | null;
  error?: string;
  status?: number;
}

/**
 * Require that the caller has one of `allowedRoles`.
 * Returns the user context on success, or an error payload on failure.
 */
export async function requireAuth(
  allowedRoles?: UserRole[],
): Promise<RBACResult> {
  const session = await getAuth();

  if (!session?.user) {
    return {
      authorized: false,
      user: null,
      error: 'Authentication required',
      status: 401,
    };
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    return {
      authorized: false,
      user: session.user,
      error: 'Insufficient permissions',
      status: 403,
    };
  }

  return { authorized: true, user: session.user };
}
