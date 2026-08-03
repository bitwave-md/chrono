import { existsSync } from "node:fs";
import path from "node:path";

import PDFDocument from "pdfkit";

import { TimeReportDocument, type TimeReportDocumentInput } from "@/modules/time-tracking/domain/time-report-document";

const palette = {
  ink: "#171717",
  muted: "#62666D",
  line: "#D9DCE1",
  surface: "#F5F6F7",
  accent: "#D69E2E",
  billable: "#16805C",
};

export class ClientTimeReportPdfService {
  async generate(input: TimeReportDocumentInput): Promise<Buffer> {
    const document = new TimeReportDocument(input);
    const regularFont = fontPath("NotoSans-Regular.ttf");
    const boldFont = fontPath("NotoSans-Bold.ttf");
    const pdf = new PDFDocument({ size: "A4", layout: "landscape", margin: 36, font: regularFont, info: { Title: `Time report - ${document.subjectName}`, Author: "Chrono" } });
    pdf.registerFont("Noto", regularFont);
    pdf.registerFont("Noto-Bold", boldFont);
    const chunks: Buffer[] = [];
    const completed = new Promise<Buffer>((resolve, reject) => {
      pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
      pdf.on("end", () => resolve(Buffer.concat(chunks)));
      pdf.on("error", reject);
    });
    new TimeReportPdfRenderer(pdf, document).render();
    pdf.end();
    return completed;
  }
}

class TimeReportPdfRenderer {
  readonly #pdf: PDFKit.PDFDocument;
  readonly #report: TimeReportDocument;
  readonly #layout: PdfLayout;

  constructor(pdf: PDFKit.PDFDocument, report: TimeReportDocument) {
    this.#pdf = pdf;
    this.#report = report;
    this.#layout = new PdfLayout(pdf);
  }

  render(): void {
    this.#header();
    this.#summary();
    this.#dailyCharts();
    this.#categoryChart();
    this.#breakdown("By project", this.#report.projects.map((row) => ({ label: row.name, hours: row.hours, detail: `${row.entryCount} entries` })));
    this.#tasks();
  }

