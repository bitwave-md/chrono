import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";

import { database, db } from "@/db/client";
import { demoClients, type DemoClientFixture, type DemoProjectFixture } from "@/db/demo-fixtures";
import {
  clients,
  issues,
  projectBranches,
  projects,
  users,
  workflows,
  workflowStatuses,
  workspaceMemberships,
  workspaces,
} from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { ClientService } from "@/modules/clients/application/client-service";
import { IssueService } from "@/modules/issues/application/issue-service";
import { ProjectBranchService } from "@/modules/projects/application/project-branch-service";
import { ProjectDetailService } from "@/modules/projects/application/project-detail-service";
import { ProjectService } from "@/modules/projects/application/project-service";

interface SeedSummary {
  clients: number;
  projects: number;
  branches: number;
  issues: number;
}

interface ProjectContext {
  id: string;
  workflowId: string;
  created: boolean;
}

export class DemoWorkspaceSeeder {
  readonly #clients = new ClientService();
  readonly #projects = new ProjectService();
  readonly #projectDetails = new ProjectDetailService();
  readonly #branches = new ProjectBranchService();
  readonly #issues = new IssueService();
  readonly #summary: SeedSummary = { clients: 0, projects: 0, branches: 0, issues: 0 };

  async seed(workspaceSlug: string): Promise<SeedSummary> {
    const principal = await this.#principal(workspaceSlug);

    for (const clientFixture of demoClients) {
      const clientId = await this.#client(principal, clientFixture);
      for (const projectFixture of clientFixture.projects) {
        await this.#project(principal, clientId, projectFixture);
      }
    }

    return { ...this.#summary };
  }

  async #principal(workspaceSlug: string): Promise<Principal> {
    const [record] = await db
      .select({
        userId: users.id,
        email: users.email,
        membershipId: workspaceMemberships.id,
        workspaceId: workspaces.id,
        workspaceName: workspaces.name,
        workspaceSlug: workspaces.slug,
        role: workspaceMemberships.role,
      })
      .from(workspaceMemberships)
      .innerJoin(users, eq(users.id, workspaceMemberships.userId))
      .innerJoin(workspaces, eq(workspaces.id, workspaceMemberships.workspaceId))
      .where(and(
        eq(workspaces.slug, workspaceSlug),
        eq(workspaceMemberships.status, "active"),
        inArray(workspaceMemberships.role, ["owner", "admin"]),
        isNull(workspaces.archivedAt),
      ))
      .orderBy(sql`case when ${workspaceMemberships.role} = 'owner' then 0 else 1 end`, asc(workspaceMemberships.joinedAt))
      .limit(1);

    if (!record) {
      throw new Error(`Workspace "${workspaceSlug}" needs an active owner or admin before demo data can be seeded.`);
    }

    return record;
  }

