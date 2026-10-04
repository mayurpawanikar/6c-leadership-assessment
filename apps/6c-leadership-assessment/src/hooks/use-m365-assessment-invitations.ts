import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendEmailWithAttachments } from '../../app-gen-sdk/data/workiq/m365-mcp-clients';
import type { ImportedEmployee } from '@/lib/excel-employee-parser';

export type AssessmentInvitationRequest = {
  campaignName: string;
  assessmentUrl: string;
  employees: ImportedEmployee[];
};

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export const useSendAssessmentInvitations = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignName, assessmentUrl, employees }: AssessmentInvitationRequest) => {
      for (const employee of employees) {
        await sendEmailWithAttachments({
          to: [employee.employeeEmail],
          subject: `${campaignName}: complete your 6C leadership assessment`,
          contentType: 'HTML',
          body: `<p>Hello ${escapeHtml(employee.employeeName)},</p><p>You have been invited to complete the <strong>${escapeHtml(campaignName)}</strong> leadership assessment.</p><p><a href="${escapeHtml(assessmentUrl)}">Open your assessment</a></p><p>Please use your Microsoft 365 account to access the Employee role.</p>`,
        });
      }
      return { sent: employees.length };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['m365', 'assessment-invitations'] });
    },
  });
};
