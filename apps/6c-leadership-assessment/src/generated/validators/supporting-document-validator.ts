import { z } from 'zod';

/**
 * Zod schema for SupportingDocument validation
 */
export const SupportingDocumentSchema = z.object({
  id: z.string().uuid(),
  supportingDocumentName: z.string().min(1, { message: "Supporting Document Name is required" }),
  assessment: z.object({ id: z.string().uuid(), assessmentName: z.string() }),
  auditActionKey: z.enum(['Added']),
  auditTimestamp: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").min(1, { message: "Audit Timestamp is required" }),
  campaign: z.object({ id: z.string().uuid(), campaignName: z.string() }),
  employee: z.object({ id: z.string().uuid(), employeeName: z.string() }),
  filename: z.string().min(1, { message: "Filename is required" }),
  fileTypeKey: z.enum(['PDF', 'Word', 'Spreadsheet', 'Presentation', 'Image', 'Other']),
  supportingDocumentNote: z.string().optional(),
  supportingDocumentTypeKey: z.enum(['PerformanceResult', 'CustomerFeedback', 'LeadershipExample', 'DevelopmentRecord', 'ObjectiveKPI', 'Other']),
  supportingDocumentURL: z.string().url().min(1, { message: "Supporting Document URL is required" }),
  uploadedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").min(1, { message: "Uploaded Date is required" }),
  uploaderEmail: z.string().email().min(1, { message: "Uploader Email is required" }),
  uploaderName: z.string().min(1, { message: "Uploader Name is required" }),
  uploaderRoleKey: z.enum(['Employee', 'Manager', 'HR']),
  visibilityKey: z.enum(['EmployeeVisible']),
});

/**
 * Schema for creating a new SupportingDocument (omits system-generated ID)
 */
export const CreateSupportingDocumentSchema = SupportingDocumentSchema.omit({ id: true });

/**
 * Schema for updating an existing SupportingDocument
 */
export const UpdateSupportingDocumentSchema = SupportingDocumentSchema;

export type SupportingDocumentInput = z.infer<typeof SupportingDocumentSchema>;
export type CreateSupportingDocumentInput = z.infer<typeof CreateSupportingDocumentSchema>;
export type UpdateSupportingDocumentInput = z.infer<typeof UpdateSupportingDocumentSchema>;