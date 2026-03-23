/**
 * Schema Validation Tests for ClickProps CRM
 *
 * These tests validate the Prisma schema structure by reading the schema file
 * and verifying that all expected models, enums, relations, and indexes exist.
 * No database connection is required — this is purely structural validation.
 */

import * as fs from 'fs';
import * as path from 'path';

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const schema = fs.readFileSync(schemaPath, 'utf-8');

// Helper: extract all model names from schema
function getModelNames(): string[] {
  const matches = schema.match(/^model\s+(\w+)\s*\{/gm);
  return matches ? matches.map((m) => m.replace(/^model\s+/, '').replace(/\s*\{$/, '')) : [];
}

// Helper: extract all enum names from schema
function getEnumNames(): string[] {
  const matches = schema.match(/^enum\s+(\w+)\s*\{/gm);
  return matches ? matches.map((m) => m.replace(/^enum\s+/, '').replace(/\s*\{$/, '')) : [];
}

// Helper: extract model block content
function getModelBlock(modelName: string): string {
  const regex = new RegExp(`model\\s+${modelName}\\s*\\{([\\s\\S]*?)^\\}`, 'm');
  const match = schema.match(regex);
  return match ? match[1] : '';
}

// Helper: check if model has a field
function modelHasField(modelName: string, fieldName: string): boolean {
  const block = getModelBlock(modelName);
  return new RegExp(`\\b${fieldName}\\b`).test(block);
}

// Helper: check if model has @@index
function modelHasIndex(modelName: string, fieldName: string): boolean {
  const block = getModelBlock(modelName);
  return block.includes(`@@index([${fieldName}])`);
}

describe('ClickProps CRM Schema — Model Existence', () => {
  const models = getModelNames();

  // Group 1: NextAuth (preserved)
  test.each(['Account', 'Session', 'VerificationToken'])(
    'NextAuth model %s exists',
    (model) => {
      expect(models).toContain(model);
    }
  );

  // Group 2: Organizations & Access
  test.each(['Organization', 'User', 'Role', 'Permission', 'UserRole', 'RolePermission'])(
    'Organizations & Access model %s exists',
    (model) => {
      expect(models).toContain(model);
    }
  );

  // Group 3: Leads & CRM
  test.each(['Lead', 'Communication', 'Activity', 'Task', 'Note', 'LeadSource', 'LeadStatus'])(
    'Leads & CRM model %s exists',
    (model) => {
      expect(models).toContain(model);
    }
  );

  // Group 4: Projects & Inventory
  test.each(['Project', 'Plot', 'Flat', 'Amenity', 'ProjectImage', 'ProjectStatus'])(
    'Projects & Inventory model %s exists',
    (model) => {
      expect(models).toContain(model);
    }
  );

  // Group 5: Bookings & Transactions
  test.each(['Booking', 'Payment', 'Installment', 'Transaction', 'Refund', 'BookingStatus', 'PaymentMode'])(
    'Bookings & Transactions model %s exists',
    (model) => {
      expect(models).toContain(model);
    }
  );

  // Group 6: Customers
  test.each(['Customer', 'CustomerContact', 'CustomerDocument'])(
    'Customers model %s exists',
    (model) => {
      expect(models).toContain(model);
    }
  );

  // Group 7: Agents & Commissions
  test.each(['Agent', 'Commission', 'CommissionRule', 'CommissionStructure', 'AgentTeam'])(
    'Agents & Commissions model %s exists',
    (model) => {
      expect(models).toContain(model);
    }
  );

  // Group 8: Loans
  test.each(['Loan', 'LoanInstallment', 'LoanDocument', 'LoanStatus'])(
    'Loans model %s exists',
    (model) => {
      expect(models).toContain(model);
    }
  );

  // Group 9: Settings & Config
  test.each(['Configuration', 'AuditLog', 'Webhook'])(
    'Settings & Config model %s exists',
    (model) => {
      expect(models).toContain(model);
    }
  );

  test('has at least 35 models', () => {
    expect(models.length).toBeGreaterThanOrEqual(35);
  });
});

describe('ClickProps CRM Schema — Enums', () => {
  const enums = getEnumNames();

  const expectedEnums = [
    'UserStatus',
    'LeadStatusEnum',
    'LeadPriority',
    'CommunicationType',
    'CommunicationDirection',
    'ActivityType',
    'TaskStatus',
    'TaskPriority',
    'ProjectType',
    'ProjectStatusEnum',
    'PlotStatus',
    'FlatStatus',
    'BookingStatusEnum',
    'PaymentModeEnum',
    'PaymentStatus',
    'InstallmentStatus',
    'TransactionType',
    'RefundStatus',
    'CommissionStatus',
    'CommissionType',
    'LoanStatusEnum',
    'LoanInstallmentStatus',
    'DocumentType',
    'WebhookEvent',
    'AuditAction',
  ];

  test.each(expectedEnums)('enum %s is defined', (enumName) => {
    expect(enums).toContain(enumName);
  });
});

describe('ClickProps CRM Schema — Multi-Tenant Support', () => {
  const multiTenantModels = [
    'User',
    'Role',
    'Lead',
    'Project',
    'Booking',
    'Customer',
    'Agent',
    'Loan',
    'Configuration',
    'AuditLog',
    'Webhook',
    'LeadSource',
    'CommissionStructure',
  ];

  test.each(multiTenantModels)('%s has orgId field for tenant isolation', (model) => {
    expect(modelHasField(model, 'orgId')).toBe(true);
  });

  test.each(multiTenantModels)('%s has orgId index', (model) => {
    expect(modelHasIndex(model, 'orgId')).toBe(true);
  });
});

describe('ClickProps CRM Schema — Timestamps & Soft Deletes', () => {
  const modelsWithSoftDelete = [
    'Organization',
    'User',
    'Role',
    'Lead',
    'Communication',
    'Task',
    'Note',
    'Project',
    'Plot',
    'Flat',
    'Booking',
    'Payment',
    'Customer',
    'Agent',
    'AgentTeam',
    'CommissionStructure',
    'Loan',
    'Webhook',
    'LeadSource',
  ];

  test.each(modelsWithSoftDelete)('%s has createdAt field', (model) => {
    expect(modelHasField(model, 'createdAt')).toBe(true);
  });

  test.each(modelsWithSoftDelete)('%s has updatedAt field', (model) => {
    expect(modelHasField(model, 'updatedAt')).toBe(true);
  });

  test.each(modelsWithSoftDelete)('%s has deletedAt field for soft deletes', (model) => {
    expect(modelHasField(model, 'deletedAt')).toBe(true);
  });
});

describe('ClickProps CRM Schema — Relations', () => {
  test('User belongs to Organization', () => {
    const block = getModelBlock('User');
    expect(block).toContain('orgId');
    expect(block).toContain('Organization');
  });

  test('Lead has assignedTo and createdBy user relations', () => {
    const block = getModelBlock('Lead');
    expect(block).toContain('assignedToId');
    expect(block).toContain('createdById');
  });

  test('Booking references Customer, Project, Plot, Flat, Agent', () => {
    const block = getModelBlock('Booking');
    expect(block).toContain('customerId');
    expect(block).toContain('projectId');
    expect(block).toContain('plotId');
    expect(block).toContain('flatId');
    expect(block).toContain('agentId');
  });

  test('Payment belongs to Booking', () => {
    const block = getModelBlock('Payment');
    expect(block).toContain('bookingId');
  });

  test('Installment belongs to Booking', () => {
    const block = getModelBlock('Installment');
    expect(block).toContain('bookingId');
  });

  test('Commission links Agent and Booking', () => {
    const block = getModelBlock('Commission');
    expect(block).toContain('agentId');
    expect(block).toContain('bookingId');
  });

  test('Loan links Customer, Booking, and Organization', () => {
    const block = getModelBlock('Loan');
    expect(block).toContain('customerId');
    expect(block).toContain('bookingId');
    expect(block).toContain('orgId');
  });

  test('Agent has one-to-one relation with User', () => {
    const block = getModelBlock('Agent');
    expect(block).toContain('userId');
    expect(block).toContain('@unique');
  });

  test('CommissionRule can be project-specific', () => {
    const block = getModelBlock('CommissionRule');
    expect(block).toContain('projectId');
  });
});

describe('ClickProps CRM Schema — Indexes on Critical Fields', () => {
  test('Lead has index on phone', () => {
    expect(modelHasIndex('Lead', 'phone')).toBe(true);
  });

  test('Lead has index on email', () => {
    expect(modelHasIndex('Lead', 'email')).toBe(true);
  });

  test('Lead has index on status', () => {
    expect(modelHasIndex('Lead', 'status')).toBe(true);
  });

  test('Booking has index on bookingDate', () => {
    expect(modelHasIndex('Booking', 'bookingDate')).toBe(true);
  });

  test('Booking has index on status', () => {
    expect(modelHasIndex('Booking', 'status')).toBe(true);
  });

  test('Customer has index on phone', () => {
    expect(modelHasIndex('Customer', 'phone')).toBe(true);
  });

  test('AuditLog has index on createdAt', () => {
    expect(modelHasIndex('AuditLog', 'createdAt')).toBe(true);
  });

  test('Payment has index on paymentDate', () => {
    expect(modelHasIndex('Payment', 'paymentDate')).toBe(true);
  });
});

describe('ClickProps CRM Schema — Constraints', () => {
  test('User email is unique', () => {
    const block = getModelBlock('User');
    expect(block).toMatch(/email\s+String\s+@unique/);
  });

  test('Booking number is unique', () => {
    const block = getModelBlock('Booking');
    expect(block).toMatch(/bookingNumber\s+String\s+@unique/);
  });

  test('Loan number is unique', () => {
    const block = getModelBlock('Loan');
    expect(block).toMatch(/loanNumber\s+String\s+@unique/);
  });

  test('Agent code is unique', () => {
    const block = getModelBlock('Agent');
    expect(block).toMatch(/agentCode\s+String\s+@unique/);
  });

  test('Organization domain is unique', () => {
    const block = getModelBlock('Organization');
    expect(block).toMatch(/domain\s+String\?\s+@unique/);
  });

  test('Plot number is unique per project', () => {
    const block = getModelBlock('Plot');
    expect(block).toContain('@@unique([projectId, plotNumber])');
  });

  test('Flat number is unique per project', () => {
    const block = getModelBlock('Flat');
    expect(block).toContain('@@unique([projectId, flatNumber])');
  });

  test('Role name is unique per organization', () => {
    const block = getModelBlock('Role');
    expect(block).toContain('@@unique([orgId, name])');
  });

  test('Prices use Decimal type (not Float)', () => {
    // Ensure financial fields use Decimal, not Float
    expect(schema).not.toMatch(/price\s+Float/);
    expect(schema).not.toMatch(/amount\s+Float/);
  });

  test('Booking has onDelete: Restrict for customer', () => {
    const block = getModelBlock('Booking');
    expect(block).toContain('onDelete: Restrict');
  });
});

describe('ClickProps CRM Schema — Cascade Delete Behavior', () => {
  test('Payment cascade deletes when Booking is deleted', () => {
    const block = getModelBlock('Payment');
    expect(block).toContain('onDelete: Cascade');
  });

  test('Installment cascade deletes when Booking is deleted', () => {
    const block = getModelBlock('Installment');
    expect(block).toContain('onDelete: Cascade');
  });

  test('Transaction cascade deletes when Booking is deleted', () => {
    const block = getModelBlock('Transaction');
    expect(block).toContain('onDelete: Cascade');
  });

  test('Commission cascade deletes when Booking is deleted', () => {
    const block = getModelBlock('Commission');
    expect(block).toContain('onDelete: Cascade');
  });

  test('Communication cascade deletes when Lead is deleted', () => {
    const block = getModelBlock('Communication');
    expect(block).toContain('onDelete: Cascade');
  });

  test('Activity cascade deletes when Lead is deleted', () => {
    const block = getModelBlock('Activity');
    expect(block).toContain('onDelete: Cascade');
  });

  test('Task cascade deletes when Lead is deleted', () => {
    const block = getModelBlock('Task');
    expect(block).toContain('onDelete: Cascade');
  });

  test('User cascade deletes when Organization is deleted', () => {
    const block = getModelBlock('User');
    expect(block).toContain('onDelete: Cascade');
  });

  test('Plot cascade deletes when Project is deleted', () => {
    const block = getModelBlock('Plot');
    expect(block).toContain('onDelete: Cascade');
  });

  test('Flat cascade deletes when Project is deleted', () => {
    const block = getModelBlock('Flat');
    expect(block).toContain('onDelete: Cascade');
  });

  test('CommissionRule cascade deletes when CommissionStructure is deleted', () => {
    const block = getModelBlock('CommissionRule');
    expect(block).toContain('onDelete: Cascade');
  });

  test('LoanInstallment cascade deletes when Loan is deleted', () => {
    const block = getModelBlock('LoanInstallment');
    expect(block).toContain('onDelete: Cascade');
  });

  test('Booking restricts delete when Customer has bookings', () => {
    const block = getModelBlock('Booking');
    // Customer relation uses Restrict
    expect(block).toMatch(/customer\s+Customer\s+@relation.*onDelete:\s*Restrict/s);
  });
});

describe('ClickProps CRM Schema — Enum Values', () => {
  function getEnumValues(enumName: string): string[] {
    const regex = new RegExp(`enum\\s+${enumName}\\s*\\{([\\s\\S]*?)\\}`, 'm');
    const match = schema.match(regex);
    if (!match) return [];
    return match[1].trim().split(/\s+/).filter(Boolean);
  }

  test('BookingStatusEnum has all required values', () => {
    const values = getEnumValues('BookingStatusEnum');
    expect(values).toContain('pending');
    expect(values).toContain('confirmed');
    expect(values).toContain('cancelled');
    expect(values).toContain('possession_given');
  });

  test('LeadStatusEnum has all pipeline stages', () => {
    const values = getEnumValues('LeadStatusEnum');
    expect(values).toContain('new');
    expect(values).toContain('contacted');
    expect(values).toContain('qualified');
    expect(values).toContain('won');
    expect(values).toContain('lost');
  });

  test('PaymentModeEnum has all payment modes', () => {
    const values = getEnumValues('PaymentModeEnum');
    expect(values).toContain('cash');
    expect(values).toContain('cheque');
    expect(values).toContain('bank_transfer');
    expect(values).toContain('upi');
  });

  test('CommissionType has percentage, flat, tiered', () => {
    const values = getEnumValues('CommissionType');
    expect(values).toEqual(['percentage', 'flat', 'tiered']);
  });

  test('UserStatus has active, inactive, suspended', () => {
    const values = getEnumValues('UserStatus');
    expect(values).toEqual(['active', 'inactive', 'suspended']);
  });
});

describe('ClickProps CRM Schema — Datasource & Generator', () => {
  test('uses PostgreSQL provider', () => {
    expect(schema).toContain('provider = "postgresql"');
  });

  test('uses prisma-client-js generator', () => {
    expect(schema).toContain('provider = "prisma-client-js"');
  });

  test('reads DATABASE_URL from environment', () => {
    expect(schema).toContain('env("DATABASE_URL")');
  });
});