  #header(): void {
    const { pdf, report, layout } = this;
    pdf.font("Noto-Bold").fontSize(9).fillColor(palette.accent).text("CHRONO TIME REPORT", layout.left, layout.y, { characterSpacing: 1.2 });
    layout.y += 22;
    pdf.font("Noto-Bold").fontSize(24).fillColor(palette.ink).text(report.subjectName, layout.left, layout.y, { width: layout.width });
    layout.y = pdf.y + 4;
    pdf.font("Noto").fontSize(9).fillColor(palette.muted).text(`${report.subjectType} | ${report.periodLabel} | ${report.scopeLabel}`, layout.left, layout.y);
    layout.y = pdf.y + 4;
    pdf.text(`Generated ${report.generatedLabel}. Durations are rounded to the nearest whole hour; 30 minutes rounds up.`, layout.left, layout.y);
    layout.y = pdf.y + 10;
    if (report.truncated) {
      pdf.font("Noto-Bold").fontSize(7.5).fillColor(palette.accent).text("This report contains the newest 1,000 matching entries. Narrow the period for a complete reconciliation.", layout.left, layout.y);
      layout.y = pdf.y + 12;
    } else layout.y += 6;
  }

  #summary(): void {
    const cards = [
      { label: "Total time", value: hours(this.#report.totalHours) },
      { label: "Billable", value: hours(this.#report.billableHours) },
      { label: "Projects", value: String(this.#report.projectCount) },
      { label: "Contributors", value: String(this.#report.contributorCount) },
    ];
    const gap = 10;
    const width = (this.#layout.width - gap * 3) / 4;
    this.#layout.ensure(70);
    cards.forEach((card, index) => {
      const x = this.#layout.left + index * (width + gap);
      this.#pdf.roundedRect(x, this.#layout.y, width, 58, 5).fill(palette.surface);
      this.#pdf.font("Noto").fontSize(8).fillColor(palette.muted).text(card.label, x + 12, this.#layout.y + 10, { width: width - 24 });
      this.#pdf.font("Noto-Bold").fontSize(18).fillColor(palette.ink).text(card.value, x + 12, this.#layout.y + 27, { width: width - 24 });
    });
    this.#layout.y += 74;
  }

  #dailyCharts(): void {
    const segments = chunk(this.#report.daily, 31);
    segments.forEach((rows, index) => {
      const suffix = segments.length > 1 ? ` (${index + 1} of ${segments.length})` : "";
      this.#layout.ensure(184);
      this.#layout.section(`Time over period${suffix}`);
      const chartTop = this.#layout.y + 8;
      const chartHeight = 86;
      const baseline = chartTop + chartHeight;
      const maximum = Math.max(1, ...rows.map((row) => row.hours));
      const slot = this.#layout.width / Math.max(rows.length, 1);
      this.#pdf.strokeColor(palette.line).lineWidth(0.5).moveTo(this.#layout.left, baseline).lineTo(this.#layout.right, baseline).stroke();
      rows.forEach((row, itemIndex) => {
        const barHeight = row.hours ? Math.max(3, (row.hours / maximum) * chartHeight) : 0;
        const barWidth = Math.min(15, slot * 0.58);
        const x = this.#layout.left + itemIndex * slot + (slot - barWidth) / 2;
        if (barHeight) this.#pdf.roundedRect(x, baseline - barHeight, barWidth, barHeight, 2).fill(palette.accent);
        this.#pdf.font("Noto-Bold").fontSize(6.5).fillColor(palette.ink).text(String(row.hours), this.#layout.left + itemIndex * slot, baseline + 7, { align: "center", width: slot });
        this.#pdf.font("Noto").fontSize(5.8).fillColor(palette.muted).text(row.label, this.#layout.left + itemIndex * slot, baseline + 18, { align: "center", width: slot });
      });
      this.#pdf.font("Noto").fontSize(6.5).fillColor(palette.muted).text("Rounded hours are shown below every day.", this.#layout.left, baseline + 34);
      this.#layout.y = baseline + 52;
    });
  }

  #categoryChart(): void {
    this.#layout.ensure(199);
    this.#layout.section("By time entry type");
    const centerX = this.#layout.left + 82;
    const centerY = this.#layout.y + 72;
    const radius = 58;
    let start = -90;
    for (const row of this.#report.categories) {
      if (!row.share) continue;
      const end = start + row.share * 360;
      this.#pdf.save().path(pieSlicePath(centerX, centerY, radius, start, Math.min(end, start + 359.99))).fill(row.color).restore();
      start = end;
    }
    this.#pdf.font("Noto-Bold").fontSize(14).fillColor(palette.ink).text(hours(this.#report.totalHours), centerX - 40, centerY - 7, { align: "center", width: 80 });
    this.#pdf.font("Noto").fontSize(7).fillColor(palette.muted).text("total", centerX - 40, centerY + 10, { align: "center", width: 80 });
    const legendX = this.#layout.left + 180;
    const columns = 2;
    const columnWidth = (this.#layout.width - 180) / columns;
    this.#report.categories.forEach((row, index) => {
      const column = index % columns;
      const line = Math.floor(index / columns);
      const x = legendX + column * columnWidth;
      const y = this.#layout.y + line * 18 + 8;
      this.#pdf.circle(x + 4, y + 4, 3.5).fill(row.color);
      this.#pdf.font("Noto").fontSize(8).fillColor(palette.muted).text(row.name, x + 14, y, { ellipsis: true, width: columnWidth - 78 });
      this.#pdf.font("Noto-Bold").fillColor(palette.ink).text(hours(row.hours), x + columnWidth - 62, y, { align: "right", width: 56 });
    });
    this.#layout.y += Math.max(150, Math.ceil(this.#report.categories.length / columns) * 18 + 16);
  }

  #breakdown(title: string, rows: Array<{ label: string; hours: number; detail: string }>): void {
    this.#layout.ensure(58);
    this.#layout.section(title);
    for (const row of rows) {
      this.#layout.ensure(24);
      this.#pdf.font("Noto").fontSize(8).fillColor(palette.ink).text(row.label, this.#layout.left, this.#layout.y + 5, { ellipsis: true, width: this.#layout.width - 180 });
      this.#pdf.fillColor(palette.muted).text(row.detail, this.#layout.right - 170, this.#layout.y + 5, { align: "right", width: 100 });
      this.#pdf.font("Noto-Bold").fillColor(palette.ink).text(hours(row.hours), this.#layout.right - 65, this.#layout.y + 5, { align: "right", width: 65 });
      this.#pdf.strokeColor(palette.line).moveTo(this.#layout.left, this.#layout.y + 22).lineTo(this.#layout.right, this.#layout.y + 22).stroke();
      this.#layout.y += 23;
    }
  }

  #tasks(): void {
    this.#layout.ensure(98);
    this.#layout.section("Time entries grouped by task");
    for (const task of this.#report.tasks) {
      this.#layout.ensure(64);
      const title = `${task.identifier}  ${task.title}`;
      const titleHeight = this.#pdf.font("Noto-Bold").fontSize(9).heightOfString(title, { width: this.#layout.width - 190 });
      const headerHeight = Math.max(34, titleHeight + 17);
      this.#pdf.roundedRect(this.#layout.left, this.#layout.y, this.#layout.width, headerHeight, 4).fill(palette.surface);
      this.#pdf.font("Noto-Bold").fontSize(9).fillColor(palette.ink).text(title, this.#layout.left + 10, this.#layout.y + 8, { width: this.#layout.width - 190 });
      this.#pdf.font("Noto").fontSize(7).fillColor(palette.muted).text(task.project, this.#layout.right - 175, this.#layout.y + 8, { align: "right", ellipsis: true, width: 105 });
      this.#pdf.font("Noto-Bold").fontSize(9).fillColor(palette.ink).text(hours(task.hours), this.#layout.right - 60, this.#layout.y + 8, { align: "right", width: 50 });
      this.#layout.y += headerHeight;
      this.#entryColumns();
      for (const entry of task.entries) this.#entry(entry, task.identifier);
      this.#layout.y += 7;
    }
  }

  #entryColumns(): void {
    this.#layout.ensure(20);
    this.#pdf.font("Noto-Bold").fontSize(6.5).fillColor(palette.muted);
    for (const column of entryColumns(this.#layout.left)) this.#pdf.text(column.label, column.x, this.#layout.y + 5, { width: column.width });
    this.#layout.y += 19;
  }

  #entry(entry: TimeReportDocument["tasks"][number]["entries"][number], taskIdentifier: string): void {
    const columns = entryColumns(this.#layout.left);
    this.#pdf.font("Noto").fontSize(7.3);
    const noteHeight = this.#pdf.heightOfString(entry.note, { width: columns[3].width - 8 });
    const rowHeight = Math.max(25, noteHeight + 10);
    if (this.#layout.ensure(rowHeight)) {
      this.#pdf.font("Noto-Bold").fontSize(8).fillColor(palette.muted).text(`${taskIdentifier} continued`, this.#layout.left, this.#layout.y);
      this.#layout.y += 16;
      this.#entryColumns();
    }
    const values = [entry.date, entry.person, entry.type, entry.note, entry.billable ? "Yes" : "No", hours(entry.hours)];
    values.forEach((value, index) => this.#pdf.font(index === 5 ? "Noto-Bold" : "Noto").fontSize(7.3).fillColor(index === 4 && entry.billable ? palette.billable : palette.ink).text(value, columns[index].x, this.#layout.y + 6, { align: index === 5 ? "right" : "left", width: columns[index].width - 8 }));
    this.#pdf.strokeColor(palette.line).lineWidth(0.4).moveTo(this.#layout.left, this.#layout.y + rowHeight).lineTo(this.#layout.right, this.#layout.y + rowHeight).stroke();
    this.#layout.y += rowHeight;
  }

  get pdf() { return this.#pdf; }
  get report() { return this.#report; }
  get layout() { return this.#layout; }
}

class PdfLayout {
  readonly #pdf: PDFKit.PDFDocument;
  pageNumber = 1;
  y = 36;

  constructor(pdf: PDFKit.PDFDocument) {
    this.#pdf = pdf;
    this.#footer();
  }

  get left() { return 36; }
  get right() { return this.#pdf.page.width - 36; }
  get width() { return this.right - this.left; }

  ensure(height: number): boolean {
    if (this.y + height <= this.#pdf.page.height - 58) return false;
    this.#pdf.addPage();
    this.pageNumber += 1;
    this.y = 36;
    this.#footer();
    return true;
  }

  section(title: string): void {
    this.ensure(34);
    this.#pdf.font("Noto-Bold").fontSize(11).fillColor(palette.ink).text(title, this.left, this.y);
    this.y = this.#pdf.y + 8;
  }

  #footer(): void {
    this.#pdf.font("Noto").fontSize(6.5).fillColor(palette.muted).text(`Chrono | Page ${this.pageNumber}`, this.left, this.#pdf.page.height - 47, { align: "right", width: this.width });
  }
}

function entryColumns(left: number) {
  const widths = [76, 130, 105, 330, 55, 60];
  const labels = ["DATE", "PERSON", "TYPE", "NOTE", "BILLABLE", "ROUNDED"];
  let x = left;
  return widths.map((width, index) => { const column = { x, width, label: labels[index] }; x += width; return column; });
}

function hours(value: number): string { return `${value} h`; }
function chunk<T>(values: T[], size: number): T[][] { return Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size)); }

function pieSlicePath(centerX: number, centerY: number, radius: number, start: number, end: number): string {
  const startRadians = start * Math.PI / 180;
  const endRadians = end * Math.PI / 180;
  const startX = centerX + radius * Math.cos(startRadians);
  const startY = centerY + radius * Math.sin(startRadians);
  const endX = centerX + radius * Math.cos(endRadians);
  const endY = centerY + radius * Math.sin(endRadians);
  const largeArc = end - start > 180 ? 1 : 0;
  return `M ${centerX} ${centerY} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY} Z`;
}

function fontPath(filename: string): string {
  const bundled = path.join(process.cwd(), "assets", "time-tracking", filename);
  return existsSync(bundled) ? bundled : path.join(process.cwd(), "src", "modules", "time-tracking", "assets", filename);
}
