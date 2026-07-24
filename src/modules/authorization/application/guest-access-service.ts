import { and, eq, exists, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { clientMemberships, issueAssignees, issues, projectMemberships, projects } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { ForbiddenError, NotFoundError } from "@/modules/shared/application/application-error";

export class GuestAccessService {
  async assertCanReadProject(principal: Principal, projectId: string): Promise<void> {
    if (principal.role !== "guest") return;
    const access = await this.#projectAccess(principal, projectId);
    if (!access) throw new NotFoundError("Project not found.");
  }

  async assertCanReadIssue(principal: Principal, issueId: string): Promise<void> {
    if (principal.role !== "guest") return;
    const access = await this.#issueAccess(principal, issueId);
    if (!access) throw new NotFoundError("Issue not found.");
  }

  async assertCanCreateIssue(principal: Principal, clientId: string, projectId: string | null): Promise<void> {
    if (principal.role !== "guest") return;
    const [client] = await db.select({ id: clientMemberships.clientId }).from(clientMemberships).where(and(
      eq(clientMemberships.workspaceId, principal.workspaceId),
      eq(clientMemberships.clientId, clientId),
      eq(clientMemberships.workspaceMembershipId, principal.membershipId),
    )).limit(1);
    if (!client) throw new ForbiddenError("You do not have access to this Client.");
    if (projectId) await this.assertCanReadProject(principal, projectId);
  }

  async assertCanPublishProjectUpdate(principal: Principal, projectId: string): Promise<void> {
    if (principal.role !== "guest") return;
    await this.assertCanReadProject(principal, projectId);
  }

  async assertCanParticipate(principal: Principal, issueId: string): Promise<void> {
    await this.assertCanReadIssue(principal, issueId);
  }

  async assertCanEditAuthoredText(principal: Principal, authorMembershipId: string): Promise<void> {
    if (principal.role === "guest" && principal.membershipId !== authorMembershipId) {
      throw new ForbiddenError("Guests can only edit their own content.");
    }
  }

  projectListCondition(principal: Principal, projectAlias: typeof projects) {
    if (principal.role !== "guest") return sql``;
    return sql`and exists (
      select 1 from ${projectMemberships} access
      where access.workspace_id = ${projectAlias.workspaceId}
        and access.project_id = ${projectAlias.id}
        and access.workspace_membership_id = ${principal.membershipId}
    )`;
  }

  issueListCondition(principal: Principal, issueAlias: typeof issues, filters: { mine?: boolean }) {
    if (principal.role !== "guest") return sql``;
    const assignment = sql`exists (
      select 1 from ${issueAssignees} assignment
      where assignment.workspace_id = ${issueAlias.workspaceId}
        and assignment.issue_id = ${issueAlias.id}
        and assignment.membership_id = ${principal.membershipId}
    )`;
    const projectAccess = sql`exists (
      select 1 from ${projectMemberships} access
      where access.workspace_id = ${issueAlias.workspaceId}
        and access.project_id = ${issueAlias.projectId}
        and access.workspace_membership_id = ${principal.membershipId}
    )`;
    const directClientIssue = sql`${issueAlias.projectId} is null`;
    return sql`and ${filters.mine ? assignment : sql`(${directClientIssue} or ${projectAccess})`}`;
  }

  async #projectAccess(principal: Principal, projectId: string) {
    const [access] = await db.select({ id: projects.id }).from(projects).where(and(
      eq(projects.workspaceId, principal.workspaceId),
      eq(projects.id, projectId),
      isNull(projects.archivedAt),
      exists(db.select({ value: sql`1` }).from(clientMemberships).where(and(
        eq(clientMemberships.workspaceId, projects.workspaceId),
        eq(clientMemberships.clientId, projects.clientId),
        eq(clientMemberships.workspaceMembershipId, principal.membershipId),
      ))),
      exists(db.select({ value: sql`1` }).from(projectMemberships).where(and(
        eq(projectMemberships.workspaceId, projects.workspaceId),
        eq(projectMemberships.projectId, projects.id),
        eq(projectMemberships.workspaceMembershipId, principal.membershipId),
      ))),
    )).limit(1);
    return access;
  }

  async #issueAccess(principal: Principal, issueId: string) {
    const [access] = await db.select({ id: issues.id }).from(issues).where(and(
      eq(issues.workspaceId, principal.workspaceId),
      eq(issues.id, issueId),
      isNull(issues.archivedAt),
      exists(db.select({ value: sql`1` }).from(clientMemberships).where(and(
        eq(clientMemberships.workspaceId, issues.workspaceId),
        eq(clientMemberships.clientId, issues.clientId),
        eq(clientMemberships.workspaceMembershipId, principal.membershipId),
      ))),
      or(
        isNull(issues.projectId),
        exists(db.select({ value: sql`1` }).from(projectMemberships).where(and(
          eq(projectMemberships.workspaceId, issues.workspaceId),
          eq(projectMemberships.projectId, issues.projectId),
          eq(projectMemberships.workspaceMembershipId, principal.membershipId),
        ))),
        exists(db.select({ value: sql`1` }).from(issueAssignees).where(and(
          eq(issueAssignees.workspaceId, issues.workspaceId),
          eq(issueAssignees.issueId, issues.id),
          eq(issueAssignees.membershipId, principal.membershipId),
        ))),
      ),
    )).limit(1);
    return access;
  }
}
