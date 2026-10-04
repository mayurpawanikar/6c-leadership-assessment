export type ImportedEmployee = {
  employeeId: string;
  employeeEmail: string;
  employeeName: string;
  jobTitle: string;
  managerEmail: string;
};

export type EmployeeImportResult = {
  employees: ImportedEmployee[];
  errors: string[];
};

const requiredHeaders = ['EmployeeId', 'EmployeeEmail', 'EmployeeName', 'JobTitle', 'ManagerEmail'] as const;

const decodeXml = (value: string) => value
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'");

const readUInt16 = (view: DataView, offset: number) => view.getUint16(offset, true);
const readUInt32 = (view: DataView, offset: number) => view.getUint32(offset, true);

const unzipEntry = async (bytes: Uint8Array, compression: number, expectedSize: number) => {
  if (compression === 0) return bytes;
  if (compression !== 8) throw new Error('This Excel compression format is not supported.');
  const compressedBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(compressedBuffer).set(bytes);
  const stream = new Blob([compressedBuffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const output = new Uint8Array(await new Response(stream).arrayBuffer());
  if (expectedSize > 0 && output.length !== expectedSize) throw new Error('The Excel workbook could not be decompressed.');
  return output;
};

const unzipWorkbook = async (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const files = new Map<string, Uint8Array>();
  let offset = 0;
  while (offset + 30 <= bytes.length) {
    if (readUInt32(view, offset) !== 0x04034b50) break;
    const compression = readUInt16(view, offset + 8);
    const compressedSize = readUInt32(view, offset + 18);
    const uncompressedSize = readUInt32(view, offset + 22);
    const nameLength = readUInt16(view, offset + 26);
    const extraLength = readUInt16(view, offset + 28);
    const name = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameLength));
    const dataStart = offset + 30 + nameLength + extraLength;
    if (compressedSize === 0 && (readUInt16(view, offset + 6) & 8) !== 0) throw new Error('This Excel workbook uses an unsupported ZIP layout. Save it again in Excel and retry.');
    files.set(name, await unzipEntry(bytes.slice(dataStart, dataStart + compressedSize), compression, uncompressedSize));
    offset = dataStart + compressedSize;
  }
  return files;
};

const cellValues = (sheetXml: string, sharedStrings: string[]) => {
  const rows: string[][] = [];
  const rowMatches = sheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g);
  for (const rowMatch of rowMatches) {
    const cells: string[] = [];
    const cellMatches = rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g);
    for (const cellMatch of cellMatches) {
      const reference = cellMatch[1].match(/\br="([A-Z]+)\d+"/)?.[1] ?? 'A';
      const column = reference.split('').reduce((total: number, character: string) => total * 26 + character.charCodeAt(0) - 64, 0) - 1;
      const type = cellMatch[1].match(/\bt="([^"]+)"/)?.[1];
      const raw = cellMatch[2].match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? cellMatch[2].match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? '';
      cells[column] = type === 's' ? sharedStrings[Number(raw)] ?? '' : decodeXml(raw);
    }
    rows.push(cells.map((value: string | undefined) => value?.trim() ?? ''));
  }
  return rows;
};

export const parseEmployeeWorkbook = async (file: File): Promise<EmployeeImportResult> => {
  const files = await unzipWorkbook(await file.arrayBuffer());
  const decoder = new TextDecoder();
  const sheet = files.get('xl/worksheets/sheet1.xml');
  if (!sheet) throw new Error('The first worksheet could not be found.');
  const sharedXml = files.get('xl/sharedStrings.xml');
  const sharedStrings = sharedXml
    ? Array.from(decoder.decode(sharedXml).matchAll(/<si>([\s\S]*?)<\/si>/g)).map((match: RegExpMatchArray) => decodeXml(Array.from(match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)).map((part: RegExpMatchArray) => part[1]).join('')))
    : [];
  const rows = cellValues(decoder.decode(sheet), sharedStrings);
  const headers = rows[0] ?? [];
  const indexes = requiredHeaders.map((header: typeof requiredHeaders[number]) => headers.findIndex((value: string) => value.toLowerCase() === header.toLowerCase()));
  const missing = requiredHeaders.filter((_: typeof requiredHeaders[number], index: number) => indexes[index] < 0);
  if (missing.length > 0) return { employees: [], errors: [`Missing columns: ${missing.join(', ')}`] };
  const employees: ImportedEmployee[] = [];
  const errors: string[] = [];
  rows.slice(1).forEach((row: string[], index: number) => {
    if (row.every((value: string) => !value)) return;
    const values = indexes.map((column: number) => row[column]?.trim() ?? '');
    const [employeeId, employeeEmail, employeeName, jobTitle, managerEmail] = values;
    const rowErrors: string[] = [];
    if (values.some((value: string) => !value)) rowErrors.push('all fields are required');
    if (employeeEmail && !employeeEmail.includes('@')) rowErrors.push('EmployeeEmail is invalid');
    if (managerEmail && !managerEmail.includes('@')) rowErrors.push('ManagerEmail is invalid');
    if (employees.some((employee: ImportedEmployee) => employee.employeeId.toLowerCase() === employeeId.toLowerCase())) rowErrors.push('EmployeeId is duplicated');
    if (rowErrors.length > 0) errors.push(`Row ${index + 2}: ${rowErrors.join(', ')}`);
    else employees.push({ employeeId, employeeEmail: employeeEmail.toLowerCase(), employeeName, jobTitle, managerEmail: managerEmail.toLowerCase() });
  });
  if (employees.length === 0 && errors.length === 0) errors.push('The workbook contains no employee rows.');
  return { employees, errors };
};
