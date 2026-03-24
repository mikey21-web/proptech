export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  ok,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from '@/lib/api-response';
import { updateCustomerSchema } from '@/lib/validations/customers';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Single Customer API
 *
 * Per DEBUG.md Section 8: Customer Portal
 * - Comprehensive customer profile with documents, contacts, bookings
 * - Agents can only access customers from their leads/bookings
 * - Document verification workflow
 */

// ---------------------------------------------------------------------------
// GET /api/customers/[id] — Get single customer
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth([
      'super_admin',
      'admin',
      'sales_manager',
      'backoffice',
      'agent',
    ]);
    if (!auth.authorized) {
      return auth.status === 401
        ? unauthorized(auth.error)
        : forbidden(auth.error);
    }
    const user = auth.user!;
    const { id } = await context.params;

    // Build WHERE clause for customer access
    let customerWhere: any = {
      id,
      orgId: user.orgId,
      deletedAt: null,
    };

    // Agent-level: can only access customers from their assigned leads or bookings
    if (user.role === 'agent') {
      customerWhere = {
        ...customerWhere,
        OR: [
          // Customers from leads assigned to this agent
          { leads: { some: { assignedToId: user.id, deletedAt: null } } },
          // Customers from bookings handled by this agent
          { bookings: { some: { agentId: user.id, deletedAt: null } } },
        ],
      };
    }

    const customer = await prisma.customer.findFirst({
      where: customerWhere,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        altPhone: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        dateOfBirth: true,
        panNumber: true,
        aadhaarNumber: true,
        gstNumber: true,
        occupation: true,
        companyName: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        contacts: {
          select: {
            id: true,
            name: true,
            relation: true,
            phone: true,
            email: true,
            isPrimary: true,
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        },
        documents: {
          select: {
            id: true,
            type: true,
            documentNo: true,
            fileName: true,
            fileSize: true,
            isVerified: true,
            verifiedAt: true,
            expiryDate: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        bookings: {
          where: { deletedAt: null },
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            totalAmount: true,
            paidAmount: true,
            project: { select: { id: true, name: true } },
            plot: { select: { id: true, plotNumber: true } },
            flat: { select: { id: true, flatNumber: true } },
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        leads: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            status: true,
            priority: true,
            assignedTo: { select: { id: true, name: true } },
            project: { select: { id: true, name: true } },
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        loans: {
          where: { deletedAt: null },
          select: {
            id: true,
            sanctionedAmount: true,
            status: true,
            bankName: true,
            sanctionDate: true,
            disbursementDate: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      return notFound('Customer not found');
    }

    // Calculate summary stats
    const totalBookings = customer.bookings.length;
    const totalPaid = customer.bookings.reduce((sum, b) => sum + Number(b.paidAmount || 0), 0);
    const totalOutstanding = customer.bookings.reduce(
      (sum, b) => sum + (Number(b.totalAmount || 0) - Number(b.paidAmount || 0)),
      0
    );

    const verifiedDocuments = customer.documents.filter((d) => d.isVerified).length;
    const pendingDocuments = customer.documents.filter((d) => !d.isVerified).length;

    return ok({
      customer,
      summary: {
        totalBookings,
        totalValue: customer.bookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0),
        totalPaid,
        totalOutstanding,
        documentsVerified: verifiedDocuments,
        documentsPending: pendingDocuments,
        activeLoans: customer.loans.filter((l) => ['sanctioned', 'disbursed'].includes(l.status)).length,
      },
    });
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/customers/[id] — Update customer
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth([
      'super_admin',
      'admin',
      'sales_manager',
      'backoffice',
      'agent',
    ]);
    if (!auth.authorized) {
      return auth.status === 401
        ? unauthorized(auth.error)
        : forbidden(auth.error);
    }
    const user = auth.user!;
    const { id } = await context.params;

    const body = await req.json();
    const parsed = updateCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    // Build WHERE clause for customer access
    let customerWhere: any = {
      id,
      orgId: user.orgId,
      deletedAt: null,
    };

    // Agent-level: can only update customers from their assigned leads or bookings
    if (user.role === 'agent') {
      customerWhere = {
        ...customerWhere,
        OR: [
          { leads: { some: { assignedToId: user.id, deletedAt: null } } },
          { bookings: { some: { agentId: user.id, deletedAt: null } } },
        ],
      };
    }

    // Verify customer exists and is accessible
    const existingCustomer = await prisma.customer.findFirst({
      where: customerWhere,
      select: { id: true },
    });

    if (!existingCustomer) {
      return notFound('Customer not found');
    }

    const data = parsed.data;

    // Check for duplicate phone within org (if phone is being updated)
    if (data.phone) {
      const duplicatePhone = await prisma.customer.findFirst({
        where: {
          phone: data.phone,
          orgId: user.orgId,
          id: { not: id },
          deletedAt: null,
        },
        select: { id: true },
      });
      if (duplicatePhone) {
        return badRequest('Phone number already exists for another customer');
      }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.altPhone !== undefined && { altPhone: data.altPhone }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.pincode !== undefined && { pincode: data.pincode }),
        ...(data.dateOfBirth !== undefined && {
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        }),
        ...(data.panNumber !== undefined && { panNumber: data.panNumber }),
        ...(data.aadhaarNumber !== undefined && { aadhaarNumber: data.aadhaarNumber }),
        ...(data.gstNumber !== undefined && { gstNumber: data.gstNumber }),
        ...(data.occupation !== undefined && { occupation: data.occupation }),
        ...(data.companyName !== undefined && { companyName: data.companyName }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        altPhone: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        dateOfBirth: true,
        panNumber: true,
        aadhaarNumber: true,
        gstNumber: true,
        occupation: true,
        companyName: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return ok(customer);
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/customers/[id] — Soft delete customer (admin only)
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    // Only admin+ can delete customers (cascade considerations)
    const auth = await requireAuth(['super_admin', 'admin']);
    if (!auth.authorized) {
      return auth.status === 401
        ? unauthorized(auth.error)
        : forbidden(auth.error);
    }
    const user = auth.user!;
    const { id } = await context.params;

    // Verify customer exists and is accessible
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        id,
        orgId: user.orgId,
        deletedAt: null,
      },
      select: {
        id: true,
        bookings: {
          where: { deletedAt: null },
          select: { id: true, status: true },
        },
      },
    });

    if (!existingCustomer) {
      return notFound('Customer not found');
    }

    // Check if customer has active bookings
    const activeBookings = existingCustomer.bookings.filter((b) =>
      ['confirmed', 'partial'].includes(b.status)
    );
    if (activeBookings.length > 0) {
      return badRequest(
        'Cannot delete customer with active bookings. Cancel bookings first.'
      );
    }

    // Soft delete customer
    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return ok({ message: 'Customer deleted successfully' });
  } catch (err) {
    return serverError(String(err));
  }
}
