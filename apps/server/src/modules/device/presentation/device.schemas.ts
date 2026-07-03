import { z } from 'zod';

export const loginModeSchema = z.enum(['auto', 'modern', 'legacy']);

export const createDeviceSchema = z.object({
  name: z.string().min(1),
  host: z.string().min(1),
  port: z.coerce.number().int().positive().default(8728),
  username: z.string().min(1),
  password: z.string().default(''),
  useTls: z.boolean().default(false),
  loginMode: loginModeSchema.default('auto'),
  groupId: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const updateDeviceSchema = createDeviceSchema.partial();

export const testDeviceConnectionSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().positive().default(8728),
  username: z.string().min(1),
  password: z.string().default(''),
  useTls: z.boolean().default(false),
  loginMode: loginModeSchema.default('auto'),
  timeoutMs: z.coerce.number().int().positive().default(10000),
});

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
export type TestDeviceConnectionInput = z.infer<typeof testDeviceConnectionSchema>;
