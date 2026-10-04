export type PdfReportMetadata = {
  leaderName: string;
  employeeId: string;
  gcmLevel: string;
  assessmentDate: string;
  assessmentId: string;
  reviewedBy: string;
};

export type PdfFactorScore = {
  factor: string;
  score: number;
};

export type PdfSection = {
  title: string;
  body: string;
  score: number;
};

type PdfColor = readonly [number, number, number];

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const LEFT_MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - LEFT_MARGIN * 2;
const TOP_Y = 720;
const BOTTOM_Y = 62;
const BODY_FONT_SIZE = 10;
const LINE_HEIGHT = 15;
const MAX_LINE_LENGTH = 84;

const COLORS = {
  navy: [0.055, 0.122, 0.235],
  blue: [0.075, 0.286, 0.61],
  teal: [0.02, 0.455, 0.49],
  ink: [0.075, 0.118, 0.19],
  muted: [0.27, 0.333, 0.42],
  white: [1, 1, 1],
  paper: [0.975, 0.984, 0.996],
  blueTint: [0.925, 0.953, 0.992],
  tealTint: [0.91, 0.973, 0.965],
  violetTint: [0.957, 0.937, 0.992],
  amberTint: [0.992, 0.961, 0.875],
  green: [0.08, 0.48, 0.28],
  violet: [0.42, 0.22, 0.67],
  coral: [0.78, 0.25, 0.2],
  amber: [0.83, 0.48, 0.05],
  cyan: [0.02, 0.48, 0.67],
  barTrack: [0.88, 0.91, 0.95],
  rule: [0.78, 0.835, 0.91],
} satisfies Record<string, PdfColor>;

const sectionTints: PdfColor[] = [COLORS.blueTint, COLORS.tealTint, COLORS.violetTint, COLORS.amberTint];

const toPdfText = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201C\u201D]/g, '"')
  .replace(/[\u2013\u2014]/g, '-')
  .replace(/[^\x20-\x7E\n]/g, ' ')
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)');

const wrapLine = (line: string, maxLength = MAX_LINE_LENGTH): string[] => {
  const trimmedLine = line.trim();
  const markerMatch = trimmedLine.match(/^(\d+[.)]|[-*])\s+/);
  const prefix = markerMatch?.[1] ? `${markerMatch[1]} ` : '';
  const continuationPrefix = prefix ? ' '.repeat(prefix.length) : '';
  const content = markerMatch ? trimmedLine.slice(markerMatch[0].length) : trimmedLine;
  const words = content.split(/\s+/).filter((word: string) => word.length > 0);
  if (words.length === 0) return [''];
  return words.reduce((lines: string[], word: string) => {
    const current = lines.at(-1) ?? prefix;
    if (current === prefix) return [`${prefix}${word}`];
    if (`${current} ${word}`.length <= maxLength) return [...lines.slice(0, -1), `${current} ${word}`];
    return [...lines, `${continuationPrefix}${word}`];
  }, []);
};

const wrapText = (text: string): string[] => text
  .split('\n')
  .flatMap((line: string) => wrapLine(line));

const colorCommand = (color: PdfColor, stroke = false) => `${color.join(' ')} ${stroke ? 'RG' : 'rg'}`;
const rectangleCommand = (x: number, y: number, width: number, height: number, color: PdfColor) =>
  `${colorCommand(color)} ${x} ${y} ${width} ${height} re f`;
