import { useQuery } from '@tanstack/react-query';
import { copilotChat } from '../../app-gen-sdk/data/workiq/m365-mcp-clients';
import { sharePointRoleConfig } from '@/config/sharepoint-role-config';

interface ManagerCountResult {
  count: number;
}

const managerListUrl = `${sharePointRoleConfig.siteUrl}/Lists/${sharePointRoleConfig.lists.managers}/AllItems.aspx`;

const fetchManagerCount = async () => {
  const results = await copilotChat<ManagerCountResult>({
    message: `Use only the exact SharePoint Managers list at ${managerListUrl}. Count every list item, including active and inactive managers. Return exactly one result containing the total integer in the count field. Do not estimate, infer, use another list, or return the number of search results.`,
    responseSchema: { count: 'number' },
    enableWebSearch: false,
  });
  const count = results[0]?.count;
  if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) {
    throw new Error('The Managers list did not return a valid item count.');
  }
  return Math.trunc(count);
};

export const useSharePointManagerCount = (enabled: boolean) => {
  return useQuery<number>({
    queryKey: ['sharepoint-manager-count', managerListUrl],
    queryFn: fetchManagerCount,
    enabled,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
};
