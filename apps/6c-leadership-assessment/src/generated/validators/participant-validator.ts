import { z } from 'zod';

/**
 * Zod schema for Participant validation
 */
export const ParticipantSchema = z.object({
  id: z.string().uuid(),
  participantName: z.string().min(1, { message: "Participant Name is required" }),
  campaign: z.object({ id: z.string().uuid(), campaignName: z.string() }),
  completedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").optional(),
  employee: z.object({ id: z.string().uuid(), employeeName: z.string() }),
  gCMLevelKey: z.enum(['GCM7', 'GCM8', 'GCM9', 'GCM10']),
  hRContact: z.object({ id: z.string().uuid(), hRUserName: z.string() }),
  invitedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").min(1, { message: "Invited Date is required" }),
  leadershipRoleKey: z.enum(['BusinessUnitLeader', 'FunctionalLeader', 'RegionalLeader', 'EnterpriseLeader']),
  manager: z.object({ id: z.string().uuid(), employeeName: z.string() }),
  statusKey: z.enum(['Invited', 'InProgress', 'Submitted', 'Completed', 'Withdrawn']),
});

/**
 * Schema for creating a new Participant (omits system-generated ID)
 */
export const CreateParticipantSchema = ParticipantSchema.omit({ id: true });

/**
 * Schema for updating an existing Participant
 */
export const UpdateParticipantSchema = ParticipantSchema;

export type ParticipantInput = z.infer<typeof ParticipantSchema>;
export type CreateParticipantInput = z.infer<typeof CreateParticipantSchema>;
export type UpdateParticipantInput = z.infer<typeof UpdateParticipantSchema>;