import { extractSpreadsheetText } from '@/lib/spreadsheet-document-parser';

export interface UploadedSupportingDocumentFile {
  id: string;
  name: string;
  type: string;
  size: number;
  extractedText: string;
  extractionStatus: 'ready' | 'limited';
}

const MAX_EXTRACTED_CHARACTERS = 12000;
const pdfTextDecoder = new TextDecoder('latin1');
const utf8TextDecoder = new TextDecoder('utf-8');
const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const ODT_MIME_TYPE = 'application/vnd.oasis.opendocument.text';
const PPTX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const LEGACY_OFFICE_EXTENSIONS = ['.doc', '.xls', '.ppt'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg'];

const decodePdfLiteral = (value: string) => value
  .replace(/\\([nrtbf()\\])/g, (_match: string, token: string) => {
    const replacements: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' };
    return replacements[token] ?? token;
  })
  .replace(/\\([0-7]{1,3})/g, (_match: string, octal: string) => String.fromCharCode(Number.parseInt(octal, 8)));

const decodePdfHex = (value: string) => {
  const normalized = value.replace(/\s+/g, '');
  const padded = normalized.length % 2 === 0 ? normalized : `${normalized}0`;
  const bytes = new Uint8Array(padded.length / 2);
  for (let index = 0; index < padded.length; index += 2) bytes[index / 2] = Number.parseInt(padded.slice(index, index + 2), 16);
  const utf16 = bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff;
  if (!utf16) return pdfTextDecoder.decode(bytes);
  return Array.from({ length: (bytes.length - 2) / 2 }, (_value: unknown, index: number) => String.fromCharCode((bytes[index * 2 + 2] << 8) | bytes[index * 2 + 3])).join('');
};

const extractTextOperators = (content: string) => {
  const fragments: string[] = [];
  const textBlocks = content.match(/BT[\s\S]*?ET/g) ?? [];
  textBlocks.forEach((block: string) => {
    const tokens = block.match(/\((?:\\.|[^\\()])*\)|<[0-9a-fA-F\s]+>/g) ?? [];
    tokens.forEach((token: string) => {
      const value = token.startsWith('(') ? decodePdfLiteral(token.slice(1, -1)) : decodePdfHex(token.slice(1, -1));
      const cleaned = value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g, '').replace(/\s+/g, ' ').trim();
      if (cleaned.length > 1) fragments.push(cleaned);
    });
  });
  return fragments;
};

const inflateStream = async (bytes: Uint8Array) => {
  if (typeof DecompressionStream === 'undefined') return '';
  try {
    const ownedBytes = Uint8Array.from(bytes);
    const input = new Blob([ownedBytes.buffer]).stream().pipeThrough(new DecompressionStream('deflate'));
    return pdfTextDecoder.decode(await new Response(input).arrayBuffer());
  } catch {
    return '';
  }
};

const extractPdfText = async (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  const binary = pdfTextDecoder.decode(bytes);
  if (!binary.startsWith('%PDF-')) throw new Error('The selected file is not a valid PDF document.');
  if (/\/Encrypt\b/.test(binary)) throw new Error('Password-protected PDF files are not supported.');

  const fragments = extractTextOperators(binary);
  const streamPattern = /<<(.*?)>>\s*stream\r?\n/gs;
  for (const match of binary.matchAll(streamPattern)) {
    if (!match[1]?.includes('/FlateDecode') || match.index === undefined) continue;
    const streamStart = match.index + match[0].length;
    const streamEnd = binary.indexOf('endstream', streamStart);
    if (streamEnd < 0) continue;
    let dataEnd = streamEnd;
    while (dataEnd > streamStart && (bytes[dataEnd - 1] === 10 || bytes[dataEnd - 1] === 13)) dataEnd -= 1;
    const inflated = await inflateStream(bytes.slice(streamStart, dataEnd));
    if (inflated) fragments.push(...extractTextOperators(inflated));
  }

  return fragments.join(' ').replace(/\s+/g, ' ').trim().slice(0, MAX_EXTRACTED_CHARACTERS);
};

const readUInt16 = (view: DataView, offset: number) => view.getUint16(offset, true);
const readUInt32 = (view: DataView, offset: number) => view.getUint32(offset, true);

const extractZipEntry = async (buffer: ArrayBuffer, targetName: string) => {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset -= 1) {
    if (readUInt32(view, offset) !== 0x06054b50) continue;
    const directoryOffset = readUInt32(view, offset + 16);
    const entryCount = readUInt16(view, offset + 10);
    let entryOffset = directoryOffset;
    for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
      if (readUInt32(view, entryOffset) !== 0x02014b50) throw new Error('The DOCX file directory is invalid.');
      const compression = readUInt16(view, entryOffset + 10);
      const compressedSize = readUInt32(view, entryOffset + 20);
      const nameLength = readUInt16(view, entryOffset + 28);
      const extraLength = readUInt16(view, entryOffset + 30);
      const commentLength = readUInt16(view, entryOffset + 32);
      const localOffset = readUInt32(view, entryOffset + 42);
      const name = utf8TextDecoder.decode(bytes.slice(entryOffset + 46, entryOffset + 46 + nameLength));
      if (name === targetName) {
        if (readUInt32(view, localOffset) !== 0x04034b50) throw new Error('The DOCX file entry is invalid.');
        const localNameLength = readUInt16(view, localOffset + 26);
        const localExtraLength = readUInt16(view, localOffset + 28);
        const dataStart = localOffset + 30 + localNameLength + localExtraLength;
        const compressed = bytes.slice(dataStart, dataStart + compressedSize);
        if (compression === 0) return compressed;
        if (compression !== 8 || typeof DecompressionStream === 'undefined') throw new Error('This DOCX compression format is not supported.');
        const ownedBytes = Uint8Array.from(compressed);
        const stream = new Blob([ownedBytes.buffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return new Uint8Array(await new Response(stream).arrayBuffer());
      }
      entryOffset += 46 + nameLength + extraLength + commentLength;
    }
    break;
  }
  throw new Error('The selected file is not a valid DOCX document.');
};

