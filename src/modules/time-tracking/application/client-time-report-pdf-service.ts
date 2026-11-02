import { existsSync } from "node:fs";
import path from "node:path";

import PDFDocument from "pdfkit";

import { TimeReportDocument, type TimeReportDocumentInput } from "@/modules/time-tracking/domain/time-report-document";
import type { ReportMessages } from "@/modules/time-tracking/domain/report-locale";

const palette = {
  ink: "#0F172A",
  body: "#334155",
  muted: "#64748B",
  faint: "#94A3B8",
  line: "#E2E8F0",
  surface: "#F8FAFC",
  weekend: "#F1F5F9",
  bandFrom: "#0B1220",
  bandTo: "#134E4A",
  accent: "#0D9488",
  accentBright: "#2DD4BF",
  accentSoft: "#CCFBF1",
  peak: "#10B981",
  billable: "#047857",
  billableSoft: "#D1FAE5",
  warn: "#B45309",
  warnSoft: "#FEF3C7",
};

const rankColors = ["#6366F1", "#0D9488", "#F59E0B", "#EC4899", "#0EA5E9", "#8B5CF6", "#84CC16", "#F97316"];
const pageMargin = 36;
const cardRadius = 9;
const pageBottom = 68;

export class ClientTimeReportPdfService {
  async generate(input: TimeReportDocumentInput): Promise<Buffer> {
    const document = new TimeReportDocument(input);
    const regularFont = fontPath("NotoSans-Regular.ttf");
    const boldFont = fontPath("NotoSans-Bold.ttf");
    const pdf = new PDFDocument({ size: "A4", layout: "landscape", margin: pageMargin, font: regularFont, info: { Title: document.messages.documentTitle(document.subjectName), Author: "Chrono" } });
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

interface ShareRow {
  name: string;
  color: string;
  hours: number;
  share: number;
}

class TimeReportPdfRenderer {
  readonly #pdf: PDFKit.PDFDocument;
  readonly #report: TimeReportDocument;
  readonly #messages: ReportMessages;
  readonly #layout: PdfLayout;

  constructor(pdf: PDFKit.PDFDocument, report: TimeReportDocument) {
    this.#pdf = pdf;
    this.#report = report;
    this.#messages = report.messages;
    this.#layout = new PdfLayout(pdf, report);
  }

  render(): void {
    this.#band();
    this.#summary();
    this.#dailyCharts();
    this.#distribution();
    this.#tasks();
  }

  #hours(value: number): string {
    return this.#messages.hoursUnit(value);
  }

  /** Single-line text that is cut with an ellipsis instead of wrapping into the next row. */
  #line(text: string, x: number, y: number, width: number, align: "left" | "right" | "center" = "left", characterSpacing = 0): void {
    this.#pdf.text(text, x, y, { align, width, height: this.#pdf.currentLineHeight(), ellipsis: true, lineBreak: false, characterSpacing });
  }

