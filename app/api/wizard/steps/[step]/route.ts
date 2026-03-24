import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getWizardSession,
  saveStepData,
  advanceStep,
} from '@/lib/booking-wizard-session';
import {
  step1PlotSelectionSchema,
  step2CustomerDetailsSchema,
  step3CoApplicantSchema,
  step4PricingSchema,
  step5InstallmentScheduleSchema,
  step6DocumentsUploadSchema,
} from '@/lib/validations/booking-wizard';
import { releaseExpiredInventoryBlocks } from '@/lib/inventory-blocks';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const stepSchemas = [
  step1PlotSelectionSchema,
  step2CustomerDetailsSchema,
  step3CoApplicantSchema,
  step4PricingSchema,
  step5InstallmentScheduleSchema,
  step6DocumentsUploadSchema,
];

export async function POST(
  req: NextRequest,
  { params: { step } }: { params: { step: string } },
) {
  try {
    const auth = await requireAuth([
      'super_admin',
      'admin',
      'sales_manager',
      'backoffice',
      'agent',
    ]);
    if (!auth.authorized)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = auth.user!;

    const stepNum = parseInt(step, 10);
    if (stepNum < 1 || stepNum > 6)
      return NextResponse.json({ error: 'Invalid step' }, { status: 400 });

    const { sessionId, data } = await req.json();

    // Validate session
    const wizardSession = await getWizardSession(sessionId);
    if (!wizardSession)
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 410 },
      );

    if (wizardSession.metadata?.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate data against step schema
    const schema = stepSchemas[stepNum - 1];
    const validatedData = schema.parse(data);

    // Perform step-specific validations and processing
    let processedData: Record<string, any> = validatedData;

    if (stepNum === 1) {
      await releaseExpiredInventoryBlocks();
      // Step 1: Verify plot exists and is available
      const plot = await prisma.plot.findFirst({
        where: {
          id: (validatedData as any).plotId,
          projectId: wizardSession.projectId,
          status: 'available',
          deletedAt: null,
          project: { orgId: user.orgId, deletedAt: null },
        },
      });

      if (!plot)
        return NextResponse.json(
          { error: 'Plot not available' },
          { status: 422 },
        );

      processedData = {
        ...validatedData,
        plotDetails: {
          plotNumber: plot.plotNumber,
          area: plot.area.toString(),
          price: plot.price.toString(),
          facing: plot.facing,
        },
      };
    }

    if (stepNum === 2) {
      // Step 2: Handle customer (new or existing)
      const customerData = validatedData as any;

      if (customerData.customerId) {
        // Verify existing customer
        const customer = await prisma.customer.findFirst({
          where: {
            id: customerData.customerId,
            orgId: user.orgId,
            deletedAt: null,
          },
        });

        if (!customer)
          return NextResponse.json(
            { error: 'Customer not found' },
            { status: 404 },
          );

        processedData = { customerId: customer.id };
      } else {
        // Check for duplicate phone
        const existingCustomer = await prisma.customer.findFirst({
          where: {
            phone: customerData.phone,
            orgId: user.orgId,
            deletedAt: null,
          },
        });

        if (existingCustomer) {
          return NextResponse.json(
            {
              error: 'Customer with this phone already exists',
              existingCustomerId: existingCustomer.id,
            },
            { status: 422 },
          );
        }

        // New customer data will be created during confirmation
        processedData = customerData;
      }
    }

    // Save step data to session
    await saveStepData(sessionId, stepNum, processedData);

    // Advance to next step
    await advanceStep(sessionId, stepNum + 1);

    return NextResponse.json({
      success: true,
      currentStep: stepNum,
      nextStep: stepNum + 1,
    });
  } catch (error: any) {
    console.error(`Step ${step} error:`, error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to save step data' },
      { status: 500 },
    );
  }
}

export async function GET(
  req: NextRequest,
  { params: { step } }: { params: { step: string } },
) {
  try {
    const auth = await requireAuth([
      'super_admin',
      'admin',
      'sales_manager',
      'backoffice',
      'agent',
    ]);
    if (!auth.authorized)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = auth.user!;

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const stepNum = parseInt(step, 10);

    if (!sessionId || stepNum < 1 || stepNum > 6)
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });

    const wizardSession = await getWizardSession(sessionId);
    if (!wizardSession)
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 410 },
      );

    if (wizardSession.metadata?.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Return step data and allowed options
    const response: Record<string, any> = {
      currentStep: wizardSession.step,
      sessionId,
    };

    if (stepNum === 1) {
      await releaseExpiredInventoryBlocks();
      // Get available plots
      const plots = await prisma.plot.findMany({
        where: {
          projectId: wizardSession.projectId,
          status: 'available',
          deletedAt: null,
          project: { orgId: user.orgId, deletedAt: null },
        },
        select: {
          id: true,
          plotNumber: true,
          area: true,
          price: true,
          facing: true,
          dimensions: true,
        },
      });
      response.availablePlots = plots;
    }

    if (stepNum === 2) {
      // Can be used to populate customer search
      response.allowNewCustomer = true;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error(`Fetch step ${step} error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch step data' },
      { status: 500 },
    );
  }
}
