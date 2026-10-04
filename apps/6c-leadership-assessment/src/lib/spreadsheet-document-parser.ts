const MAX_EXTRACTED_CHARACTERS = 12000;
const utf8Decoder = new TextDecoder('utf-8');

const readUInt16 = (view: DataView, offset: number) => view.getUint16(offset, true);
const readUInt32 = (view: DataView, offset: number) => view.getUint32(offset, true);

const decodeXmlEntities = (value: string) => value
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_match: string, code: string) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_match: string, code: string) => String.fromCodePoint(Number.parseInt(code, 16)));

const unzipEntries = async (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const entries = new Map<string, Uint8Array>();
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset -= 1) {
    if (readUInt32(view, offset) !== 0x06054b50) continue;
    const directoryOffset = readUInt32(view, offset + 16);
    const entryCount = readUInt16(view, offset + 10);
    let entryOffset = directoryOffset;
    for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
      if (readUInt32(view, entryOffset) !== 0x02014b50) throw new Error('The Excel workbook directory is invalid.');
      const compression = readUInt16(view, entryOffset + 10);
      const compressedSize = readUInt32(view, entryOffset + 20);
      const nameLength = readUInt16(view, entryOffset + 28);
      const extraLength = readUInt16(view, entryOffset + 30);
      const commentLength = readUInt16(view, entryOffset + 32);
      const localOffset = readUInt32(view, entryOffset + 42);
      const name = utf8Decoder.decode(bytes.slice(entryOffset + 46, entryOffset + 46 + nameLength));
      if (readUInt32(view, localOffset) !== 0x04034b50) throw new Error('The Excel workbook entry is invalid.');
      const localNameLength = readUInt16(view, localOffset + 26);
      const localExtraLength = readUInt16(view, localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.slice(dataStart, dataStart + compressedSize);
      if (compression === 0) entries.set(name, compressed);
      else if (compression === 8 && typeof DecompressionStream !== 'undefined') {
        const ownedBytes = Uint8Array.from(compressed);
        const stream = new Blob([ownedBytes.buffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        entries.set(name, new Uint8Array(await new Response(stream).arrayBuffer()));
      }
      entryOffset += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
  }
  throw new Error('The selected file is not a valid XLSX workbook.');
};

const extractSharedStrings = (xml: string) => Array.from(xml.matchAll(/<si>([\s\S]*?)<\/si>/g)).map((match: RegExpMatchArray) => decodeXmlEntities(Array.from(match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)).map((part: RegExpMatchArray) => part[1]).join('')));

const extractSheetRows = (xml: string, sharedStrings: string[]) => Array.from(xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)).map((rowMatch: RegExpMatchArray) => {
  const cells = Array.from(rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)).map((cellMatch: RegExpMatchArray) => {
    const type = cellMatch[1].match(/\bt="([^"]+)"/)?.[1];
    const raw = cellMatch[2].match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? cellMatch[2].match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? '';
    return type === 's' ? sharedStrings[Number(raw)] ?? '' : decodeXmlEntities(raw);
  });
  return cells.filter((value: string) => value.trim().length > 0).join(' | ');
}).filter((row: string) => row.length > 0);

export const extractSpreadsheetText = async (buffer: ArrayBuffer) => {
  const entries = await unzipEntries(buffer);
  const sharedEntry = entries.get('xl/sharedStrings.xml');
  const sharedStrings = sharedEntry ? extractSharedStrings(utf8Decoder.decode(sharedEntry)) : [];
  const sheets = Array.from(entries.entries())
    .filter(([name]: [string, Uint8Array]) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort(([left]: [string, Uint8Array], [right]: [string, Uint8Array]) => left.localeCompare(right, undefined, { numeric: true }));
  if (sheets.length === 0) throw new Error('No readable worksheets were found in this XLSX workbook.');
  return sheets.map(([name, bytes]: [string, Uint8Array], index: number) => {
    const rows = extractSheetRows(utf8Decoder.decode(bytes), sharedStrings);
    return `Worksheet ${index + 1} (${name.split('/').at(-1)}):\n${rows.join('\n')}`;
  }).join('\n\n').slice(0, MAX_EXTRACTED_CHARACTERS);
};
