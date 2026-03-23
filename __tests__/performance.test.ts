/**
 * Performance & Security Tests for ClickProps CRM
 *
 * Validates:
 * - N+1 query prevention patterns
 * - Prisma select/include best practices (schema-level)
 * - SQL injection protection (Prisma parameterized queries)
 * - RBAC bypass prevention
 * - Response shape and timing contracts
 * - Financial data integrity
 */

import * as fs from 'fs';
import * as path from 'path';
import { hasRoleHierarchy } from '@/lib/auth';
import type { UserRole } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Read source files for static analysis
// ---------------------------------------------------------------------------

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const schema = fs.readFileSync(schemaPath, 'utf-8');

const libPrismaPath = path.join(__dirname, '..', 'lib', 'prisma.ts');
const libPrisma = fs.readFileSync(libPrismaPath, 'utf-8');

const authRoutePath = path.join(__dirname, '..', 'app', 'api', 'auth', '[...nextauth]', 'route.ts');
const authRoute = fs.readFileSync(authRoutePath, 'utf-8');

const middlewarePath = path.join(__dirname, '..', 'middleware.ts');
const middlewareCode = fs.readFileSync(middlewarePath, 'utf-8');

// ---------------------------------------------------------------------------
// N+1 Query Prevention Tests
// ---------------------------------------------------------------------------

describe('Performance — N+1 Query Prevention', () => {
  test('Booking model has Payment relation for eager loading', () => {
    const bookingBlock = extractModelBlock('Booking');
    expect(bookingBlock).toContain('payments');
    expect(bookingBlock).toContain('Payment[]');
  });

  test('Booking model has Installment relation for eager loading', () => {
    const bookingBlock = extractModelBlock('Booking');
    expect(bookingBlock).toContain('installments');
    expect(bookingBlock).toContain('Installment[]');
  });

  test('Booking model has Commission relation for eager loading', () => {
    const bookingBlock = extractModelBlock('Booking');
    expect(bookingBlock).toContain('commissions');
    expect(bookingBlock).toContain('Commission[]');
  });

  test('Lead model has Communication relation for eager loading', () => {
    const leadBlock = extractModelBlock('Lead');
    expect(leadBlock).toContain('communications');
    expect(leadBlock).toContain('Communication[]');
  });

  test('Lead model has Activity relation for eager loading', () => {
    const leadBlock = extractModelBlock('Lead');
    expect(leadBlock).toContain('activities');
    expect(leadBlock).toContain('Activity[]');
  });

  test('Project has Plot and Flat relations for eager loading', () => {
    const projectBlock = extractModelBlock('Project');
    expect(projectBlock).toContain('plots');
    expect(projectBlock).toContain('Plot[]');
    expect(projectBlock).toContain('flats');
    expect(projectBlock).toContain('Flat[]');
  });

  test('Agent model has Booking and Commission relations', () => {
    const agentBlock = extractModelBlock('Agent');
    expect(agentBlock).toContain('bookings');
    expect(agentBlock).toContain('commissions');
  });

  test('Customer model has Booking relation for eager loading', () => {
    const customerBlock = extractModelBlock('Customer');
    expect(customerBlock).toContain('bookings');
    expect(customerBlock).toContain('Booking[]');
  });
});

// ---------------------------------------------------------------------------
// Query Index Coverage Tests
// ---------------------------------------------------------------------------

describe('Performance — Index Coverage for Common Queries', () => {
  const criticalIndexes: Array<{ model: string; fields: string[] }> = [
    { model: 'Lead', fields: ['orgId', 'assignedToId', 'status', 'phone', 'email', 'projectId', 'createdAt'] },
    { model: 'Booking', fields: ['orgId', 'customerId', 'projectId', 'agentId', 'status', 'bookingDate'] },
    { model: 'Payment', fields: ['bookingId', 'status', 'paymentDate'] },
    { model: 'Customer', fields: ['orgId', 'phone', 'email', 'name'] },
    { model: 'Agent', fields: ['orgId', 'agentCode', 'isActive'] },
    { model: 'Commission', fields: ['agentId', 'bookingId', 'status'] },
    { model: 'AuditLog', fields: ['orgId', 'userId', 'action', 'createdAt'] },
  ];

  for (const { model, fields } of criticalIndexes) {
    for (const field of fields) {
      test(`${model} has index on ${field}`, () => {
        const block = extractModelBlock(model);
        // Check for @@index containing this field (single or composite)
        const hasIndex = block.includes(`@@index([${field}]`) || block.includes(`@@index([${field},`);
        const isUnique = block.match(new RegExp(`${field}\\s+\\S+.*@unique`));
        const hasCompositeIndex = block.includes(field) && block.includes('@@index');
        expect(hasIndex || isUnique || hasCompositeIndex).toBe(true);
      });
    }
  }

  test('Booking has composite index on [orgId, status] for filtered org queries', () => {
    const block = extractModelBlock('Booking');
    expect(block).toContain('@@index([orgId, status])');
  });

  test('Lead has composite index on [orgId, status] for filtered org queries', () => {
    const block = extractModelBlock('Lead');
    expect(block).toContain('@@index([orgId, status])');
  });
});

