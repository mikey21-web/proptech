import { z } from 'zod';

// ---------------------------------------------------------------------------
// Settings actions — discriminated union by "action" field
// ---------------------------------------------------------------------------

const updateOrgSchema = z.object({
  action: z.literal('update_org'),
  name: z.string().min(1).max(255).optional(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(15).optional().nullable(),
  email: z.string().email().optional().nullable(),
  gstNumber: z.string().max(20).optional().nullable(),
  reraNumber: z.string().max(50).optional().nullable(),
  website: z.string().max(255).optional().nullable(),
  logo: z.string().max(500).optional().nullable(),
  settings: z.record(z.string(), z.unknown()).optional().nullable(),
});

const assignRoleSchema = z.object({
  action: z.literal('assign_role'),
  userId: z.string().cuid('Valid user ID is required'),
  roleId: z.string().cuid('Valid role ID is required'),
});

const removeRoleSchema = z.object({
  action: z.literal('remove_role'),
  userId: z.string().cuid('Valid user ID is required'),
  roleId: z.string().cuid('Valid role ID is required'),
});

const createCommissionStructureSchema = z.object({
  action: z.literal('create_commission_structure'),
  name: z.string().min(1, 'Commission structure name is required').max(255),
  type: z.enum(['percentage', 'flat', 'tiered']).optional().default('percentage'),
  isDefault: z.boolean().optional().default(false),
});

const addCommissionRuleSchema = z.object({
  action: z.literal('add_commission_rule'),
  structureId: z.string().cuid('Valid structure ID is required'),
  minAmount: z.number().min(0).optional().default(0),
  maxAmount: z.number().positive().optional().nullable(),
  percentage: z.number().min(0).max(100).optional().nullable(),
  flatAmount: z.number().min(0).optional().nullable(),
  projectId: z.string().cuid().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

const updateConfigurationSchema = z.object({
  action: z.literal('update_configuration'),
  key: z.string().min(1, 'Key is required').max(100),
  value: z.union([z.string(), z.number(), z.boolean()]),
  configType: z.enum(['string', 'number', 'boolean', 'json']).optional().default('string'),
});

export const settingsActionSchema = z.discriminatedUnion('action', [
  updateOrgSchema,
  assignRoleSchema,
  removeRoleSchema,
  createCommissionStructureSchema,
  addCommissionRuleSchema,
  updateConfigurationSchema,
]);

export type SettingsAction = z.infer<typeof settingsActionSchema>;
