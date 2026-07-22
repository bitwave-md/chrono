import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { issues, projects } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { ClientAccessService } from "@/modules/clients/application/client-access-service";
import { IssueService } from "@/modules/issues/application/issue-service";
import { ProjectDetailService } from "@/modules/projects/application/project-detail-service";
import { NotFoundError } from "@/modules/shared/application/application-error";

export type AttachmentTarget =
  | { type: "client"; id: string }
  | { type: "project"; id: string }
  | { type: "issue"; id: string };

export class AttachmentAccessService {
  readonly #clients = new ClientAccessService();
  readonly #issues = new IssueService();
  readonly #projects = new ProjectDetailService();

  async assertCanRead(principal: Principal, target: AttachmentTarget): Promise<void> {
    if (target.type === "client") return this.#clients.assertCanRead(principal, target.id);
    if (target.type === "project") {
      await this.#projects.get(principal, target.id);
      return;
    }
    await this.#issues.get(principal, target.id);
  }

  async assertCanContribute(principal: Principal, target: AttachmentTarget): Promise<void> {
    await this.assertCanRead(principal, target);
    const clientId = await this.#clientId(principal.workspaceId, target);
    await this.#clients.assertCanContribute(principal, clientId);
  }

  async #clientId(workspaceId: string, target: AttachmentTarget): Promise<string> {
    if (target.type === "client") return target.id;
    const table = target.type === "project" ? projects : issues;
    const [record] = await db
      .select({ clientId: table.clientId })
      .from(table)
      .where(and(eq(table.workspaceId, workspaceId), eq(table.id, target.id), isNull(table.archivedAt)))
      .limit(1);
    if (!record) throw new NotFoundError(`${target.type === "project" ? "Project" : "Issue"} not found.`);
    return record.clientId;
  }
}

export function targetColumns(target: AttachmentTarget) {
  return {
    clientId: target.type === "client" ? target.id : null,
    projectId: target.type === "project" ? target.id : null,
    issueId: target.type === "issue" ? target.id : null,
  };
}
