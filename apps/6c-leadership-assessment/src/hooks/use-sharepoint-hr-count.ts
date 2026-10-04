import { useQuery } from '@tanstack/react-query';
import { copilotChat } from '../../app-gen-sdk/data/workiq/m365-mcp-clients';
import { sharePointRoleConfig } from '@/config/sharepoint-role-config';

interface HrCountResult {
  count: number;
}

const hrListUrl = `${sharePointRoleConfig.siteUrl}/Lists/${sharePointRoleConfig.lists.hrUsers}/AllItems.aspx`;

const fetchHrCount = async () => {
  const results = await copilotChat<HrCountResult>({
    message: `Use only the exact SharePoint HRUsers list at ${hrListUrl}. Count every list item, including active and inactive HR users. Return exactly one result containing the total integer in the count field. Do not estimate, infer, use another list, or return the number of search results.`,
    responseSchema: { count: 'number' },
    enableWebSearch: false,
  });
  const count = results[0]?.count;
  if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) {
    throw new Error('The HRUsers list did not return a valid item count.');
  }
  return Math.trunc(count);
};

export const useSharePointHrCount = (enabled: boolean) => {
  return useQuery<number>({
    queryKey: ['sharepoint-hr-count', hrListUrl],
    queryFn: fetchHrCount,
    enabled,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
};