  #card(x: number, y: number, width: number, height: number): void {
    this.#pdf.roundedRect(x, y, width, height, cardRadius).lineWidth(0.8).fillAndStroke("#FFFFFF", palette.line);
  }

  #pill(text: string, x: number, y: number, style: { background: string; color: string; size?: number; height?: number; padX?: number }): number {
    const { background, color, size = 7, height = 14, padX = 7 } = style;
    this.#pdf.font("Noto-Bold").fontSize(size);
    const width = this.#pdf.widthOfString(text) + padX * 2;
    this.#pdf.roundedRect(x, y, width, height, height / 2).fill(background);
    this.#pdf.fillColor(color).text(text, x + padX, y + (height - size) / 2 - 0.4, { lineBreak: false });
    return width;
  }

  #band(): void {
    const { pdf, layout } = this;
    const report = this.#report;
    const pageWidth = pdf.page.width;
    const heroWidth = 190;
    const textWidth = layout.width - heroWidth - 24;

    pdf.font("Noto-Bold").fontSize(26);
    const nameHeight = Math.min(pdf.heightOfString(report.subjectName, { width: textWidth }), pdf.currentLineHeight() * 2);
    const periodY = 52 + nameHeight + 8;
    const metaY = periodY + 19;
    pdf.font("Noto").fontSize(6.8);
    const generatedHeight = pdf.heightOfString(this.#messages.generatedLine(report.generatedLabel), { width: textWidth });
    const generatedY = metaY + 18;
    const bandHeight = Math.max(generatedY + generatedHeight + 22, 132);

    pdf.save();
    pdf.rect(0, 0, pageWidth, bandHeight).clip();
    const gradient = pdf.linearGradient(0, 0, pageWidth, bandHeight);
    gradient.stop(0, palette.bandFrom).stop(1, palette.bandTo);
    pdf.rect(0, 0, pageWidth, bandHeight).fill(gradient);
    pdf.circle(pageWidth - 70, 20, 150).fillOpacity(0.05).fill("#FFFFFF");
    pdf.circle(pageWidth - 250, bandHeight + 30, 110).fillOpacity(0.16).fill(palette.accent);
    pdf.circle(40, bandHeight + 60, 90).fillOpacity(0.07).fill(palette.accentBright);
    pdf.restore();

    pdf.font("Noto-Bold").fontSize(7);
    const kickerWidth = pdf.widthOfString(this.#messages.kicker, { characterSpacing: 1.3 }) + 20;
    pdf.roundedRect(layout.left, 28, kickerWidth, 16, 8).fillOpacity(0.13).fill("#FFFFFF");
    pdf.fillOpacity(1).fillColor(palette.accentBright).text(this.#messages.kicker, layout.left + 10, 32.5, { lineBreak: false, characterSpacing: 1.3 });

    pdf.font("Noto-Bold").fontSize(26).fillColor("#FFFFFF").text(report.subjectName, layout.left, 52, { width: textWidth, height: nameHeight, ellipsis: true });
    pdf.font("Noto-Bold").fontSize(12).fillColor(palette.accentBright);
    this.#line(report.periodLabel, layout.left, periodY, textWidth);
    pdf.font("Noto").fontSize(8.5).fillColor("#CBD5E1");
    this.#line(`${report.subjectTypeLabel}  ·  ${report.scopeLabel}`, layout.left, metaY, textWidth);
    pdf.font("Noto").fontSize(6.8).fillColor(palette.faint).text(this.#messages.generatedLine(report.generatedLabel), layout.left, generatedY, { width: textWidth });

    const heroX = layout.right - heroWidth;
    pdf.font("Noto-Bold").fontSize(7).fillColor(palette.faint);
    this.#line(this.#messages.cardTotalTime.toLocaleUpperCase(this.#messages.intlLocale), heroX, 34, heroWidth, "right", 1);
    pdf.font("Noto-Bold").fontSize(40).fillColor("#FFFFFF");
    this.#line(this.#hours(report.totalHours), heroX, 46, heroWidth, "right");
    pdf.font("Noto-Bold").fontSize(8.5).fillColor(palette.accentBright);
    this.#line(`${this.#messages.cardBillable} ${this.#hours(report.billableHours)}  ·  ${Math.round(report.billableShare * 100)}%`, heroX, 98, heroWidth, "right");

    layout.y = bandHeight + 16;
    if (report.truncated) {
      pdf.font("Noto-Bold").fontSize(7.5);
      const height = pdf.heightOfString(this.#messages.truncationNotice, { width: layout.width - 28 }) + 14;
      pdf.roundedRect(layout.left, layout.y, layout.width, height, 6).fill(palette.warnSoft);
      pdf.fillColor(palette.warn).text(this.#messages.truncationNotice, layout.left + 14, layout.y + 7, { width: layout.width - 28 });
      layout.y += height + 12;
    }
  }

  #summary(): void {
    const { pdf, layout } = this;
    const report = this.#report;
    const cards = [
      { label: this.#messages.cardBillable, value: this.#hours(report.billableHours), color: palette.peak, meta: `${Math.round(report.billableShare * 100)}%`, progress: report.billableShare },
      { label: this.#messages.cardEntries, value: String(report.entryCount), color: "#6366F1" },
      { label: this.#messages.cardProjects, value: String(report.projectCount), color: "#F59E0B" },
      { label: this.#messages.cardContributors, value: String(report.contributorCount), color: "#0EA5E9" },
    ];
    const gap = 12;
    const width = (layout.width - gap * 3) / 4;
    const height = 70;
    layout.ensure(height + 14);
    cards.forEach((card, index) => {
      const x = layout.left + index * (width + gap);
      this.#card(x, layout.y, width, height);
      pdf.circle(x + 15, layout.y + 16, 3.2).fill(card.color);
      pdf.font("Noto").fontSize(8).fillColor(palette.muted);
      this.#line(card.label, x + 25, layout.y + 11.5, width - 90);
      if (card.meta) {
        pdf.font("Noto-Bold").fontSize(8).fillColor(palette.billable);
        this.#line(card.meta, x + width - 62, layout.y + 11.5, 48, "right");
      }
      pdf.font("Noto-Bold").fontSize(21).fillColor(palette.ink);
      this.#line(card.value, x + 15, layout.y + 27, width - 30);
      if (card.progress !== undefined) {
        pdf.roundedRect(x + 15, layout.y + height - 12, width - 30, 3.5, 1.75).fill(palette.line);
        if (card.progress > 0) {
          const fillGradient = pdf.linearGradient(x + 15, 0, x + width - 15, 0);
          fillGradient.stop(0, palette.peak).stop(1, palette.accentBright);
          pdf.roundedRect(x + 15, layout.y + height - 12, Math.max(3.5, (width - 30) * card.progress), 3.5, 1.75).fill(fillGradient);
        }
      }
    });
    layout.y += height + 14;
  }

  #dailyCharts(): void {
    const { pdf, layout } = this;
    const segments = chunk(this.#report.daily, 31);
    segments.forEach((rows, index) => {
      const minimumHeight = 160;
      layout.ensure(minimumHeight + 14);
      const available = pdf.page.height - pageBottom - layout.y - 14;
      const height = index === 0 ? Math.min(250, Math.max(minimumHeight, available)) : minimumHeight;
      const top = layout.y;
      this.#card(layout.left, top, layout.width, height);
      pdf.font("Noto-Bold").fontSize(10.5).fillColor(palette.ink).text(`${this.#messages.timeOverPeriod}${this.#messages.segmentSuffix(index + 1, segments.length)}`, layout.left + 16, top + 14, { lineBreak: false });
      pdf.font("Noto").fontSize(6.5).fillColor(palette.muted);
      this.#line(this.#messages.dailyHint, layout.right - 316, top + 16, 300, "right");

      const plotLeft = layout.left + 38;
      const plotRight = layout.right - 16;
      const plotTop = top + 52;
      const plotHeight = height - 88;
      const baseline = plotTop + plotHeight;
      const maximum = Math.max(1, ...rows.map((row) => row.hours));
      const peak = Math.max(...rows.map((row) => row.hours));
      const slot = (plotRight - plotLeft) / Math.max(rows.length, 1);

      rows.forEach((row, itemIndex) => {
        if (isWeekend(row.date)) pdf.roundedRect(plotLeft + itemIndex * slot + 0.5, plotTop - 8, slot - 1, plotHeight + 28, 3).fill(palette.weekend);
      });
      for (const fraction of [0, 0.5, 1]) {
        const y = baseline - fraction * plotHeight;
        pdf.save().lineWidth(0.5).strokeColor(palette.line);
        if (fraction > 0) pdf.dash(2, { space: 2.5 });
        pdf.moveTo(plotLeft, y).lineTo(plotRight, y).stroke().restore();
      }
      pdf.font("Noto").fontSize(6).fillColor(palette.faint);
      this.#line(String(maximum), layout.left + 12, plotTop - 3, 20, "right");
      this.#line("0", layout.left + 12, baseline - 3, 20, "right");

      rows.forEach((row, itemIndex) => {
        const slotX = plotLeft + itemIndex * slot;
        const barHeight = row.hours ? Math.max(3, (row.hours / maximum) * plotHeight) : 0;
        const barWidth = Math.min(15, slot * 0.58);
        const x = slotX + (slot - barWidth) / 2;
        const isPeak = row.hours > 0 && row.hours === peak;
        if (barHeight) {
          const barGradient = pdf.linearGradient(0, baseline - barHeight, 0, baseline);
          barGradient.stop(0, isPeak ? palette.peak : palette.accentBright).stop(1, palette.accent);
          pdf.roundedRect(x, baseline - barHeight, barWidth, barHeight, Math.min(3, barWidth / 2)).fill(barGradient);
          pdf.font("Noto-Bold").fontSize(6.5).fillColor(isPeak ? palette.billable : palette.body);
          this.#line(String(row.hours), slotX - 3, baseline - barHeight - 10, slot + 6, "center");
        }
        pdf.font("Noto").fontSize(5.8).fillColor(isWeekend(row.date) ? palette.faint : palette.muted);
        this.#line(row.label, slotX - 4, baseline + 8, slot + 8, "center");
      });
      layout.y = top + height + 14;
    });
  }

  #distribution(): void {
    const { pdf, layout } = this;
    const gap = 14;
    const columnWidth = (layout.width - gap) / 2;
    const categories = capRows<ShareRow>(
      this.#report.categories.map((row) => ({ name: row.name, color: row.color, hours: row.hours, share: row.share })),
      7,
      (rest) => ({ name: `+${rest.length}`, color: palette.faint, hours: total(rest.map((row) => row.hours)), share: total(rest.map((row) => row.share)) }),
    );
    const projects = capRows(
      this.#report.projects.map((row) => ({ name: row.name, hours: row.hours, entryCount: row.entryCount })),
      7,
      (rest) => ({ name: `+${rest.length}`, hours: total(rest.map((row) => row.hours)), entryCount: total(rest.map((row) => row.entryCount)) }),
    );
    const height = Math.max(176, 46 + categories.length * 20 + 12, 48 + projects.length * 27 + 8);
    layout.ensure(height + 14);
    const top = layout.y;
    const rightX = layout.left + columnWidth + gap;

    this.#card(layout.left, top, columnWidth, height);
    pdf.font("Noto-Bold").fontSize(10.5).fillColor(palette.ink).text(this.#messages.byEntryType, layout.left + 16, top + 14, { lineBreak: false });
    const radius = 56;
    const inner = 37;
    const centerX = layout.left + 16 + radius + 6;
    const centerY = top + 46 + (height - 46) / 2;
    let start = -90;
    for (const row of this.#report.categories) {
      if (!row.share) continue;
      const end = start + row.share * 360;
      const gapDegrees = this.#report.categories.filter((category) => category.share).length > 1 ? 1.2 : 0;
      pdf.path(ringSlicePath(centerX, centerY, radius, inner, start + gapDegrees / 2, Math.min(end - gapDegrees / 2, start + 359.99))).fill(row.color);
      start = end;
    }
    pdf.font("Noto-Bold").fontSize(14).fillColor(palette.ink);
    this.#line(this.#hours(this.#report.totalHours), centerX - 34, centerY - 10, 68, "center");
    pdf.font("Noto").fontSize(6.5).fillColor(palette.muted);
    this.#line(this.#messages.totalLabel, centerX - 34, centerY + 7, 68, "center");

    const legendX = layout.left + 16 + radius * 2 + 30;
    const legendWidth = layout.left + columnWidth - 16 - legendX;
    const legendTop = top + 46 + Math.max(0, (height - 46 - categories.length * 20) / 2 - 4);
    categories.forEach((row, index) => {
      const y = legendTop + index * 20;
      pdf.circle(legendX + 4, y + 5, 3.6).fill(row.color);
      pdf.font("Noto").fontSize(8).fillColor(palette.body);
      this.#line(row.name, legendX + 15, y, legendWidth - 15 - 80);
      pdf.fillColor(palette.muted).fontSize(7.5);
      this.#line(`${Math.round(row.share * 100)}%`, legendX + legendWidth - 80, y + 0.5, 32, "right");
      pdf.font("Noto-Bold").fontSize(8).fillColor(palette.ink);
      this.#line(this.#hours(row.hours), legendX + legendWidth - 44, y, 44, "right");
    });

    this.#card(rightX, top, columnWidth, height);
    pdf.font("Noto-Bold").fontSize(10.5).fillColor(palette.ink).text(this.#messages.byProject, rightX + 16, top + 14, { lineBreak: false });
    const maximum = Math.max(1, ...projects.map((row) => row.hours));
    projects.forEach((row, index) => {
      const y = top + 46 + index * 27;
      const color = rankColors[index % rankColors.length];
      pdf.font("Noto-Bold").fontSize(8).fillColor(palette.ink);
      this.#line(row.name, rightX + 16, y, columnWidth - 32 - 150);
      pdf.font("Noto").fontSize(7).fillColor(palette.muted);
      this.#line(this.#messages.entriesCount(row.entryCount), rightX + columnWidth - 16 - 50 - 90, y + 0.8, 84, "right");
      pdf.font("Noto-Bold").fontSize(8.5).fillColor(palette.ink);
      this.#line(this.#hours(row.hours), rightX + columnWidth - 16 - 50, y, 50, "right");
      const barWidth = columnWidth - 32;
      pdf.roundedRect(rightX + 16, y + 14, barWidth, 4.5, 2.25).fill(palette.weekend);
      if (row.hours > 0) pdf.roundedRect(rightX + 16, y + 14, Math.max(4.5, (row.hours / maximum) * barWidth), 4.5, 2.25).fill(color);
    });
    layout.y = top + height + 14;
  }

  #tasks(): void {
    const { pdf, layout } = this;
    layout.ensure(110);
    pdf.roundedRect(layout.left, layout.y + 1, 3.5, 13, 1.75).fill(palette.accent);
    pdf.font("Noto-Bold").fontSize(11).fillColor(palette.ink).text(this.#messages.tasksSection, layout.left + 11, layout.y, { lineBreak: false });
    const countLabel = this.#messages.entriesCount(this.#report.entryCount);
    pdf.font("Noto-Bold").fontSize(7);
    const countWidth = pdf.widthOfString(countLabel) + 14;
    this.#pill(countLabel, layout.right - countWidth, layout.y, { background: palette.weekend, color: palette.muted });
    layout.y += 24;

    for (const task of this.#report.tasks) {
      layout.ensure(78);
      const hoursLabel = this.#hours(task.hours);
      pdf.font("Noto-Bold").fontSize(8);
      const identifierWidth = pdf.widthOfString(task.identifier) + 14;
      const titleWidth = layout.width - identifierWidth - 34 - 140 - 64;
      pdf.font("Noto-Bold").fontSize(9);
      const titleHeight = pdf.heightOfString(task.title, { width: titleWidth });
      const headerHeight = Math.max(30, titleHeight + 16);
      pdf.roundedRect(layout.left, layout.y, layout.width, headerHeight, 7).fill(palette.surface);
      pdf.roundedRect(layout.left, layout.y + 6, 3, headerHeight - 12, 1.5).fill(palette.accent);
      this.#pill(task.identifier, layout.left + 14, layout.y + (headerHeight - 14) / 2, { background: palette.accentSoft, color: palette.accent, size: 7.5 });
      pdf.font("Noto-Bold").fontSize(9).fillColor(palette.ink).text(task.title, layout.left + 14 + identifierWidth + 8, layout.y + (headerHeight - Math.min(titleHeight, pdf.currentLineHeight() * 2)) / 2, { width: titleWidth, height: pdf.currentLineHeight() * 2, ellipsis: true });
      pdf.font("Noto").fontSize(7).fillColor(palette.muted);
      this.#line(task.project, layout.right - 64 - 140 - 12, layout.y + (headerHeight - 8) / 2, 140, "right");
      pdf.font("Noto-Bold").fontSize(9);
      const hoursWidth = pdf.widthOfString(hoursLabel) + 16;
      this.#pill(hoursLabel, layout.right - 10 - hoursWidth, layout.y + (headerHeight - 17) / 2, { background: palette.ink, color: "#FFFFFF", size: 9, height: 17, padX: 8 });
      layout.y += headerHeight;
      this.#entryColumns();
      task.entries.forEach((entry, index) => this.#entry(entry, task.identifier, index));
      layout.y += 12;
    }
  }

  #entryColumns(): void {
    const { pdf, layout } = this;
    layout.ensure(20);
    pdf.font("Noto-Bold").fontSize(6.3).fillColor(palette.faint);
    entryColumns(layout.left, this.#messages).forEach((column, index) => {
      this.#line(column.label, column.x + (index === 0 ? 14 : 0), layout.y + 6, column.width - 8, index === 5 ? "right" : "left", 0.6);
    });
    layout.y += 19;
  }

  #entry(entry: TimeReportDocument["tasks"][number]["entries"][number], taskIdentifier: string, index: number): void {
    const { pdf, layout } = this;
    const columns = entryColumns(layout.left, this.#messages);
    pdf.font("Noto").fontSize(7.3);
    const noteHeight = pdf.heightOfString(entry.note, { width: columns[3].width - 12 });
    const rowHeight = Math.max(25, noteHeight + 14);
    if (layout.ensure(rowHeight)) {
      pdf.font("Noto-Bold").fontSize(8).fillColor(palette.muted).text(this.#messages.taskContinued(taskIdentifier), layout.left, layout.y, { lineBreak: false });
      layout.y += 16;
      this.#entryColumns();
    }
    if (index % 2 === 1) pdf.roundedRect(layout.left, layout.y, layout.width, rowHeight, 4).fill(palette.surface);
    const textY = layout.y + (rowHeight - 9) / 2;
    pdf.font("Noto").fontSize(7.3).fillColor(palette.body);
    this.#line(entry.date, columns[0].x + 14, textY, columns[0].width - 14);
    pdf.circle(columns[1].x + 5.5, layout.y + rowHeight / 2, 5.5).fill(palette.accentSoft);
    pdf.font("Noto-Bold").fontSize(4.8).fillColor(palette.accent);
    this.#line(initials(entry.person), columns[1].x, layout.y + rowHeight / 2 - 2.8, 11, "center");
    pdf.font("Noto").fontSize(7.3).fillColor(palette.ink);
    this.#line(entry.person, columns[1].x + 16, textY, columns[1].width - 22);
    pdf.circle(columns[2].x + 3, layout.y + rowHeight / 2, 2.8).fill(entry.typeColor);
    pdf.fillColor(palette.body);
    this.#line(entry.type, columns[2].x + 11, textY, columns[2].width - 16);
    pdf.fillColor(palette.muted).text(entry.note, columns[3].x, layout.y + (rowHeight - noteHeight) / 2, { width: columns[3].width - 12 });
    this.#pill(entry.billable ? this.#messages.yes : this.#messages.no, columns[4].x, layout.y + (rowHeight - 12) / 2, entry.billable
      ? { background: palette.billableSoft, color: palette.billable, size: 6.3, height: 12, padX: 6 }
      : { background: palette.weekend, color: palette.muted, size: 6.3, height: 12, padX: 6 });
    pdf.font("Noto-Bold").fontSize(7.8).fillColor(palette.ink);
    this.#line(this.#hours(entry.hours), columns[5].x, textY, columns[5].width - 8, "right");
    layout.y += rowHeight;
  }

  get pdf() { return this.#pdf; }
  get layout() { return this.#layout; }
}

class PdfLayout {
  readonly #pdf: PDFKit.PDFDocument;
  readonly #report: TimeReportDocument;
  pageNumber = 1;
  y = pageMargin;

  constructor(pdf: PDFKit.PDFDocument, report: TimeReportDocument) {
    this.#pdf = pdf;
    this.#report = report;
    this.#footer();
  }

  get left() { return pageMargin; }
  get right() { return this.#pdf.page.width - pageMargin; }
  get width() { return this.right - this.left; }

  ensure(height: number): boolean {
    if (this.y + height <= this.#pdf.page.height - pageBottom) return false;
    this.#pdf.addPage();
    this.pageNumber += 1;
    const strip = this.#pdf.linearGradient(0, 0, this.#pdf.page.width, 0);
    strip.stop(0, palette.bandFrom).stop(1, palette.accent);
    this.#pdf.rect(0, 0, this.#pdf.page.width, 5).fill(strip);
    this.y = pageMargin + 8;
    this.#footer();
    return true;
  }

  #footer(): void {
    const pdf = this.#pdf;
    const y = pdf.page.height - 47;
    pdf.save().lineWidth(0.5).strokeColor(palette.line).moveTo(this.left, y - 8).lineTo(this.right, y - 8).stroke().restore();
    pdf.font("Noto").fontSize(6.5).fillColor(palette.muted);
    pdf.text(`${this.#report.subjectName}  ·  ${this.#report.periodLabel}`, this.left, y, { width: this.width - 110, height: pdf.currentLineHeight(), ellipsis: true, lineBreak: false });
    pdf.text(this.#report.messages.footer(this.pageNumber), this.right - 100, y, { align: "right", width: 100, lineBreak: false });
  }
}

function entryColumns(left: number, messages: ReportMessages) {
  const widths = [84, 128, 108, 316, 64, 70];
  const labels = messages.entryColumns;
  let x = left;
  return widths.map((width, index) => { const column = { x, width, label: labels[index] }; x += width; return column; });
}

function chunk<T>(values: T[], size: number): T[][] { return Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size)); }

/** Keeps the largest rows and folds the remainder into one "+N" row so the card stays a fixed height. */
function capRows<T>(rows: T[], limit: number, fold: (rest: T[]) => T): T[] {
  if (rows.length <= limit) return rows;
  return [...rows.slice(0, limit - 1), fold(rows.slice(limit - 1))];
}

function total(values: number[]): number {
  return values.reduce((sumSoFar, value) => sumSoFar + value, 0);
}

function isWeekend(dateKey: string): boolean {
  const [year, month, day] = dateKey.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 || weekday === 6;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts.at(-1)!] : [parts[0] ?? "?"];
  return letters.map((part) => Array.from(part)[0] ?? "").join("").toUpperCase().slice(0, 2);
}

function ringSlicePath(centerX: number, centerY: number, outer: number, inner: number, start: number, end: number): string {
  const point = (radius: number, degrees: number) => {
    const radians = degrees * Math.PI / 180;
    return [centerX + radius * Math.cos(radians), centerY + radius * Math.sin(radians)] as const;
  };
  const [outerStartX, outerStartY] = point(outer, start);
  const [outerEndX, outerEndY] = point(outer, end);
  const [innerEndX, innerEndY] = point(inner, end);
  const [innerStartX, innerStartY] = point(inner, start);
  const largeArc = end - start > 180 ? 1 : 0;
  return `M ${outerStartX} ${outerStartY} A ${outer} ${outer} 0 ${largeArc} 1 ${outerEndX} ${outerEndY} L ${innerEndX} ${innerEndY} A ${inner} ${inner} 0 ${largeArc} 0 ${innerStartX} ${innerStartY} Z`;
}

function fontPath(filename: string): string {
  const bundled = path.join(process.cwd(), "assets", "time-tracking", filename);
  return existsSync(bundled) ? bundled : path.join(process.cwd(), "src", "modules", "time-tracking", "assets", filename);
}