const roundedRectangleCommand = (x: number, y: number, width: number, height: number, radius: number, color: PdfColor) => {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  const kappa = 0.5522847498;
  const control = safeRadius * kappa;
  return [
    colorCommand(color),
    `${x + safeRadius} ${y} m`,
    `${x + width - safeRadius} ${y} l`,
    `${x + width - safeRadius + control} ${y} ${x + width} ${y + safeRadius - control} ${x + width} ${y + safeRadius} c`,
    `${x + width} ${y + height - safeRadius} l`,
    `${x + width} ${y + height - safeRadius + control} ${x + width - safeRadius + control} ${y + height} ${x + width - safeRadius} ${y + height} c`,
    `${x + safeRadius} ${y + height} l`,
    `${x + safeRadius - control} ${y + height} ${x} ${y + height - safeRadius + control} ${x} ${y + height - safeRadius} c`,
    `${x} ${y + safeRadius} l`,
    `${x} ${y + safeRadius - control} ${x + safeRadius - control} ${y} ${x + safeRadius} ${y} c h f`,
  ].join(' ');
};
const lineCommand = (x1: number, y1: number, x2: number, y2: number, color: PdfColor, width = 1) =>
  `${colorCommand(color, true)} ${width} w ${x1} ${y1} m ${x2} ${y2} l S`;
const textCommand = (text: string, x: number, y: number, size: number, font: 'F1' | 'F2', color: PdfColor) =>
  `${colorCommand(color)} BT /${font} ${size} Tf ${x} ${y} Td (${toPdfText(text)}) Tj ET`;
const reportBodyTextCommand = (text: string, x: number, y: number, size: number, color: PdfColor) => {
  const topicMatch = text.match(/^(\d+[.)]\s+)([^:]+:)(.*)$/);
  if (!topicMatch) return textCommand(text, x, y, size, 'F1', color);
  return `${colorCommand(color)} BT /F1 ${size} Tf ${x} ${y} Td (${toPdfText(topicMatch[1])}) Tj /F2 ${size} Tf (${toPdfText(topicMatch[2])}) Tj /F1 ${size} Tf (${toPdfText(topicMatch[3])}) Tj ET`;
};