  async #client(principal: Principal, fixture: DemoClientFixture): Promise<string> {
    const [existing] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(
        eq(clients.workspaceId, principal.workspaceId),
        eq(clients.key, fixture.key),
        isNull(clients.archivedAt),
      ))
      .limit(1);

    if (existing) return existing.id;

    const created = await this.#clients.create(principal, {
      name: fixture.name,
      key: fixture.key,
      issuePrefix: fixture.issuePrefix,
      description: fixture.description,
      iconType: "icon",
      iconKey: fixture.iconKey,
      iconColor: fixture.iconColor,
    });
    this.#summary.clients += 1;
    return created.id;
  }

  async #project(
    principal: Principal,
    clientId: string,
    fixture: DemoProjectFixture,
  ): Promise<void> {
    const context = await this.#projectContext(principal, clientId, fixture);
    const branchId = await this.#branch(principal, context.id, fixture);

    if (context.created) {
      const targetDate = new Date(`${fixture.targetDate}T12:00:00.000Z`);
      await this.#projectDetails.update(principal, context.id, {
        state: "active",
        priority: fixture.priority,
        leadMembershipId: principal.membershipId,
        assigneeMembershipIds: [principal.membershipId],
        summary: fixture.summary,
        description: fixture.description,
        targetDate,
      });
      await this.#projectDetails.publishUpdate(principal, context.id, {
        body: `Demo project initialized for ${fixture.name}. Current focus: ${fixture.summary}`,
        health: fixture.health,
        progress: null,
      });
    }

    const statuses = await this.#statusMap(principal.workspaceId, context.workflowId);
    const existingTitles = await this.#existingIssueTitles(principal.workspaceId, context.id);

    for (const issue of fixture.issues) {
      if (existingTitles.has(issue.title)) continue;
      const statusId = statuses.get(issue.statusSlug);
      if (!statusId) {
        throw new Error(`Workflow status "${issue.statusSlug}" is missing for Project "${fixture.name}".`);
      }
      await this.#issues.create(principal, {
        clientId,
        projectId: context.id,
        branchId: issue.branchSlug ? branchId : null,
        assigneeMembershipIds: issue.assigned ? [principal.membershipId] : [],
        statusId,
        parentIssueId: null,
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        visibility: fixture.visibility,
      });
      this.#summary.issues += 1;
    }
  }

  async #projectContext(
    principal: Principal,
    clientId: string,
    fixture: DemoProjectFixture,
  ): Promise<ProjectContext> {
    const [existing] = await db
      .select({ id: projects.id, workflowId: workflows.id })
      .from(projects)
      .innerJoin(workflows, eq(workflows.projectId, projects.id))
      .where(and(
        eq(projects.workspaceId, principal.workspaceId),
        eq(projects.clientId, clientId),
        eq(projects.slug, fixture.slug),
        isNull(projects.archivedAt),
      ))
      .limit(1);

    if (existing) return { ...existing, created: false };

    const created = await this.#projects.create(principal, {
      clientId,
      visibility: fixture.visibility,
      priority: fixture.priority,
      leadMembershipId: principal.membershipId,
      name: fixture.name,
      slug: fixture.slug,
      description: fixture.description,
      namespacePrefix: null,
    });
    this.#summary.projects += 1;
    return { id: created.project.id, workflowId: created.workflow.id, created: true };
  }

  async #branch(
    principal: Principal,
    projectId: string,
    fixture: DemoProjectFixture,
  ): Promise<string> {
    const [existing] = await db
      .select({ id: projectBranches.id })
      .from(projectBranches)
      .where(and(
        eq(projectBranches.workspaceId, principal.workspaceId),
        eq(projectBranches.projectId, projectId),
        eq(projectBranches.slug, fixture.branch.slug),
        isNull(projectBranches.archivedAt),
      ))
      .limit(1);

    if (existing) return existing.id;

    const created = await this.#branches.create(principal, projectId, {
      name: fixture.branch.name,
      slug: fixture.branch.slug,
      kind: fixture.branch.kind,
      state: "active",
      summary: fixture.branch.summary,
      description: null,
      startDate: null,
      targetDate: new Date(`${fixture.targetDate}T12:00:00.000Z`),
    });
    this.#summary.branches += 1;
    return created.id;
  }

  async #statusMap(workspaceId: string, workflowId: string): Promise<Map<string, string>> {
    const rows = await db
      .select({ slug: workflowStatuses.slug, id: workflowStatuses.id })
      .from(workflowStatuses)
      .where(and(
        eq(workflowStatuses.workspaceId, workspaceId),
        eq(workflowStatuses.workflowId, workflowId),
        isNull(workflowStatuses.archivedAt),
      ));
    return new Map(rows.map((status) => [status.slug, status.id]));
  }

  async #existingIssueTitles(workspaceId: string, projectId: string): Promise<Set<string>> {
    const rows = await db
      .select({ title: issues.title })
      .from(issues)
      .where(and(
        eq(issues.workspaceId, workspaceId),
        eq(issues.projectId, projectId),
        isNull(issues.archivedAt),
      ));
    return new Set(rows.map((issue) => issue.title));
  }
}

export async function closeDemoSeederDatabase(): Promise<void> {
  await database.close();
}
