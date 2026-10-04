import { z } from 'zod';

/**
 * Zod schema for FrameworkConfiguration validation
 */
export const FrameworkConfigurationSchema = z.object({
  id: z.string().uuid(),
  frameworkConfigurationName: z.string().min(1, { message: "Framework Configuration Name is required" }),
  active: z.boolean(),
  definition: z.string().min(1, { message: "Definition is required" }),
  dimension: z.string().min(1, { message: "Dimension is required" }),
  displayOrder: z.number().int(),
  exactQuestion: z.string().min(1, { message: "Exact Question is required" }),
  factorKey: z.enum(['Capability', 'Capacity', 'Character', 'CustomerCentricity', 'CommercialAcumen', 'CulturalEquity']),
  frameworkVersion: z.string().min(1, { message: "Framework Version is required" }),
  rating1Label: z.string().min(1, { message: "Rating 1 Label is required" }),
  rating2Label: z.string().min(1, { message: "Rating 2 Label is required" }),
  rating3Label: z.string().min(1, { message: "Rating 3 Label is required" }),
  rating4Label: z.string().min(1, { message: "Rating 4 Label is required" }),
});

/**
 * Schema for creating a new FrameworkConfiguration (omits system-generated ID)
 */
export const CreateFrameworkConfigurationSchema = FrameworkConfigurationSchema.omit({ id: true });

/**
 * Schema for updating an existing FrameworkConfiguration
 */
export const UpdateFrameworkConfigurationSchema = FrameworkConfigurationSchema;

export type FrameworkConfigurationInput = z.infer<typeof FrameworkConfigurationSchema>;
export type CreateFrameworkConfigurationInput = z.infer<typeof CreateFrameworkConfigurationSchema>;
export type UpdateFrameworkConfigurationInput = z.infer<typeof UpdateFrameworkConfigurationSchema>;