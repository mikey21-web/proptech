import { redis } from './redis';
import { v4 as uuidv4 } from 'uuid';

export interface BookingWizardSession {
  sessionId: string;
  step: number;
  plotId?: string;
  projectId: string;
  customerId?: string;
  coApplicantData?: Record<string, any>;
  pricingData?: Record<string, any>;
  installmentSchedule?: Record<string, any>;
  documentsUploaded: string[];
  createdAt: Date;
  expiresAt: Date;
  status: 'draft' | 'confirmed';
  metadata?: Record<string, any>;
}

const SESSION_TTL = 24 * 60 * 60; // 24 hours in seconds

function getSessionKey(sessionId: string): string {
  return `booking:session:${sessionId}`;
}

export async function createWizardSession(
  projectId: string,
  userId: string,
): Promise<BookingWizardSession> {
  const sessionId = uuidv4();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL * 1000);

  const session: BookingWizardSession = {
    sessionId,
    step: 1,
    projectId,
    documentsUploaded: [],
    createdAt: now,
    expiresAt,
    status: 'draft',
    metadata: { userId },
  };

  await redis?.setex(
    getSessionKey(sessionId),
    SESSION_TTL,
    JSON.stringify(session),
  );

  return session;
}

export async function getWizardSession(
  sessionId: string,
): Promise<BookingWizardSession | null> {
  const data = await redis?.get(getSessionKey(sessionId));
  if (!data) return null;

  try {
    return JSON.parse(data) as BookingWizardSession;
  } catch {
    return null;
  }
}

export async function updateWizardSession(
  sessionId: string,
  updates: Partial<BookingWizardSession>,
): Promise<BookingWizardSession> {
  const current = await getWizardSession(sessionId);
  if (!current) throw new Error('Session not found or expired');

  const updated: BookingWizardSession = {
    ...current,
    ...updates,
    sessionId: current.sessionId,
    createdAt: current.createdAt,
  };

  await redis?.setex(
    getSessionKey(sessionId),
    SESSION_TTL,
    JSON.stringify(updated),
  );

  return updated;
}

export async function advanceStep(
  sessionId: string,
  newStep: number,
): Promise<BookingWizardSession> {
  return updateWizardSession(sessionId, { step: newStep });
}

export async function saveStepData(
  sessionId: string,
  stepNumber: number,
  data: Record<string, any>,
): Promise<BookingWizardSession> {
  const session = await getWizardSession(sessionId);
  if (!session) throw new Error('Session not found or expired');

  const stepDataKey = `step${stepNumber}Data`;
  const updates: Partial<BookingWizardSession> & Record<string, any> = {
    [stepDataKey]: data,
    step: stepNumber,
  };

  if (stepNumber === 1 && data.plotId) {
    updates.plotId = data.plotId;
  }

  if (stepNumber === 2 && data.customerId) {
    updates.customerId = data.customerId;
  }

  return updateWizardSession(sessionId, {
    ...updates,
  });
}

export async function deleteWizardSession(sessionId: string): Promise<void> {
  await redis?.del(getSessionKey(sessionId));
}
