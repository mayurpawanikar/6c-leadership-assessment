import { copilotChat } from '../../app-gen-sdk/data/workiq/m365-mcp-clients';

type OperationResult = { success: boolean; message: string };

const escapeInstruction = (value: string) => value.replace(/["\\]/g, (character: string) => `\\${character}`);

export const createSharePointListItem = async (siteUrl: string, listName: string, fields: Record<string, string | boolean>) => {
  const listUrl = `${siteUrl}/Lists/${encodeURIComponent(listName)}/AllItems.aspx`;
  const fieldText = Object.entries(fields).map(([name, value]: [string, string | boolean]) => `${name}="${escapeInstruction(String(value))}"`).join(', ');
  const results = await copilotChat<OperationResult>({
    message: `Use only the SharePoint list ${listUrl}. Create exactly one list item with these fields: ${fieldText}. Do not modify any existing item. Return success true only after SharePoint confirms creation, plus a concise message.`,
    responseSchema: { success: 'boolean', message: 'string' },
    enableWebSearch: false,
  });
  const result = results[0];
  if (!result?.success) throw new Error(result?.message || `SharePoint did not confirm creation in ${listName}.`);
  return result;
};

export const upsertSharePointListItem = async (siteUrl: string, listName: string, fields: Record<string, string | boolean>) => {
  const listUrl = `${siteUrl}/Lists/${encodeURIComponent(listName)}/AllItems.aspx`;
  const entries = Object.entries(fields);
  const identity = entries.find(([name]: [string, string | boolean]) => ['employeeid', 'useremail'].includes(name.toLowerCase())) ?? entries[0];
  const fieldText = entries.map(([name, value]: [string, string | boolean]) => `${name}="${escapeInstruction(String(value))}"`).join(', ');
  const results = await copilotChat<OperationResult>({
    message: `Use only the SharePoint list ${listUrl}. Find an item where ${identity[0]} exactly equals "${escapeInstruction(String(identity[1]))}", ignoring case and surrounding whitespace. If found, update it with ${fieldText}; otherwise create one item with those fields. Return success true only after SharePoint confirms the operation, plus a concise message.`,
    responseSchema: { success: 'boolean', message: 'string' },
    enableWebSearch: false,
  });
  const result = results[0];
  if (!result?.success) throw new Error(result?.message || `SharePoint did not confirm the change in ${listName}.`);
  return result;
};
