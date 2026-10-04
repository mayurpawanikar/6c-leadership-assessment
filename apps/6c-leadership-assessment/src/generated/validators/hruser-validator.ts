import { z } from 'zod';

/**
 * Zod schema for HRUser validation
 */
export const HRUserSchema = z.object({
  id: z.string().uuid(),
  hRUserName: z.string().min(1, { message: "HR User Name is required" }),
  active: z.boolean(),
  email: z.string().email().min(1, { message: "Email is required" }),
});

/**
 * Schema for creating a new HRUser (omits system-generated ID)
 */
export const CreateHRUserSchema = HRUserSchema.omit({ id: true });

/**
 * Schema for updating an existing HRUser
 */
export const UpdateHRUserSchema = HRUserSchema;

export type HRUserInput = z.infer<typeof HRUserSchema>;
export type CreateHRUserInput = z.infer<typeof CreateHRUserSchema>;
export type UpdateHRUserInput = z.infer<typeof UpdateHRUserSchema>;