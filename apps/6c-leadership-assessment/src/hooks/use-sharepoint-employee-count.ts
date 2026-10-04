import { useQuery } from '@tanstack/react-query';
import { copilotChat } from '../../app-gen-sdk/data/workiq/m365-mcp-clients';
import { sharePointRoleConfig } from '@/config/sharepoint-role-config';

interface EmployeeCountResult {
  count: number;
}

const employeeListUrl = `${sharePointRoleConfig.siteUrl}/Lists/${sharePointRoleConfig.lists.employees}/AllItems.aspx`;

const fetchEmployeeCount = async () => {
  const results = await copilotChat<EmployeeCountResult>({
    message: `Use only the exact SharePoint Employees list at ${employeeListUrl}. Count every list item, including active and inactive employees. Return exactly one result containing the total integer in the count field. Do not estimate, infer, use another list, or return the number of search results.`,
    responseSchema: { count: 'number' },
    enableWebSearch: false,
  });
  const count = results[0]?.count;
  if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) {
    throw new Error('The Employees list did not return a valid item count.');
  }
  return Math.trunc(count);
};

export const useSharePointEmployeeCount = (enabled: boolean) => {
  return useQuery<number>({
    queryKey: ['sharepoint-employee-count', employeeListUrl],
    queryFn: fetchEmployeeCount,
    enabled,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
};
