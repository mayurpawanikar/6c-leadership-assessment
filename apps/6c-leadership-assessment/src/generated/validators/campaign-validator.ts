import { z } from 'zod';

/**
 * Zod schema for Campaign validation
 */
export const CampaignSchema = z.object({
  id: z.string().uuid(),
  campaignName: z.string().min(1, { message: "Campaign Name is required" }),
  archivedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").optional(),
  campaignTypeKey: z.enum(['KeyTalent', 'EmergingLeaders', 'Promotion', 'Succession', 'General']),
  createdDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").min(1, { message: "Created Date is required" }),
  description: z.string().optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").min(1, { message: "End Date is required" }),
  frameworkVersion: z.string().min(1, { message: "Framework Version is required" }),
  hRContact: z.object({ id: z.string().uuid(), hRUserName: z.string() }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").min(1, { message: "Start Date is required" }),
  statusKey: z.enum(['Draft', 'Open', 'Closed', 'Archived']),
});

/**
 * Schema for creating a new Campaign (omits system-generated ID)
 */
export const CreateCampaignSchema = CampaignSchema.omit({ id: true });

/**
 * Schema for updating an existing Campaign
 */
export const UpdateCampaignSchema = CampaignSchema;

export type CampaignInput = z.infer<typeof CampaignSchema>;
export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof UpdateCampaignSchema>;