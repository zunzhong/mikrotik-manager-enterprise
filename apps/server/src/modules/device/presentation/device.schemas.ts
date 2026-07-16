import { z } from 'zod';

export const loginModeSchema = z.enum(['auto', 'modern', 'legacy']);

const createDeviceFields = z.object({
  name: z.string().min(1),
  host: z.string().min(1),
  port: z.coerce.number().int().positive().optional(),
  username: z.string().min(1),
  password: z.string().default(''),
  useTls: z.boolean().default(false),
  loginMode: loginModeSchema.default('auto'),
  groupId: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const createDeviceSchema = createDeviceFields.transform((input) => ({
  ...input,
  port: input.port ?? (input.useTls ? 8729 : 8728),
}));

export const updateDeviceSchema = createDeviceFields.partial().transform((input) => ({
  ...input,
  ...(input.port === undefined && input.useTls !== undefined
    ? { port: input.useTls ? 8729 : 8728 }
    : {}),
}));

export const testDeviceConnectionSchema = z
  .object({
    host: z.string().min(1),
    port: z.coerce.number().int().positive().optional(),
    username: z.string().min(1),
    password: z.string().default(''),
    useTls: z.boolean().default(false),
    loginMode: loginModeSchema.default('auto'),
    timeoutMs: z.coerce.number().int().positive().default(15000),
  })
  .transform((input) => ({
    ...input,
    port: input.port ?? (input.useTls ? 8729 : 8728),
  }));

export const testSavedDeviceConnectionSchema = z.object({
  host: z.string().min(1).optional(),
  port: z.coerce.number().int().positive().optional(),
  username: z.string().min(1).optional(),
  password: z.string().optional(),
  useTls: z.boolean().optional(),
  loginMode: loginModeSchema.optional(),
  timeoutMs: z.coerce.number().int().positive().optional().default(15000),
});

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
export type TestDeviceConnectionInput = z.infer<typeof testDeviceConnectionSchema>;
export type TestSavedDeviceConnectionInput = z.infer<typeof testSavedDeviceConnectionSchema>;
