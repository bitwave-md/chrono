import type { IssuePriority } from "@/modules/issues/application/issue-service";
import type {
  ProjectPriority,
  ProjectVisibility,
} from "@/modules/projects/application/project-service";

export interface DemoIssueFixture {
  title: string;
  description: string;
  priority: IssuePriority;
  statusSlug: "backlog" | "todo" | "in-progress" | "done";
  branchSlug?: string;
  assigned?: boolean;
}

export interface DemoProjectFixture {
  name: string;
  slug: string;
  summary: string;
  description: string;
  visibility: ProjectVisibility;
  priority: ProjectPriority;
  health: "on_track" | "at_risk" | "off_track";
  targetDate: string;
  branch: {
    name: string;
    slug: string;
    kind: "feature" | "sprint" | "refactor" | "release" | "other";
    summary: string;
  };
  issues: DemoIssueFixture[];
}

export interface DemoClientFixture {
  name: string;
  key: string;
  issuePrefix: string;
  description: string;
  iconKey: string;
  iconColor: string;
  projects: DemoProjectFixture[];
}

function project(
  fixture: Omit<DemoProjectFixture, "visibility">,
): DemoProjectFixture {
  return { visibility: "client_shared", ...fixture };
}

export const demoClients: DemoClientFixture[] = [
  {
    name: "DaCredit",
    key: "DAC",
    issuePrefix: "DAC",
    description: "Digital lending products and internal credit operations.",
    iconKey: "landmark",
    iconColor: "#f59e0b",
    projects: [
      project({
        name: "Main CRM",
        slug: "main-crm",
        summary: "The operating system for credit applications and servicing.",
        description: "Unifies lead intake, underwriting, contracts, payments, and customer support in one workspace.",
        priority: "urgent",
        health: "at_risk",
        targetDate: "2026-09-30",
        branch: { name: "Partner API rollout", slug: "partner-api-rollout", kind: "feature", summary: "Connect the CRM to external scoring and identity partners." },
        issues: [
          { title: "Build applicant timeline", description: "Show application, verification, and decision events in chronological order.", priority: "high", statusSlug: "in-progress", assigned: true },
          { title: "Add affordability score breakdown", description: "Explain the factors contributing to an affordability decision.", priority: "urgent", statusSlug: "todo", assigned: true },
          { title: "Import legacy repayment schedules", description: "Migrate active repayment schedules with reconciliation checks.", priority: "medium", statusSlug: "backlog" },
          { title: "Integrate partner identity checks", description: "Submit applicants to the identity provider and persist verification results.", priority: "high", statusSlug: "in-progress", branchSlug: "partner-api-rollout", assigned: true },
          { title: "Document underwriting permissions", description: "Publish the role and permission matrix for underwriting operations.", priority: "low", statusSlug: "done", branchSlug: "partner-api-rollout" },
        ],
      }),
      project({
        name: "Online Credit Manager",
        slug: "online-credit-manager",
        summary: "A self-service loan application and account experience.",
        description: "Customer-facing application flow, document collection, offer acceptance, and repayment overview.",
        priority: "high",
        health: "on_track",
        targetDate: "2026-10-16",
        branch: { name: "Application refresh", slug: "application-refresh", kind: "release", summary: "Ship the redesigned application journey." },
        issues: [
          { title: "Design mobile application stepper", description: "Create a compact, resumable stepper for mobile applicants.", priority: "high", statusSlug: "done", assigned: true },
          { title: "Persist application drafts", description: "Save every completed application section and restore it across devices.", priority: "urgent", statusSlug: "in-progress", assigned: true },
          { title: "Add document upload validation", description: "Validate file type, size, and malware scan state before submission.", priority: "high", statusSlug: "todo" },
          { title: "Create offer comparison view", description: "Let applicants compare term, payment, and total cost before accepting.", priority: "medium", statusSlug: "backlog", branchSlug: "application-refresh" },
          { title: "Instrument application conversion funnel", description: "Track progression and abandonment across the application journey.", priority: "medium", statusSlug: "todo", branchSlug: "application-refresh" },
        ],
      }),
    ],
  },
  {
    name: "Northstar Labs",
    key: "NORTHSTAR",
    issuePrefix: "NST",
    description: "Developer infrastructure and usage-based billing products.",
    iconKey: "rocket",
    iconColor: "#3b82f6",
    projects: [
      project({
        name: "Developer Portal",
        slug: "developer-portal",
        summary: "A fast, self-service home for API customers.",
        description: "Centralizes API keys, documentation, usage analytics, environments, and support access.",
        priority: "high",
        health: "on_track",
        targetDate: "2026-08-28",
        branch: { name: "Authentication refresh", slug: "authentication-refresh", kind: "refactor", summary: "Modernize sign-in and API credential management." },
        issues: [
          { title: "Build API key management", description: "Create, name, rotate, and revoke environment-scoped API keys.", priority: "urgent", statusSlug: "in-progress", assigned: true },
          { title: "Add request explorer", description: "Provide an interactive request builder alongside endpoint documentation.", priority: "high", statusSlug: "todo" },
          { title: "Show usage by environment", description: "Chart requests, latency, and errors for production and sandbox.", priority: "medium", statusSlug: "backlog" },
          { title: "Implement passkey sign-in", description: "Add passkeys as a secure sign-in method for portal users.", priority: "high", statusSlug: "todo", branchSlug: "authentication-refresh", assigned: true },
          { title: "Audit session expiration handling", description: "Verify refresh, expiry, and revocation behavior across browser sessions.", priority: "medium", statusSlug: "done", branchSlug: "authentication-refresh" },
        ],
      }),
      project({
        name: "Billing Platform",
        slug: "billing-platform",
        summary: "Usage metering, invoices, credits, and revenue controls.",
        description: "Processes product events into auditable customer balances and invoices.",
        priority: "urgent",
        health: "off_track",
        targetDate: "2026-09-12",
        branch: { name: "Metering v2", slug: "metering-v2", kind: "release", summary: "Replace batch aggregation with near-real-time metering." },
        issues: [
          { title: "Define immutable usage event schema", description: "Specify versioned events with idempotency and correction semantics.", priority: "urgent", statusSlug: "done", assigned: true },
          { title: "Reconcile delayed usage events", description: "Apply late-arriving events to the correct billing period.", priority: "urgent", statusSlug: "in-progress", assigned: true },
          { title: "Add prepaid credit balances", description: "Track grants, purchases, consumption, expiry, and adjustments.", priority: "high", statusSlug: "todo" },
          { title: "Stream meter updates", description: "Aggregate usage continuously and expose freshness indicators.", priority: "high", statusSlug: "in-progress", branchSlug: "metering-v2" },
          { title: "Load test invoice generation", description: "Validate invoice generation at ten times projected monthly volume.", priority: "medium", statusSlug: "backlog", branchSlug: "metering-v2" },
        ],
      }),
    ],
  },
  {
    name: "Atelier Nova",
    key: "ATELIER",
    issuePrefix: "ANV",
    description: "A design-led commerce studio building a new retail experience.",
    iconKey: "palette",
    iconColor: "#8b5cf6",
    projects: [
      project({
        name: "Brand System",
        slug: "brand-system",
        summary: "A flexible visual language for digital and physical touchpoints.",
        description: "Defines foundations, components, content patterns, and governance for the Nova brand.",
        priority: "medium",
        health: "on_track",
        targetDate: "2026-08-14",
        branch: { name: "Component audit", slug: "component-audit", kind: "sprint", summary: "Close the highest-impact gaps in the component library." },
        issues: [
          { title: "Finalize semantic color tokens", description: "Document accessible color roles for light and dark surfaces.", priority: "high", statusSlug: "in-progress", assigned: true },
          { title: "Publish typography scale", description: "Define responsive type roles and usage guidance.", priority: "medium", statusSlug: "done" },
          { title: "Create product photography guide", description: "Set composition, lighting, cropping, and retouching standards.", priority: "low", statusSlug: "backlog" },
          { title: "Audit form components", description: "Review validation, density, keyboard behavior, and error states.", priority: "high", statusSlug: "todo", branchSlug: "component-audit", assigned: true },
          { title: "Add empty-state patterns", description: "Create reusable empty states for commerce and account surfaces.", priority: "medium", statusSlug: "todo", branchSlug: "component-audit" },
        ],
      }),
      project({
        name: "Commerce Experience",
        slug: "commerce-experience",
        summary: "A premium storefront optimized for discovery and conversion.",
        description: "Rebuilds catalog browsing, product storytelling, checkout, and post-purchase account flows.",
        priority: "high",
        health: "at_risk",
        targetDate: "2026-11-06",
        branch: { name: "Mobile checkout", slug: "mobile-checkout", kind: "feature", summary: "Reduce checkout friction on small screens." },
        issues: [
          { title: "Implement editorial collection pages", description: "Blend campaign storytelling with shoppable product modules.", priority: "high", statusSlug: "in-progress", assigned: true },
          { title: "Add predictive search", description: "Return products, categories, and editorial results while typing.", priority: "medium", statusSlug: "todo" },
          { title: "Optimize product media delivery", description: "Serve responsive images and video with perceptual loading states.", priority: "high", statusSlug: "backlog" },
          { title: "Build express checkout sheet", description: "Keep address, delivery, and payment in a compact mobile flow.", priority: "urgent", statusSlug: "in-progress", branchSlug: "mobile-checkout", assigned: true },
          { title: "Add wallet payment methods", description: "Support platform wallets with clear fallback behavior.", priority: "high", statusSlug: "todo", branchSlug: "mobile-checkout" },
        ],
      }),
    ],
  },
  {
    name: "Greenfield Health",
    key: "GREENFIELD",
    issuePrefix: "GFH",
    description: "Patient access and clinical operations software.",
    iconKey: "heart-pulse",
    iconColor: "#10b981",
    projects: [
      project({
        name: "Patient Dashboard",
        slug: "patient-dashboard",
        summary: "A clear home for appointments, care plans, and messages.",
        description: "Gives patients one accessible place to understand and act on their care.",
        priority: "high",
        health: "on_track",
        targetDate: "2026-10-02",
        branch: { name: "Accessibility sprint", slug: "accessibility-sprint", kind: "sprint", summary: "Reach WCAG AA across core patient journeys." },
        issues: [
          { title: "Create upcoming care timeline", description: "Combine visits, medication changes, and care-plan actions.", priority: "high", statusSlug: "in-progress", assigned: true },
          { title: "Add secure care-team messaging", description: "Support threaded messages with attachments and response expectations.", priority: "urgent", statusSlug: "todo" },
          { title: "Surface lab result explanations", description: "Pair results with ranges and clinician-authored guidance.", priority: "medium", statusSlug: "backlog" },
          { title: "Fix keyboard focus order", description: "Correct focus order across dashboard cards and modal workflows.", priority: "high", statusSlug: "in-progress", branchSlug: "accessibility-sprint", assigned: true },
          { title: "Validate screen-reader announcements", description: "Test async updates, errors, and navigation landmarks.", priority: "medium", statusSlug: "done", branchSlug: "accessibility-sprint" },
        ],
      }),
      project({
        name: "Scheduling API",
        slug: "scheduling-api",
        summary: "Reliable appointment inventory and booking for every channel.",
        description: "Exposes provider availability, booking, rescheduling, cancellation, and reminders.",
        priority: "urgent",
        health: "at_risk",
        targetDate: "2026-09-18",
        branch: { name: "API v2", slug: "api-v2", kind: "release", summary: "Introduce resilient slot holds and bulk availability queries." },
        issues: [
          { title: "Model provider availability rules", description: "Represent recurring hours, exceptions, buffers, and appointment types.", priority: "urgent", statusSlug: "in-progress", assigned: true },
          { title: "Prevent concurrent double booking", description: "Use bounded slot holds and transactional confirmation.", priority: "urgent", statusSlug: "todo", assigned: true },
          { title: "Add cancellation reason taxonomy", description: "Capture consistent reasons for operational reporting.", priority: "low", statusSlug: "backlog" },
          { title: "Implement bulk availability endpoint", description: "Return availability for multiple providers and locations efficiently.", priority: "high", statusSlug: "in-progress", branchSlug: "api-v2" },
          { title: "Publish v2 migration guide", description: "Document contract changes, examples, and rollout recommendations.", priority: "medium", statusSlug: "todo", branchSlug: "api-v2" },
        ],
      }),
    ],
  },
];