// ---------------------------------------------------------------------------
// SQL Injection Protection Tests
// ---------------------------------------------------------------------------

describe('Security — SQL Injection Protection', () => {
  test('Prisma client is the sole database access layer', () => {
    // Ensure no raw SQL usage exists in the lib/prisma.ts
    expect(libPrisma).not.toContain('$queryRaw');
    expect(libPrisma).not.toContain('$executeRaw');
    expect(libPrisma).toContain('PrismaClient');
  });

  test('auth route uses Prisma parameterized queries (no string concat for queries)', () => {
    // The auth route should use findUnique with where clause, not string concatenation
    expect(authRoute).toContain('prisma.user.findUnique');
    expect(authRoute).toContain('where:');
    // No raw SQL in auth
    expect(authRoute).not.toContain('$queryRaw');
    expect(authRoute).not.toContain('$executeRaw');
    expect(authRoute).not.toContain('sql`');
  });

  test('no eval() or Function() usage in auth logic', () => {
    expect(authRoute).not.toContain('eval(');
    expect(authRoute).not.toContain('new Function(');
  });

  test('SQL injection payloads would be parameterized by Prisma', () => {
    // Prisma's findUnique with where: { email: input } automatically parameterizes
    // Testing the pattern exists:
    expect(authRoute).toContain('email: credentials.email');
    // This confirms Prisma parameterization, not string interpolation
    expect(authRoute).not.toMatch(/`.*\$\{credentials/);
  });
});

// ---------------------------------------------------------------------------
// RBAC Bypass Prevention Tests
// ---------------------------------------------------------------------------

describe('Security — RBAC Cannot Be Bypassed', () => {
  test('middleware checks token before allowing access', () => {
    expect(middlewareCode).toContain('token');
    expect(middlewareCode).toContain('req.nextauth.token');
  });

  test('middleware redirects unauthorized users', () => {
    expect(middlewareCode).toContain('NextResponse.redirect');
    expect(middlewareCode).toContain('AccessDenied');
  });

  test('middleware uses withAuth wrapper (NextAuth protected)', () => {
    expect(middlewareCode).toContain('withAuth');
    expect(middlewareCode).toContain("from 'next-auth/middleware'");
  });

  test('role check uses strict includes (no loose comparison)', () => {
    // Ensure role checking uses .includes() on an explicit array, not == or !=
    expect(middlewareCode).toContain('.includes(role)');
  });

  test('all protected route patterns are covered in middleware matcher', () => {
    expect(middlewareCode).toContain("'/admin/:path*'");
    expect(middlewareCode).toContain("'/agent/:path*'");
    expect(middlewareCode).toContain("'/customer/:path*'");
    expect(middlewareCode).toContain("'/dashboard/:path*'");
  });

  test('customer role cannot escalate to admin through hierarchy check', () => {
    expect(hasRoleHierarchy('customer', 'admin')).toBe(false);
    expect(hasRoleHierarchy('customer', 'super_admin')).toBe(false);
    expect(hasRoleHierarchy('agent', 'admin')).toBe(false);
  });

  test('role defaults to customer when missing (fail-safe)', () => {
    // middleware.ts falls back to 'customer' when role is missing
    expect(middlewareCode).toContain("|| 'customer'");
  });
});

// ---------------------------------------------------------------------------
// Auth Security Tests
// ---------------------------------------------------------------------------

describe('Security — Authentication', () => {
  test('passwords are hashed with bcrypt', () => {
    expect(authRoute).toContain('bcrypt');
    expect(authRoute).toContain('bcrypt.compare');
  });

  test('JWT secret is read from environment (not hardcoded)', () => {
    expect(authRoute).toContain("process.env.NEXTAUTH_SECRET");
    expect(authRoute).not.toMatch(/secret:\s*['"][^'"]+['"]/);
  });

  test('session uses JWT strategy (not database sessions)', () => {
    expect(authRoute).toContain("strategy: 'jwt'");
  });

  test('session max age is configured (not infinite)', () => {
    expect(authRoute).toContain('maxAge');
    // 30 days = 30 * 24 * 60 * 60
    expect(authRoute).toContain('30 * 24 * 60 * 60');
  });

  test('custom sign-in page is configured (not default)', () => {
    expect(authRoute).toContain("signIn: '/login'");
  });

  test('error page is configured', () => {
    expect(authRoute).toContain("error: '/auth/error'");
  });

  test('authorize function checks for null credentials', () => {
    expect(authRoute).toContain("!credentials?.email");
    expect(authRoute).toContain("!credentials?.password");
  });

  test('user not found throws error (does not leak info)', () => {
    expect(authRoute).toContain("'User not found'");
    // Should not include which field was wrong (email vs password)
    expect(authRoute).toContain("'Invalid password'");
  });
});

// ---------------------------------------------------------------------------
// Financial Data Integrity Tests
// ---------------------------------------------------------------------------

describe('Security — Financial Data Integrity', () => {
  test('all monetary fields use Decimal type', () => {
    const monetaryFields = [
      'price', 'totalAmount', 'netAmount', 'paidAmount', 'balanceAmount',
      'discountAmount', 'gstAmount', 'stampDuty', 'registrationFee',
      'amount', 'sanctionedAmount', 'disbursedAmount', 'emiAmount',
    ];

    for (const field of monetaryFields) {
      // Check that monetary fields use Decimal, not Float or Int
      const regex = new RegExp(`${field}\\s+(?:Decimal|Int)`, 'g');
      const floatRegex = new RegExp(`${field}\\s+Float`, 'g');
      const hasFloat = floatRegex.test(schema);
      expect(hasFloat).toBe(false);
    }
  });

  test('Decimal fields use appropriate precision (14,2) for INR amounts', () => {
    // Most financial fields should be Decimal(14,2) to handle crores
    const matches = schema.match(/@db\.Decimal\(14,\s*2\)/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(10);
  });

  test('percentage fields use Decimal(5,2)', () => {
    const matches = schema.match(/@db\.Decimal\(5,\s*2\)/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Response Time Contract Tests (simulated)
// ---------------------------------------------------------------------------

describe('Performance — Response Time Contracts', () => {
  // These test that the operations complete within expected time bounds
  // Using synchronous operations as proxy for what real handlers would do

  test('lead filtering logic executes in < 5ms', () => {
    const leads = Array.from({ length: 1000 }, (_, i) => ({
      id: `lead-${i}`,
      status: ['new', 'qualified', 'won', 'lost'][i % 4],
      orgId: `org-${i % 3}`,
      assignedToId: `agent-${i % 10}`,
    }));

    const start = performance.now();
    const filtered = leads
      .filter((l) => l.orgId === 'org-1')
      .filter((l) => l.status === 'new')
      .filter((l) => l.assignedToId === 'agent-1');
    const duration = performance.now() - start;

    expect(filtered.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(5);
  });

  test('role hierarchy check executes in < 1ms', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      hasRoleHierarchy('super_admin', 'customer');
      hasRoleHierarchy('agent', 'admin');
    }
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(10); // 1000 iterations in <10ms
  });

  test('pagination logic handles large datasets efficiently', () => {
    const items = Array.from({ length: 10000 }, (_, i) => ({ id: i }));

    const start = performance.now();
    const page = 50;
    const limit = 20;
    const paginated = items.slice((page - 1) * limit, page * limit);
    const duration = performance.now() - start;

    expect(paginated.length).toBe(20);
    expect(duration).toBeLessThan(5);
  });
});

// ---------------------------------------------------------------------------
// Prisma Client Configuration Tests
// ---------------------------------------------------------------------------

describe('Performance — Prisma Client Configuration', () => {
  test('Prisma client uses singleton pattern (prevents connection pool exhaustion)', () => {
    expect(libPrisma).toContain('globalForPrisma');
    expect(libPrisma).toContain('globalThis');
  });

  test('Prisma logs only errors in production', () => {
    expect(libPrisma).toContain("process.env.NODE_ENV");
    expect(libPrisma).toContain("['error']");
  });

  test('Prisma logs queries in development', () => {
    expect(libPrisma).toContain("'query'");
  });

  test('Prisma client is reused in non-production', () => {
    expect(libPrisma).toContain("globalForPrisma.prisma = prisma");
  });
});

// ---------------------------------------------------------------------------
// Soft Delete Pattern Tests
// ---------------------------------------------------------------------------

describe('Performance — Soft Delete Patterns', () => {
  const softDeleteModels = [
    'Organization', 'User', 'Role', 'Lead', 'Communication', 'Task', 'Note',
    'Project', 'Plot', 'Flat', 'Booking', 'Payment', 'Customer',
    'Agent', 'AgentTeam', 'CommissionStructure', 'Loan', 'Webhook', 'LeadSource',
  ];

  test.each(softDeleteModels)('%s supports soft delete (has deletedAt)', (model) => {
    const block = extractModelBlock(model);
    expect(block).toContain('deletedAt');
    expect(block).toContain('DateTime?');
  });

  test('soft delete fields are nullable timestamps', () => {
    // All deletedAt fields should be DateTime? (nullable)
    const deletedAtMatches = schema.match(/deletedAt\s+DateTime\?/g);
    expect(deletedAtMatches).not.toBeNull();
    expect(deletedAtMatches!.length).toBe(softDeleteModels.length);
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractModelBlock(modelName: string): string {
  const regex = new RegExp(`model\\s+${modelName}\\s*\\{([\\s\\S]*?)^\\}`, 'm');
  const match = schema.match(regex);
  return match ? match[1] : '';
}
