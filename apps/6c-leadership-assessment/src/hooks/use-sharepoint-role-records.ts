import { useQuery } from '@tanstack/react-query';
import { copilotChat } from '../../app-gen-sdk/data/workiq/m365-mcp-clients';
import { sharePointRoleConfig } from '@/config/sharepoint-role-config';


export interface SharePointHRUser {
  userEmail: string;
  userName: string;
  isActive: boolean;
}

export interface SharePointEmployee {
  employeeId: string;
  employeeEmail: string;
  employeeName: string;
  jobTitle: string;
  managerEmail: string;
  isActive: boolean;
}

export interface SharePointManager {
  managerEmail: string;
  managerName: string;
  isActive: boolean;
}

export interface SharePointAdmin {
  adminEmail: string;
  adminName: string;
  isActive: boolean;
}

const siteInstruction = `Use only the SharePoint site ${sharePointRoleConfig.siteUrl}.`;
const employeeListUrl = `${sharePointRoleConfig.siteUrl}/Lists/${sharePointRoleConfig.lists.employees}/AllItems.aspx`;
const managerListUrl = `${sharePointRoleConfig.siteUrl}/Lists/${sharePointRoleConfig.lists.managers}/AllItems.aspx`;
const hrUsersListUrl = `${sharePointRoleConfig.siteUrl}/Lists/${sharePointRoleConfig.lists.hrUsers}/AllItems.aspx`;
const adminListUrl = `${sharePointRoleConfig.siteUrl}/Lists/${sharePointRoleConfig.lists.admins}/AllItems.aspx`;
const extractEmail = (value: unknown): string => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase().replace(/^mailto:/, '');
    const claimsEmail = normalized.split('|').at(-1)?.trim() ?? normalized;
    return claimsEmail.match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/)?.[0] ?? claimsEmail;
  }
  if (Array.isArray(value)) {
    return value.map((item: unknown) => extractEmail(item)).find((email: string) => email.includes('@')) ?? '';
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['Email', 'email', 'UserEmail', 'userEmail', 'value', 'Value', 'claims', 'Claims']) {
      const email = extractEmail(record[key]);
      if (email.includes('@')) return email;
    }
  }
  return '';
};

const normalizeEmail = (value: string | null | undefined) => extractEmail(value);

const normalizeActive = (value: unknown) => {
  if (value === undefined || value === null || String(value).trim() === '') return true;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return ['true', 'yes', '1', 'active'].includes(String(value).trim().toLowerCase());
};



export interface SignedInIdentity {
  email?: string;
  objectId?: string;
}

export interface SharePointRoleRecords {
  hrUsers: SharePointHRUser[];
  employees: SharePointEmployee[];
  directReports: SharePointEmployee[];
  managers: SharePointManager[];
  admins: SharePointAdmin[];
  matchedRoles: { employee: boolean; manager: boolean; hr: boolean; admin: boolean };
}

interface EmployeeResolution {
  matched: boolean;
  employeeId: string;
  employeeEmail: string;
  employeeName: string;
  jobTitle: string;
  managerEmail: string;
}
interface DirectReportResolution {
  employeeId: string;
  employeeEmail: string;
  employeeName: string;
  jobTitle: string;
  managerEmail: string;
  isActive: boolean;
}


interface ManagerResolution {
  managerEmail: string;
  managerName: string;
  isActive: boolean;
}
interface HrUserResolution {
  matched: boolean;
  userEmail: string;
  userName: string;
  isActive: boolean;
}


interface AdminResolution {
  matched: boolean;
  adminEmail: string;
  adminName: string;
  isActive: boolean;
}

const normalizeId = (value: string | null | undefined) => String(value ?? '').trim().toLowerCase();

