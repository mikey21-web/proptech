import { prisma } from '@/lib/prisma';
import { requireAuth, type UserContext } from '@/lib/auth';
import { unauthorized, forbidden } from '@/lib/api-response';

// ---------------------------------------------------------------------------
// Customer data isolation helper
// ---------------------------------------------------------------------------

/**
 * Resolves the Customer record for the currently authenticated user.
 * A "customer" user is linked via User.email -> Customer.email
 * or via a dedicated lookup table. We match on email within the user's org.
 */
export async function getCustomerForUser(
  user: UserContext,
): Promise<{ id: string; orgId: string } | null> {
  // Find customer record matching this user's email in same org
  const customer = await prisma.customer.findFirst({
    where: {
      orgId: user.orgId,
      email: user.email,
      deletedAt: null,
    },
    select: { id: true, orgId: true },
  });
  return customer;
}

/**
 * Require customer authentication and resolve customer record.
 * Returns customer ID for data-scoped queries.
 */
export async function requireCustomerAuth(): Promise<{
  user: UserContext;
  customerId: string;
  orgId: string;
  error?: ReturnType<typeof unauthorized>;
}> {
  const auth = await requireAuth();
  if (!auth.authorized || !auth.user) {
    return {
      user: null as unknown as UserContext,
      customerId: '',
      orgId: '',
      error: auth.status === 401
        ? unauthorized(auth.error)
        : forbidden(auth.error),
    };
  }

  const customer = await getCustomerForUser(auth.user);
  if (!customer) {
    return {
      user: auth.user,
      customerId: '',
      orgId: auth.user.orgId,
      error: forbidden('No customer profile found for this account'),
    };
  }

  return {
    user: auth.user,
    customerId: customer.id,
    orgId: customer.orgId,
  };
}