const decodeXmlEntities = (value: string) => value
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_match: string, code: string) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_match: string, code: string) => String.fromCodePoint(Number.parseInt(code, 16)));

const extractDocxText = async (buffer: ArrayBuffer) => {
  const documentXml = utf8TextDecoder.decode(await extractZipEntry(buffer, 'word/document.xml'));
  const text = documentXml
    .replace(/<w:tab\b[^>]*\/>/g, '\t')
    .replace(/<w:br\b[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeXmlEntities(text).replace(/[ \t]+/g, ' ').replace(/\n\s*/g, '\n').trim().slice(0, MAX_EXTRACTED_CHARACTERS);
};

const extractOpenDocumentText = async (buffer: ArrayBuffer) => {
  const contentXml = utf8TextDecoder.decode(await extractZipEntry(buffer, 'content.xml'));
  const text = contentXml
    .replace(/<text:tab\b[^>]*\/>/g, '\t')
    .replace(/<text:line-break\b[^>]*\/>/g, '\n')
    .replace(/<\/text:p>/g, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeXmlEntities(text).replace(/[ \t]+/g, ' ').replace(/\n\s*/g, '\n').trim().slice(0, MAX_EXTRACTED_CHARACTERS);
};

const extractRtfText = async (file: File) => {
  const rtf = await file.text();
  return rtf
    .replace(/\\par[d]?\b/g, '\n')
    .replace(/\\'[0-9a-fA-F]{2}/g, (value: string) => String.fromCharCode(Number.parseInt(value.slice(2), 16)))
    .replace(/\\[a-z]+-?\d* ?/gi, '')
    .replace(/[{}]/g, '')
    .replace(/\\([{}\\])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_EXTRACTED_CHARACTERS);
};

const extractTextFile = async (file: File) => (await file.text()).replace(/\u0000/g, '').trim().slice(0, MAX_EXTRACTED_CHARACTERS);

export const extractSupportingDocumentFile = async (file: File): Promise<UploadedSupportingDocumentFile> => {
  const lowerName = file.name.toLowerCase();
  const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
  const isDocx = file.type === DOCX_MIME_TYPE || lowerName.endsWith('.docx');
  const isXlsx = file.type === XLSX_MIME_TYPE || lowerName.endsWith('.xlsx');
  const isOdt = file.type === ODT_MIME_TYPE || lowerName.endsWith('.odt');
  const isPptx = file.type === PPTX_MIME_TYPE || lowerName.endsWith('.pptx');
  const isPlainText = file.type === 'text/plain' || lowerName.endsWith('.txt') || lowerName.endsWith('.csv');
  const isRtf = file.type === 'application/rtf' || file.type === 'text/rtf' || lowerName.endsWith('.rtf');
  const isImage = file.type.startsWith('image/') || IMAGE_EXTENSIONS.some((extension: string) => lowerName.endsWith(extension));
  const isLegacyOffice = LEGACY_OFFICE_EXTENSIONS.some((extension: string) => lowerName.endsWith(extension));
  if (!isPdf && !isDocx && !isXlsx && !isOdt && !isPptx && !isPlainText && !isRtf && !isImage && !isLegacyOffice) throw new Error(`${file.name} is not a supported document or image file.`);

  let extractedText = '';
  if (isPdf) extractedText = await extractPdfText(await file.arrayBuffer());
  else if (isDocx) extractedText = await extractDocxText(await file.arrayBuffer());
  else if (isXlsx) extractedText = await extractSpreadsheetText(await file.arrayBuffer());
  else if (isOdt) extractedText = await extractOpenDocumentText(await file.arrayBuffer());
  else if (isPlainText) extractedText = await extractTextFile(file);
  else if (isRtf) extractedText = await extractRtfText(file);
  else if (isPptx) extractedText = `[PowerPoint supporting document: ${file.name}. The presentation is retained for the same AI review workflow; slide text extraction requires tenant document processing when available.]`;
  else if (isImage) extractedText = `[Image supporting document: ${file.name}. Visual content is retained for the same AI review workflow; text extraction requires tenant OCR when available.]`;
  else extractedText = `[Legacy Office supporting document: ${file.name}. The file is retained for the same AI review workflow; save it in a current Office format for local text extraction.]`;

  const locallyReadable = isXlsx || isPdf || isDocx || isOdt || isPlainText || isRtf;
  return {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    extractedText,
    extractionStatus: locallyReadable && extractedText.length >= 40 ? 'ready' : 'limited',
  };
};
