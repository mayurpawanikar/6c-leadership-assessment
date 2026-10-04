import { z } from 'zod';

/**
 * Zod schema for AssessmentInput validation
 */
export const AssessmentInputSchema = z.object({
  id: z.string().uuid(),
  assessmentInputName: z.string().min(1, { message: "Assessment Input Name is required" }),
  assessment: z.object({ id: z.string().uuid(), assessmentName: z.string() }),
  inputText: z.string().min(1, { message: "Input Text is required" }),
  inputTypeKey: z.enum(['Strength', 'DevelopmentArea', 'ObjectiveKPI']),
  sequence: z.number().int(),
});

/**
 * Schema for creating a new AssessmentInput (omits system-generated ID)
 */
export const CreateAssessmentInputSchema = AssessmentInputSchema.omit({ id: true });

/**
 * Schema for updating an existing AssessmentInput
 */
export const UpdateAssessmentInputSchema = AssessmentInputSchema;

export type AssessmentInputInput = z.infer<typeof AssessmentInputSchema>;
export type CreateAssessmentInputInput = z.infer<typeof CreateAssessmentInputSchema>;
export type UpdateAssessmentInputInput = z.infer<typeof UpdateAssessmentInputSchema>;