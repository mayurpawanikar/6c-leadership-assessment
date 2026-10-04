import { z } from 'zod';

/**
 * Zod schema for Assessment validation
 */
export const AssessmentSchema = z.object({
  id: z.string().uuid(),
  assessmentName: z.string().min(1, { message: "Assessment Name is required" }),
  aIReport: z.string().optional(),
  campaign: z.object({ id: z.string().uuid(), campaignName: z.string() }),
  createdDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").min(1, { message: "Created Date is required" }),
  employee: z.object({ id: z.string().uuid(), employeeName: z.string() }),
  finalReport: z.string().optional(),
  latestFlag: z.boolean(),
  manager: z.object({ id: z.string().uuid(), employeeName: z.string() }),
  participant: z.object({ id: z.string().uuid(), participantName: z.string() }),
  previousAssessment: z.object({ id: z.string().uuid(), assessmentName: z.string() }).optional(),
  statusKey: z.enum(['Draft', 'Submitted', 'ManagerReview', 'Finalized', 'Superseded']),
  submittedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").optional(),
  versionNumber: z.number().int(),
});

/**
 * Schema for creating a new Assessment (omits system-generated ID)
 */
export const CreateAssessmentSchema = AssessmentSchema.omit({ id: true });

/**
 * Schema for updating an existing Assessment
 */
export const UpdateAssessmentSchema = AssessmentSchema;

export type AssessmentInput = z.infer<typeof AssessmentSchema>;
export type CreateAssessmentInput = z.infer<typeof CreateAssessmentSchema>;
export type UpdateAssessmentInput = z.infer<typeof UpdateAssessmentSchema>;