import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { copilotChat } from '../../app-gen-sdk/data/workiq/m365-mcp-clients';
import { sharePointRoleConfig } from '@/config/sharepoint-role-config';
import type { SharePointHRUser } from '@/hooks/use-sharepoint-role-records';
import { createSharePointListItem } from '@/lib/sharepoint-lists-mcp';

export type HrUserInput = Pick<SharePointHRUser, 'userEmail' | 'userName' | 'isActive'>;
export type HrUserChange =
  | { action: 'create'; user: HrUserInput }
  | { action: 'update'; originalEmail: string; user: HrUserInput }
  | { action: 'delete'; originalEmail: string };

type OperationResult = { success: boolean; message: string };

const listUrl = `${sharePointRoleConfig.siteUrl}/Lists/${sharePointRoleConfig.lists.hrUsers}/AllItems.aspx`;
const queryKey = ['m365-hr-users', sharePointRoleConfig.siteUrl, sharePointRoleConfig.lists.hrUsers] as const;

export const useM365HrUsers = (enabled: boolean) =>
  useQuery({
    queryKey,
    enabled,
    queryFn: async () => copilotChat<SharePointHRUser>({
      message: `Use only the SharePoint list ${listUrl}. Read every item in the HRUsers list. Map UserEmail to userEmail, UserName to userName, and IsActive to isActive. Return one result per list item. Do not infer or invent records.`,
      responseSchema: { userEmail: 'string', userName: 'string', isActive: 'boolean' },
      enableWebSearch: false,
    }),
    staleTime: 5 * 60 * 1000,
  });

export const useManageM365HrUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (change: HrUserChange) => {
      if (change.action === 'create') {
        return createSharePointListItem(
          sharePointRoleConfig.siteUrl,
          sharePointRoleConfig.lists.hrUsers,
          {
            UserEmail: change.user.userEmail.trim(),
            UserName: change.user.userName.trim(),
            IsActive: change.user.isActive,
          },
        );
      }

      const instruction = change.action === 'update'
        ? `Find exactly one item whose UserEmail equals "${change.originalEmail}", ignoring case and whitespace. Update it to UserEmail "${change.user.userEmail}", UserName "${change.user.userName}", and IsActive ${change.user.isActive}. Do not create a new item.`
        : `Find exactly one item whose UserEmail equals "${change.originalEmail}", ignoring case and whitespace, and permanently delete that item. Do not affect any other item.`;
      const results = await copilotChat<OperationResult>({
        message: `Use only the SharePoint list ${listUrl}. ${instruction} Return success true only after SharePoint confirms the operation, plus a concise message.`,
        responseSchema: { success: 'boolean', message: 'string' },
        enableWebSearch: false,
      });
      const result = results[0];
      if (!result?.success) throw new Error(result?.message || 'SharePoint did not confirm the change.');
      return result;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.invalidateQueries({ queryKey: ['sharepoint-role-records'] });
    },
  });
};
