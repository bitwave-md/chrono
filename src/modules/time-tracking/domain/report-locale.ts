export const REPORT_LOCALES = ["en", "ro"] as const;

export type ReportLocale = (typeof REPORT_LOCALES)[number];

export const REPORT_LOCALE_LABELS: Record<ReportLocale, string> = {
  en: "English",
  ro: "Română",
};

const DEFAULT_LOCALE: ReportLocale = "en";

export interface ReportMessages {
  readonly intlLocale: string;
  readonly kicker: string;
  documentTitle(subjectName: string): string;
  readonly subjectType: Record<"Client" | "Project", string>;
  readonly scopePersonal: string;
  readonly scopeClientWide: string;
  generatedLine(label: string): string;
  readonly truncationNotice: string;
  readonly cardTotalTime: string;
  readonly cardBillable: string;
  readonly cardProjects: string;
  readonly cardContributors: string;
  readonly timeOverPeriod: string;
  segmentSuffix(index: number, count: number): string;
  readonly dailyHint: string;
  readonly byEntryType: string;
  readonly totalLabel: string;
  readonly byProject: string;
  entriesCount(count: number): string;
  readonly tasksSection: string;
  taskContinued(identifier: string): string;
  readonly entryColumns: readonly [string, string, string, string, string, string];
  readonly yes: string;
  readonly no: string;
  hoursUnit(value: number): string;
  footer(pageNumber: number): string;
  readonly clientWork: string;
  readonly uncategorized: string;
  readonly noProject: string;
  readonly noNote: string;
}

function segmentSuffix(index: number, count: number, connector: string): string {
  return count > 1 ? ` (${index} ${connector} ${count})` : "";
}

// CLDR plural categories for Romanian: one / few (also used for 0 and 1..19 in the
// hundreds) / other (20+, spelled with "de"). English only needs one / other.
function roPlural(count: number, one: string, few: string, other: string): string {
  const mod100 = count % 100;
  if (count === 1) return one;
  if (count === 0 || (mod100 >= 1 && mod100 <= 19)) return few;
  return other;
}

const en: ReportMessages = {
  intlLocale: "en-US",
  kicker: "CHRONO TIME REPORT",
  documentTitle: (subjectName) => `Time report - ${subjectName}`,
  subjectType: { Client: "Client", Project: "Project" },
  scopePersonal: "Personal visibility",
  scopeClientWide: "Client-wide visibility",
  generatedLine: (label) =>
    `Generated ${label}. Durations are rounded to the nearest whole hour; 30 minutes rounds up.`,
  truncationNotice:
    "This report contains the newest 1,000 matching entries. Narrow the period for a complete reconciliation.",
  cardTotalTime: "Total time",
  cardBillable: "Billable",
  cardProjects: "Projects",
  cardContributors: "Contributors",
  timeOverPeriod: "Time over period",
  segmentSuffix: (index, count) => segmentSuffix(index, count, "of"),
  dailyHint: "Rounded hours are shown below every day.",
  byEntryType: "By time entry type",
  totalLabel: "total",
  byProject: "By project",
  entriesCount: (count) => `${count} ${count === 1 ? "entry" : "entries"}`,
  tasksSection: "Time entries grouped by task",
  taskContinued: (identifier) => `${identifier} continued`,
  entryColumns: ["DATE", "PERSON", "TYPE", "NOTE", "BILLABLE", "ROUNDED"],
  yes: "Yes",
  no: "No",
  hoursUnit: (value) => `${value} h`,
  footer: (pageNumber) => `Chrono | Page ${pageNumber}`,
  clientWork: "Client work",
  uncategorized: "Uncategorized",
  noProject: "No project",
  noNote: "No note",
};

const ro: ReportMessages = {
  intlLocale: "ro-RO",
  kicker: "RAPORT DE TIMP CHRONO",
  documentTitle: (subjectName) => `Raport de timp - ${subjectName}`,
  subjectType: { Client: "Client", Project: "Proiect" },
  scopePersonal: "Vizibilitate personală",
  scopeClientWide: "Vizibilitate la nivel de client",
  generatedLine: (label) =>
    `Generat ${label}. Duratele sunt rotunjite la cea mai apropiată oră întreagă; 30 de minute se rotunjesc în sus.`,
  truncationNotice:
    "Acest raport conține cele mai recente 1.000 de înregistrări care corespund. Restrângeți perioada pentru o reconciliere completă.",
  cardTotalTime: "Timp total",
  cardBillable: "Facturabil",
  cardProjects: "Proiecte",
  cardContributors: "Contribuitori",
  timeOverPeriod: "Timp pe perioadă",
  segmentSuffix: (index, count) => segmentSuffix(index, count, "din"),
  dailyHint: "Orele rotunjite sunt afișate sub fiecare zi.",
  byEntryType: "După tipul înregistrării de timp",
  totalLabel: "total",
  byProject: "După proiect",
  entriesCount: (count) =>
    `${count} ${roPlural(count, "înregistrare", "înregistrări", "de înregistrări")}`,
  tasksSection: "Înregistrări de timp grupate pe activități",
  taskContinued: (identifier) => `${identifier} continuare`,
  entryColumns: ["DATA", "PERSOANĂ", "TIP", "NOTĂ", "FACTURABIL", "ROTUNJIT"],
  yes: "Da",
  no: "Nu",
  hoursUnit: (value) => `${value} h`,
  footer: (pageNumber) => `Chrono | Pagina ${pageNumber}`,
  clientWork: "Activitate pentru client",
  uncategorized: "Necategorizat",
  noProject: "Fără proiect",
  noNote: "Fără notă",
};

export const reportMessages: Record<ReportLocale, ReportMessages> = { en, ro };

export function resolveReportLocale(value: string | null | undefined): ReportLocale {
  const normalized = value?.trim().toLowerCase();
  return REPORT_LOCALES.find((locale) => locale === normalized) ?? DEFAULT_LOCALE;
}
