import PDFDocument from 'pdfkit';

export type StatementScopeMode = 'session_to_date' | 'per_session' | 'per_year';

export interface StatementScope {
  mode: StatementScopeMode;
  academicYearId: number | null;
  academicYearName: string | null;
  sessionIds: number[];
  includeNullSession: boolean;
  label: string;
  activeSessionId: number | null;
  sessions?: { id: number; name: string; isActive: boolean }[];
}

export interface StatementTransaction {
  number: number;
  date: Date;
  reference: string;
  description: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
  academicSessionId: number | null;
  sessionLabel: string;
}

export interface StatementSessionBreakdown {
  sessionName: string;
  fees: number;
  paid: number;
  outstanding: number;
}

export interface StatementSummary {
  totalDebit: number;
  totalCredit: number;
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
  creditBalance: number;
  unallocated: number;
  ledgerBalance: number;
}

export interface StatementPdfData {
  student: {
    id: number;
    admissionNumber: string | null;
    name: string;
    email: string | null;
    phone: string | null;
    level: number | null;
    admissionYear: number | null;
    studentType: string | null;
  };
  course: { code: string | null; name: string | null } | null;
  department: { name: string | null } | null;
  scope: StatementScope;
  transactions: StatementTransaction[];
  sessionBreakdown: StatementSessionBreakdown[];
  summary: StatementSummary;
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 36;
const CONTENT = PAGE_WIDTH - MARGIN * 2;
const FOOTER_SPACE = 64;

const FONT = 'Helvetica';
const FONT_BOLD = 'Helvetica-Bold';

const SCHOOL_NAME = process.env.SCHOOL_NAME ?? 'Apex Academy';

type Align = 'left' | 'center' | 'right';
interface Col {
  header: string;
  w: number;
  align: Align;
}

const LEDGER_COLS: Col[] = [
  { header: 'No', w: 20, align: 'center' },
  { header: 'Date', w: 55, align: 'left' },
  { header: 'Ref', w: 70, align: 'left' },
  { header: 'Description', w: 143, align: 'left' },
  { header: 'Debit (KES)', w: 75, align: 'right' },
  { header: 'Credit (KES)', w: 75, align: 'right' },
  { header: 'Balance (KES)', w: 85, align: 'right' },
];

const SUMMARY_COLS: Col[] = [
  { header: 'Session', w: 223, align: 'left' },
  { header: 'Status', w: 65, align: 'left' },
  { header: 'Fees (KES)', w: 78, align: 'right' },
  { header: 'Paid (KES)', w: 78, align: 'right' },
  { header: 'Balance (KES)', w: 79, align: 'right' },
];

function money(n: number): string {
  return n.toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function dateFmt(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function colXs(cols: Col[]): number[] {
  let x = MARGIN;
  return cols.map((c) => {
    const xs = x;
    x += c.w;
    return xs;
  });
}

function tableWidth(cols: Col[]): number {
  return cols.reduce((sum, c) => sum + c.w, 0);
}

function vLine(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  h: number,
  width = 0.5,
  color = '#cccccc',
) {
  doc.moveTo(x, y).lineTo(x, y + h).lineWidth(width).stroke(color);
}

function fillRect(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  doc.save();
  doc.rect(x, y, w, h).fill(color);
  doc.restore();
}

function drawHeaderRow(doc: PDFKit.PDFDocument, cols: Col[], y: number) {
  const xs = colXs(cols);
  const w = tableWidth(cols);
  const h = 18;
  doc
    .moveTo(MARGIN, y)
    .lineTo(MARGIN + w, y)
    .lineWidth(1)
    .stroke('#333333');
  fillRect(doc, MARGIN, y, w, h, '#e2e2e2');
  cols.forEach((c, i) => {
    if (i > 0) vLine(doc, xs[i], y, h, 0.5, '#999999');
    doc
      .font(FONT_BOLD)
      .fontSize(7.5)
      .text(c.header, xs[i] + 3, y + 6, { width: c.w - 6, align: c.align });
  });
  doc
    .moveTo(MARGIN, y + h)
    .lineTo(MARGIN + w, y + h)
    .lineWidth(0.5)
    .stroke('#999999');
}

function drawDataRow(
  doc: PDFKit.PDFDocument,
  cols: Col[],
  values: string[],
  y: number,
  h: number,
  opts: { bold?: boolean; fill?: string } = {},
) {
  const xs = colXs(cols);
  const w = tableWidth(cols);
  if (opts.fill) fillRect(doc, MARGIN, y, w, h, opts.fill);
  cols.forEach((c, i) => {
    doc
      .font(opts.bold ? FONT_BOLD : FONT)
      .fontSize(7.5)
      .text(values[i] ?? '', xs[i] + 3, y + 4, { width: c.w - 6, align: c.align });
  });
  doc
    .moveTo(MARGIN, y + h)
    .lineTo(MARGIN + w, y + h)
    .lineWidth(0.5)
    .stroke('#cccccc');
  cols.forEach((c, i) => {
    if (i > 0) vLine(doc, xs[i], y, h, 0.5, '#cccccc');
  });
}

function drawBorderedBox(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  doc.rect(x, y, w, h).lineWidth(0.75).stroke('#444444');
}

function drawStudentBox(doc: PDFKit.PDFDocument, data: StatementPdfData, y: number): number {
  const colW = CONTENT / 2;
  const labelW = 115;
  const rowH = 16;

  const rows: [string, string][] = [
    ['STUDENT NAME', data.student.name],
    ['REG NO', data.student.admissionNumber ?? '-'],
    ['PROGRAM', data.course?.name ?? '-'],
    ['ADMISSION YEAR', data.student.admissionYear?.toString() ?? '-'],
    ['DEPARTMENT', data.department?.name ?? '-'],
    ['YEAR OF STUDY', data.student.level?.toString() ?? '-'],
    ['SCHOOL', '-'],
    ['STUDENT TYPE', data.student.studentType ?? '-'],
  ];

  const boxH = (rows.length / 2) * rowH;
  drawBorderedBox(doc, MARGIN, y, CONTENT, boxH);

  rows.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN + col * colW;
    const yy = y + row * rowH;
    if (col === 1) vLine(doc, x, y, boxH, 0.5, '#999999');
    if (row > 0) {
      doc
        .moveTo(MARGIN, yy)
        .lineTo(MARGIN + CONTENT, yy)
        .lineWidth(0.5)
        .stroke('#dddddd');
    }
    doc
      .font(FONT_BOLD)
      .fontSize(7.5)
      .text(label, x + 4, yy + 5, { width: labelW - 8 });
    doc
      .font(FONT)
      .fontSize(8)
      .text(value, x + labelW + 4, yy + 5, { width: colW - labelW - 8 });
  });

  return y + boxH;
}

interface LedgerGroup {
  sessionName: string;
  items: StatementTransaction[];
}

function groupLedger(transactions: StatementTransaction[]): LedgerGroup[] {
  const groups: LedgerGroup[] = [];
  for (const t of transactions) {
    const last = groups[groups.length - 1];
    if (last && last.sessionName === t.sessionLabel) {
      last.items.push(t);
    } else {
      groups.push({ sessionName: t.sessionLabel, items: [t] });
    }
  }
  return groups;
}

function drawLedgerTable(
  doc: PDFKit.PDFDocument,
  data: StatementPdfData,
  startY: number,
): number {
  const headerH = 18;
  const rowH = 16;
  const bottomLimit = PAGE_HEIGHT - FOOTER_SPACE;

  let y = startY;

  const ensureRoom = () => {
    if (y + rowH > bottomLimit) {
      doc.addPage();
      y = MARGIN;
      drawHeaderRow(doc, LEDGER_COLS, y);
      y += headerH;
    }
  };

  doc.font(FONT_BOLD).fontSize(9).text('LEDGER', MARGIN, y);
  y += 13;
  drawHeaderRow(doc, LEDGER_COLS, y);
  y += headerH;

  const groups = groupLedger(data.transactions);

  if (groups.length === 0) {
    ensureRoom();
    drawDataRow(doc, LEDGER_COLS, ['', '', '', 'No transactions in this period', '', '', ''], y, rowH);
    y += rowH;
  } else {
    for (const group of groups) {
      ensureRoom();
      drawDataRow(doc, LEDGER_COLS, [group.sessionName, '', '', '', '', '', ''], y, rowH, {
        bold: true,
        fill: '#f2f2f2',
      });
      y += rowH;
      for (const t of group.items) {
        ensureRoom();
        drawDataRow(
          doc,
          LEDGER_COLS,
          [
            String(t.number),
            dateFmt(t.date),
            truncate(t.reference, 20),
            truncate(t.description, 58),
            t.debit ? money(t.debit) : '',
            t.credit ? money(t.credit) : '',
            money(t.balance),
          ],
          y,
          rowH,
        );
        y += rowH;
      }
    }
  }

  ensureRoom();
  const totalDebit = data.transactions.reduce((sum, t) => sum + t.debit, 0);
  const totalCredit = data.transactions.reduce((sum, t) => sum + t.credit, 0);
  const lastBalance =
    data.transactions.length > 0
      ? data.transactions[data.transactions.length - 1].balance
      : 0;
  drawDataRow(
    doc,
    LEDGER_COLS,
    ['TOTAL', '', '', '', money(totalDebit), money(totalCredit), money(lastBalance)],
    y,
    rowH,
    { bold: true, fill: '#e8e8e8' },
  );
  y += rowH;

  return y;
}

function statusFor(b: { fees: number; paid: number; outstanding: number }): string {
  if (b.fees === 0 && b.paid === 0) return 'No fees';
  if (b.outstanding < 0) return 'Credit';
  if (b.outstanding > 0) return 'Balance';
  return 'Paid';
}

function drawSummaryTable(doc: PDFKit.PDFDocument, data: StatementPdfData, startY: number): number {
  const headerH = 18;
  const rowH = 16;
  const bottomLimit = PAGE_HEIGHT - FOOTER_SPACE;

  let y = startY;
  const ensureRoom = () => {
    if (y + rowH > bottomLimit) {
      doc.addPage();
      y = MARGIN;
      drawHeaderRow(doc, SUMMARY_COLS, y);
      y += headerH;
    }
  };

  doc.font(FONT_BOLD).fontSize(9).text('SUMMARY', MARGIN, y);
  y += 13;
  drawHeaderRow(doc, SUMMARY_COLS, y);
  y += headerH;

  const breakdown = data.sessionBreakdown;
  if (breakdown.length === 0) {
    ensureRoom();
    drawDataRow(doc, SUMMARY_COLS, ['No activity', '', '', '', ''], y, rowH);
    y += rowH;
  } else {
    for (const b of breakdown) {
      ensureRoom();
      drawDataRow(
        doc,
        SUMMARY_COLS,
        [
          b.sessionName,
          statusFor(b),
          money(b.fees),
          money(b.paid),
          money(b.outstanding),
        ],
        y,
        rowH,
      );
      y += rowH;
    }
  }

  ensureRoom();
  const sumFees = breakdown.reduce((sum, b) => sum + b.fees, 0);
  const sumPaid = breakdown.reduce((sum, b) => sum + b.paid, 0);
  const sumOutstanding = breakdown.reduce((sum, b) => sum + b.outstanding, 0);
  drawDataRow(
    doc,
    SUMMARY_COLS,
    ['TOTAL', '', money(sumFees), money(sumPaid), money(sumOutstanding)],
    y,
    rowH,
    { bold: true, fill: '#e8e8e8' },
  );
  y += rowH + 8;

  const s = data.summary;
  const notes: string[] = [];
  if (s.outstandingBalance > 0) {
    notes.push(`Outstanding balance: KES ${money(s.outstandingBalance)}`);
  }
  if (s.creditBalance > 0) {
    notes.push(`Credit balance on account: KES ${money(s.creditBalance)}`);
  }
  if (s.unallocated > 0) {
    notes.push(`Unallocated payments (not applied to any invoice): KES ${money(s.unallocated)}`);
  }
  if (notes.length === 0) notes.push('Account is fully settled.');

  doc
    .font(FONT_BOLD)
    .fontSize(8)
    .text(notes.join('   |   '), MARGIN, y, { width: CONTENT });
  y += 12;

  return y;
}

function draw(doc: PDFKit.PDFDocument, data: StatementPdfData) {
  doc.font(FONT_BOLD).fontSize(15).text(SCHOOL_NAME, MARGIN, 30, {
    align: 'center',
    width: CONTENT,
  });
  doc.font(FONT_BOLD).fontSize(11).text('FEE STATEMENT', MARGIN, 50, {
    align: 'center',
    width: CONTENT,
  });
  doc.font(FONT).fontSize(8).text(
    `Scope: ${data.scope.label}    |    Generated: ${dateFmt(new Date())}`,
    MARGIN,
    68,
    { align: 'center', width: CONTENT },
  );

  let y = 92;
  y = drawStudentBox(doc, data, y);
  y += 12;
  y = drawLedgerTable(doc, data, y);
  y += 12;
  y = drawSummaryTable(doc, data, y);
  void y;

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .font(FONT)
      .fontSize(7)
      .text(
        `Page ${i - range.start + 1} of ${range.count}`,
        MARGIN,
        PAGE_HEIGHT - 28,
        { align: 'center', width: CONTENT },
      );
  }
}

export function renderStatementPdf(data: StatementPdfData): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGIN,
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    draw(doc, data);
    doc.end();
  });
}