export const useSharePointRoleRecords = ({ email, objectId }: SignedInIdentity) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedObjectId = normalizeId(objectId);

  return useQuery<SharePointRoleRecords>({
    queryKey: ['sharepoint-role-records', sharePointRoleConfig.siteUrl, sharePointRoleConfig.lists, normalizedEmail, normalizedObjectId],
    enabled: Boolean(normalizedEmail || normalizedObjectId),
    queryFn: async () => {
      if (!normalizedEmail && !normalizedObjectId) throw new Error('The signed-in user identity is unavailable.');
      const identity = `signed-in email "${normalizedEmail || 'unavailable'}" and Microsoft Entra object ID "${normalizedObjectId || 'unavailable'}"`;
      const resolveEmployee = async (): Promise<EmployeeResolution> => {
        try {
          const employeeResults = await copilotChat<EmployeeResolution>({
            message: `${siteInstruction} Use the exact Employees list at ${employeeListUrl}. Find an item for ${identity}. Match the exact EmployeeEmail column case-insensitively to the signed-in email. EmployeeEmail may be plain text, a SharePoint Person field whose Email property contains the address, or a claims value ending in the address. As a fallback, match EmployeeID to the Entra object ID. The item grants access when IsActive is true, Yes, 1, Active, omitted, or blank. Return exactly one result with matched false when no qualifying item exists. Do not infer a record.`,
            responseSchema: { matched: 'boolean', employeeId: 'string', employeeEmail: 'string', employeeName: 'string', jobTitle: 'string', managerEmail: 'string' },
            enableWebSearch: false,
          });
          return employeeResults[0] ?? { matched: false, employeeId: '', employeeEmail: '', employeeName: '', jobTitle: '', managerEmail: '' };
        } catch (error: unknown) {
          throw new Error(error instanceof Error ? `Employee role lookup failed: ${error.message}` : 'Employee role lookup failed.');
        }
      };
      const resolveDirectReports = async (): Promise<DirectReportResolution[]> => {
        if (!normalizedEmail) return [];
        try {
          return await copilotChat<DirectReportResolution>({
            message: `${siteInstruction} Use the exact Employees list at ${employeeListUrl}. Return only employees whose exact ManagerEmail column matches "${normalizedEmail}" case-insensitively. ManagerEmail may be plain text, a SharePoint Person field whose Email property contains the address, or a claims value ending in the address. Include only active items where IsActive is true, Yes, 1, Active, omitted, or blank. Map EmployeeID to employeeId, EmployeeEmail to employeeEmail, EmployeeName to employeeName, JobTitle to jobTitle, ManagerEmail to managerEmail, and IsActive to isActive. Return every qualifying direct report and no other employee. Do not infer records.`,
            responseSchema: { employeeId: 'string', employeeEmail: 'string', employeeName: 'string', jobTitle: 'string', managerEmail: 'string', isActive: 'boolean' },
            enableWebSearch: false,
          });
        } catch (error: unknown) {
          throw new Error(error instanceof Error ? `Direct report lookup failed: ${error.message}` : 'Direct report lookup failed.');
        }
      };
      const resolveManager = async (): Promise<ManagerResolution> => {
        if (!normalizedEmail) return { managerEmail: '', managerName: '', isActive: false };
        try {
          const managerResults = await copilotChat<ManagerResolution>({
            message: `${siteInstruction} Read only the exact Managers SharePoint list at ${managerListUrl}. Search the ManagerEmail column for the exact address "${normalizedEmail}", ignoring case and surrounding whitespace. ManagerEmail may be plain text, a SharePoint Person field Email property, or a claims value ending with the address. For the matching list item, map the stored ManagerEmail to managerEmail, ManagerName to managerName, and IsActive to isActive. Treat Yes, true, 1, or Active as active. Return exactly one matching stored record and no other records. If no exact match exists, return one result with empty strings and isActive false. Do not use the Employees list, do not infer membership, and do not return a boolean matched field.`,
            responseSchema: { managerEmail: 'string', managerName: 'string', isActive: 'boolean' },
            enableWebSearch: false,
          });
          return managerResults[0] ?? { managerEmail: '', managerName: '', isActive: false };
        } catch (error: unknown) {
          throw new Error(error instanceof Error ? `Manager role lookup failed: ${error.message}` : 'Manager role lookup failed.');
        }
      };
      const resolveHrUser = async (): Promise<HrUserResolution> => {
        if (!normalizedEmail) return { matched: false, userEmail: '', userName: '', isActive: false };
        try {
          const hrResults = await copilotChat<HrUserResolution>({
            message: `${siteInstruction} Read the exact HRUsers SharePoint list at ${hrUsersListUrl}. Search the UserEmail column for the exact signed-in address "${normalizedEmail}", ignoring case and surrounding whitespace. UserEmail may be text, a Person field Email property, or a claims value ending with the address. Return the matching stored email in userEmail, UserName in userName, and the stored IsActive value in isActive. Blank or omitted IsActive means true. Return one matched record only; otherwise return one record with matched false and empty values. Never infer membership from other content.`,
            responseSchema: { matched: 'boolean', userEmail: 'string', userName: 'string', isActive: 'boolean' },
            enableWebSearch: false,
          });
          return hrResults[0] ?? { matched: false, userEmail: '', userName: '', isActive: false };
        } catch (error: unknown) {
          throw new Error(error instanceof Error ? `HR role lookup failed: ${error.message}` : 'HR role lookup failed.');
        }
      };
      const resolveAdmin = async (): Promise<AdminResolution> => {
        if (!normalizedEmail) return { matched: false, adminEmail: '', adminName: '', isActive: false };
        try {
          const adminResults = await copilotChat<AdminResolution>({
            message: `${siteInstruction} Read the exact Admins SharePoint list at ${adminListUrl}. Search the AdminEmail column for the exact signed-in address "${normalizedEmail}", ignoring case and surrounding whitespace. AdminEmail may be text, a Person field Email property, or a claims value ending with the address. Return the matching stored email in adminEmail, AdminName in adminName, and the stored IsActive value in isActive. Blank or omitted IsActive means true. Return one matched record only; otherwise return one record with matched false and empty values. Never infer membership from other content.`,
            responseSchema: { matched: 'boolean', adminEmail: 'string', adminName: 'string', isActive: 'boolean' },
            enableWebSearch: false,
          });
          return adminResults[0] ?? { matched: false, adminEmail: '', adminName: '', isActive: false };
        } catch (error: unknown) {
          throw new Error(error instanceof Error ? `Admin role lookup failed: ${error.message}` : 'Admin role lookup failed.');
        }
      };

      const resolveMembership = async () => {
        const employee = await resolveEmployee();
        const manager = await resolveManager();
        const hr = await resolveHrUser();
        const admin = await resolveAdmin();
        return { employee, manager, hr, admin };
      };
      const hasMembershipCandidate = (result: Awaited<ReturnType<typeof resolveMembership>>) =>
        result.employee.matched === true
        || normalizeEmail(result.employee.employeeEmail) === normalizedEmail
        || (Boolean(normalizedObjectId) && normalizeId(result.employee.employeeId) === normalizedObjectId)
        || normalizeEmail(result.manager.managerEmail) === normalizedEmail
        || result.hr.matched === true
        || normalizeEmail(result.hr.userEmail) === normalizedEmail
        || result.admin.matched === true
        || normalizeEmail(result.admin.adminEmail) === normalizedEmail;

      let membership = await resolveMembership();
      if (!hasMembershipCandidate(membership)) {
        membership = await resolveMembership();
      }
      const resolution = membership.employee;
      const managerResolution = membership.manager;
      const hrResolution = membership.hr;
      const adminResolution = membership.admin;
      const directReportResults = normalizeEmail(managerResolution.managerEmail) === normalizedEmail
        ? await resolveDirectReports()
        : [];
      const employeeMatch = resolution.matched === true || normalizeEmail(resolution.employeeEmail) === normalizedEmail || (Boolean(normalizedObjectId) && normalizeId(resolution.employeeId) === normalizedObjectId);
      const employees: SharePointEmployee[] = employeeMatch ? [{
        employeeId: resolution.employeeId ?? '',
        employeeEmail: resolution.employeeEmail || normalizedEmail,
        employeeName: resolution.employeeName ?? '',
        jobTitle: resolution.jobTitle ?? '',
        managerEmail: resolution.managerEmail ?? '',
        isActive: true,
      }] : [];
      const directReports: SharePointEmployee[] = directReportResults
        .filter((employee: DirectReportResolution) => normalizeEmail(employee.managerEmail) === normalizedEmail && normalizeActive(employee.isActive))
        .map((employee: DirectReportResolution) => ({
          employeeId: String(employee.employeeId ?? '').trim(),
          employeeEmail: normalizeEmail(employee.employeeEmail),
          employeeName: String(employee.employeeName ?? '').trim(),
          jobTitle: String(employee.jobTitle ?? '').trim(),
          managerEmail: normalizeEmail(employee.managerEmail),
          isActive: true,
        }));
      const managerMatch = normalizeEmail(managerResolution.managerEmail) === normalizedEmail && normalizeActive(managerResolution.isActive);
      const managers: SharePointManager[] = managerMatch ? [{
        managerEmail: normalizeEmail(managerResolution.managerEmail),
        managerName: managerResolution.managerName ?? '',
        isActive: true,
      }] : [];
      const hrMatch = (hrResolution.matched === true && normalizeActive(hrResolution.isActive)) || normalizeEmail(hrResolution.userEmail) === normalizedEmail;
      const hrUsers: SharePointHRUser[] = hrMatch ? [{
        userEmail: normalizeEmail(hrResolution.userEmail),
        userName: hrResolution.userName ?? '',
        isActive: true,
      }] : [];
      const adminMatch = (adminResolution.matched === true && normalizeActive(adminResolution.isActive)) || normalizeEmail(adminResolution.adminEmail) === normalizedEmail;
      const admins: SharePointAdmin[] = adminMatch ? [{
        adminEmail: normalizeEmail(adminResolution.adminEmail),
        adminName: adminResolution.adminName ?? '',
        isActive: true,
      }] : [];

      return {
        hrUsers,
        employees,
        directReports,
        managers,
        admins,
        matchedRoles: { employee: employeeMatch, manager: managerMatch, hr: hrMatch, admin: adminMatch },
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};
