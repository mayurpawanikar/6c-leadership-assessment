import { z } from 'zod';

/**
 * Zod schema for Response validation
 */
export const ResponseSchema = z.object({
  id: z.string().uuid(),
  responseName: z.string().min(1, { message: "Response Name is required" }),
  assessment: z.object({ id: z.string().uuid(), assessmentName: z.string() }),
  employeeComment: z.string().optional(),
  employeeRating: z.number().int(),
  frameworkConfiguration: z.object({ id: z.string().uuid(), frameworkConfigurationName: z.string() }),
  lockedDimension: z.string().min(1, { message: "Locked Dimension is required" }),
  lockedFactorKey: z.enum(['Capability', 'Capacity', 'Character', 'CustomerCentricity', 'CommercialAcumen', 'CulturalEquity']),
  lockedQuestionText: z.string().min(1, { message: "Locked Question Text is required" }),
  managerComment: z.string().optional(),
  managerRating: z.number().int().optional(),
});

/**
 * Schema for creating a new Response (omits system-generated ID)
 */
export const CreateResponseSchema = ResponseSchema.omit({ id: true });

/**
 * Schema for updating an existing Response
 */
export const UpdateResponseSchema = ResponseSchema;

export type ResponseInput = z.infer<typeof ResponseSchema>;
export type CreateResponseInput = z.infer<typeof CreateResponseSchema>;
export type UpdateResponseInput = z.infer<typeof UpdateResponseSchema>;