export const downloadLeadershipReportPdf = (title: string, summary: string, sections: PdfSection[], metadata: PdfReportMetadata, _factorScores: PdfFactorScore[], sixCScore: number, developmentInsightsScore: number) => {
  const pages: string[][] = [[]];
  let pageIndex = 0;
  let y = TOP_Y;

  const addPageFrame = () => {
    const commands = pages[pageIndex];
    commands.push(rectangleCommand(0, 0, PAGE_WIDTH, PAGE_HEIGHT, COLORS.paper));
    commands.push(rectangleCommand(24, PAGE_HEIGHT - 12, PAGE_WIDTH - 48, 2, COLORS.rule));
    commands.push(rectangleCommand(36, PAGE_HEIGHT - 12, 52, 2, COLORS.teal));
    commands.push(textCommand('6C LEADERSHIP POTENTIAL ASSESSMENT FRAMEWORK', 36, PAGE_HEIGHT - 32, 8, 'F2', COLORS.navy));
  };

  const newPage = () => {
    pages.push([]);
    pageIndex += 1;
    y = TOP_Y;
    addPageFrame();
  };

  const addLine = (text: string, options?: { size?: number; bold?: boolean; gapAfter?: number; color?: PdfColor; indent?: number }) => {
    const size = options?.size ?? BODY_FONT_SIZE;
    if (y < BOTTOM_Y + LINE_HEIGHT) newPage();
    pages[pageIndex].push(textCommand(text, LEFT_MARGIN + (options?.indent ?? 0), y, size, options?.bold ? 'F2' : 'F1', options?.color ?? COLORS.ink));
    y -= LINE_HEIGHT + (options?.gapAfter ?? 0);
  };

  addPageFrame();
  pages[0].push(roundedRectangleCommand(24, 552, PAGE_WIDTH - 48, 170, 22, COLORS.navy));
  pages[0].push(roundedRectangleCommand(422, 578, 142, 120, 18, COLORS.teal));
  pages[0].push(textCommand('6C', 462, 620, 44, 'F2', COLORS.white));
  pages[0].push(textCommand('ASSESSMENT', 449, 598, 10, 'F2', COLORS.white));
  y = 674;
  addLine('PERSONAL DEVELOPMENT REPORT', { size: 9, bold: true, color: COLORS.white, gapAfter: 8 });
  if (title === 'Your Document-Aware Development Analysis') {
    addLine('Your Document-Aware', { size: 22, bold: true, color: COLORS.white });
    addLine('Development Analysis', { size: 22, bold: true, color: COLORS.white, gapAfter: 5 });
  } else {
    wrapLine(title, 34).slice(0, 2).forEach((titleLine: string, index: number) => {
      addLine(titleLine, { size: 22, bold: true, color: COLORS.white, gapAfter: index === 0 ? 0 : 5 });
    });
  }
  addLine('A focused 6C leadership report grounded in your assessment answers and uploaded document.', { size: 9, color: COLORS.white });
  y = 532;
  addLine('LEADER PROFILE', { size: 9, bold: true, color: COLORS.blue, gapAfter: 5 });
  y -= 3;
  const metadataRows = [
    [{ label: 'NAME OF THE LEADER', value: metadata.leaderName }, { label: 'DAS ID', value: metadata.employeeId }, { label: 'GCM LEVEL', value: metadata.gcmLevel }],
    [{ label: 'ASSESSMENT DATE', value: metadata.assessmentDate }, { label: 'ASSESSMENT ID', value: metadata.assessmentId }, { label: 'REVIEWED BY', value: metadata.reviewedBy }],
  ];
  metadataRows.forEach((row: { label: string; value: string }[], rowIndex: number) => {
    const cardY = y - 54;
    row.forEach((item: { label: string; value: string }, index: number) => {
      const cardWidth = (CONTENT_WIDTH - 16) / 3;
      const cardX = LEFT_MARGIN + index * (cardWidth + 8);
      const tint = sectionTints[(rowIndex * 3 + index) % sectionTints.length];
      const accent = [COLORS.blue, COLORS.teal, COLORS.violet, COLORS.coral, COLORS.amber, COLORS.green][rowIndex * 3 + index];
      pages[0].push(roundedRectangleCommand(cardX, cardY, cardWidth, 48, 10, tint));
      pages[0].push(roundedRectangleCommand(cardX + 10, cardY + 38, 28, 4, 2, accent));
      pages[0].push(textCommand(item.label, cardX + 12, cardY + 27, 7, 'F2', COLORS.muted));
      wrapLine(item.value || 'Not provided', 23).slice(0, 2).forEach((line: string, lineIndex: number) => {
        pages[0].push(textCommand(line, cardX + 12, cardY + 11 - lineIndex * 9, 9, 'F2', COLORS.ink));
      });
    });
    y -= 62;
  });
  y -= 4;
  addLine('RESULTS AT A GLANCE', { size: 9, bold: true, color: COLORS.blue, gapAfter: 5 });
  pages[0].push(roundedRectangleCommand(LEFT_MARGIN, y + 5, CONTENT_WIDTH, 3, 1.5, COLORS.rule));
  y -= 8;
  const normalizedSixCScore = Math.max(0, Math.min(4, sixCScore));
  const normalizedDevelopmentScore = Math.max(0, Math.min(4, developmentInsightsScore));
  const scoreCardWidth = (CONTENT_WIDTH - 8) / 2;
  pages[0].push(roundedRectangleCommand(LEFT_MARGIN, y - 28, scoreCardWidth, 38, 10, COLORS.blue));
  pages[0].push(textCommand('6C SCORE', LEFT_MARGIN + 14, y - 2, 9, 'F2', COLORS.white));
  pages[0].push(textCommand(`${normalizedSixCScore.toFixed(1)} / 4`, LEFT_MARGIN + scoreCardWidth - 76, y - 7, 18, 'F2', COLORS.white));
  pages[0].push(roundedRectangleCommand(LEFT_MARGIN + scoreCardWidth + 8, y - 28, scoreCardWidth, 38, 10, COLORS.teal));
  pages[0].push(textCommand('11 INSIGHTS SCORE', LEFT_MARGIN + scoreCardWidth + 22, y - 2, 9, 'F2', COLORS.white));
  pages[0].push(textCommand(`${normalizedDevelopmentScore.toFixed(1)} / 4`, LEFT_MARGIN + CONTENT_WIDTH - 76, y - 7, 18, 'F2', COLORS.white));
  y -= 50;
  addLine('DEVELOPMENT SUMMARY', { size: 9, bold: true, color: COLORS.blue, gapAfter: 5 });
  pages[0].push(roundedRectangleCommand(LEFT_MARGIN, y + 5, CONTENT_WIDTH, 3, 1.5, COLORS.rule));
  y -= 8;
  const summaryLines = wrapText(summary);
  const summaryHeight = summaryLines.length * LINE_HEIGHT + 22;
  pages[0].push(roundedRectangleCommand(LEFT_MARGIN, y - summaryHeight + 12, CONTENT_WIDTH, summaryHeight, 12, COLORS.amberTint));
  pages[0].push(roundedRectangleCommand(LEFT_MARGIN + 12, y - 2, 34, 5, 2.5, COLORS.amber));
  y -= 13;
  summaryLines.forEach((line: string) => addLine(line, { size: 10, color: COLORS.ink, indent: 12 }));
  y -= 12;
  addLine('YOUR 11 DEVELOPMENT INSIGHTS', { size: 9, bold: true, color: COLORS.blue, gapAfter: 3 });
  addLine('A concise, document-aware view of strengths, priorities, and next-level actions.', { size: 9, color: COLORS.muted, gapAfter: 7 });
  pages[pageIndex].push(roundedRectangleCommand(LEFT_MARGIN, y + 5, CONTENT_WIDTH, 3, 1.5, COLORS.rule));
  y -= 10;
  const scoreColors: PdfColor[] = [COLORS.blue, COLORS.teal, COLORS.violet, COLORS.coral, COLORS.amber, COLORS.green];
  const cardGap = 12;
  const cardWidth = (CONTENT_WIDTH - cardGap) / 2;
  const bodyLineHeight = 10;
  const cardPadding = 12;
  for (let index = 0; index < sections.length; index += 2) {
    const rowSections = sections.slice(index, index + 2);
    const preparedSections = rowSections.map((section: PdfSection) => ({
      section,
      titleLines: wrapLine(section.title, 27).slice(0, 2),
      bodyLines: section.body.split('\n').flatMap((line: string) => wrapLine(line, 39)),
    }));
    const rowHeight = Math.max(...preparedSections.map((item: { titleLines: string[]; bodyLines: string[] }) =>
      54 + item.titleLines.length * 11 + item.bodyLines.length * bodyLineHeight));
    if (y - rowHeight < BOTTOM_Y) {
      newPage();
      addLine('YOUR 11 DEVELOPMENT INSIGHTS — CONTINUED', { size: 9, bold: true, color: COLORS.blue, gapAfter: 5 });
      pages[pageIndex].push(roundedRectangleCommand(LEFT_MARGIN, y + 5, CONTENT_WIDTH, 3, 1.5, COLORS.rule));
      y -= 10;
    }
    preparedSections.forEach((item: { section: PdfSection; titleLines: string[]; bodyLines: string[] }, columnIndex: number) => {
      const sectionIndex = index + columnIndex;
      const cardX = LEFT_MARGIN + columnIndex * (cardWidth + cardGap);
      const cardBottom = y - rowHeight;
      const sectionColor = scoreColors[sectionIndex % scoreColors.length];
      const normalizedSectionScore = Math.max(0, Math.min(4, item.section.score));
      pages[pageIndex].push(roundedRectangleCommand(cardX, cardBottom, cardWidth, rowHeight, 12, sectionTints[sectionIndex % sectionTints.length]));
      pages[pageIndex].push(roundedRectangleCommand(cardX, cardBottom + rowHeight - 7, cardWidth, 7, 3.5, sectionColor));
      pages[pageIndex].push(roundedRectangleCommand(cardX + cardPadding, cardBottom + rowHeight - 38, 28, 20, 10, sectionColor));
      pages[pageIndex].push(textCommand(String(sectionIndex + 1).padStart(2, '0'), cardX + 19, cardBottom + rowHeight - 31, 9, 'F2', COLORS.white));
      pages[pageIndex].push(roundedRectangleCommand(cardX + cardWidth - 60, cardBottom + rowHeight - 39, 48, 21, 10, sectionColor));
      pages[pageIndex].push(textCommand(`${normalizedSectionScore.toFixed(1)} / 4`, cardX + cardWidth - 52, cardBottom + rowHeight - 32, 8, 'F2', COLORS.white));
      item.titleLines.forEach((line: string, lineIndex: number) => {
        pages[pageIndex].push(textCommand(line, cardX + cardPadding, cardBottom + rowHeight - 54 - lineIndex * 11, 10, 'F2', COLORS.navy));
      });
      const bodyStartY = cardBottom + rowHeight - 54 - item.titleLines.length * 11 - 8;
      item.bodyLines.forEach((line: string, lineIndex: number) => {
        pages[pageIndex].push(reportBodyTextCommand(line, cardX + cardPadding, bodyStartY - lineIndex * bodyLineHeight, 8, COLORS.ink));
      });
    });
    y -= rowHeight + cardGap;
  }
  if (y < 250) newPage();
  addLine('NEXT STEP: TURN INSIGHTS INTO YOUR IDP', { size: 9, bold: true, color: COLORS.blue, gapAfter: 5 });
  pages[pageIndex].push(roundedRectangleCommand(LEFT_MARGIN, y + 5, CONTENT_WIDTH, 3, 1.5, COLORS.rule));
  y -= 12;
  const idpSteps = [
    { title: '1. Review', body: 'Discuss the report, development priorities, and supporting evidence with your manager.' },
    { title: '2. Agree', body: 'Select the actions, outcomes, measures, support, and target dates that matter most for your role.' },
    { title: '3. Carry Forward', body: 'Use the agreed goals and actions to update your IDP and guide ongoing development check-ins.' },
  ];
  idpSteps.forEach((step: { title: string; body: string }, index: number) => {
    const cardY = y - 64;
    const cardWidth = (CONTENT_WIDTH - 16) / 3;
    const cardX = LEFT_MARGIN + index * (cardWidth + 8);
    const tint = index === 2 ? COLORS.tealTint : COLORS.blueTint;
    pages[pageIndex].push(roundedRectangleCommand(cardX, cardY, cardWidth, 58, 10, tint));
    pages[pageIndex].push(textCommand(step.title, cardX + 12, cardY + 39, 9, 'F2', COLORS.navy));
    wrapLine(step.body, 25).slice(0, 4).forEach((line: string, lineIndex: number) => {
      pages[pageIndex].push(textCommand(line, cardX + 12, cardY + 25 - lineIndex * 9, 8, 'F1', COLORS.ink));
    });
  });
  y -= 84;
  addLine('DEVELOPMENT GUIDANCE ONLY', { size: 9, bold: true, color: COLORS.blue, gapAfter: 3 });
  wrapText('Missing document evidence does not prove a capability is absent. Review identified differences and extraction limitations with your manager. This report supports development and does not make an employment or promotion decision.').forEach((line: string) => addLine(line, { size: 9, color: COLORS.muted }));

  const objects: string[] = [];
  const addObject = (content: string) => {
    objects.push(content);
    return objects.length;
  };

  const catalogId = addObject('');
  const pagesId = addObject('');
  const regularFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const boldFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pageIds: number[] = [];

  pages.forEach((commands: string[], index: number) => {
    commands.push(roundedRectangleCommand(LEFT_MARGIN, 47, CONTENT_WIDTH, 2, 1, COLORS.rule));
    const footer = textCommand(`6C Leadership Potential Assessment Framework  |  Page ${index + 1} of ${pages.length}`, LEFT_MARGIN, 32, 8, 'F1', COLORS.muted);
    const stream = `${commands.join('\n')}\n${footer}`;
    const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id: number) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object: string, index: number) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset: number) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `6c-assessment-${metadata.employeeId || 'report'}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
