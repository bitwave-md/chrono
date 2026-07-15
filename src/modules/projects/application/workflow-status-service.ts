import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { projects, workflows, workflowStatuses } from "@/db/schema";
import type { Principal } from "@/modules/authorization/domain/principal";
import { ClientAccessService } from "@/modules/clients/application/client-access-service";
import { NotFoundError } from "@/modules/shared/application/application-error";

export class WorkflowStatusService {
  readonly #clientAccess = new ClientAccessService();

  async list(principal: Principal, workflowId: string) {
    const [workflow] = await db
      .select({ clientId: projects.clientId })
      .from(workflows)
      .innerJoin(
        projects,
        and(
          eq(projects.id, workflows.projectId),
          eq(projects.workspaceId, workflows.workspaceId),
        ),
      )
      .where(
        and(
          eq(workflows.id, workflowId),
          eq(workflows.workspaceId, principal.workspaceId),
          isNull(projects.archivedAt),
        ),
      )
      .limit(1);

    if (!workflow) {
      throw new NotFoundError("Workflow not found.");
    }

    await this.#clientAccess.assertCanRead(principal, workflow.clientId);

    return db
      .select({
        id: workflowStatuses.id,
        name: workflowStatuses.name,
        slug: workflowStatuses.slug,
        category: workflowStatuses.category,
        color: workflowStatuses.color,
        position: workflowStatuses.position,
        isDefault: workflowStatuses.isDefault,
      })
      .from(workflowStatuses)
      .where(
        and(
          eq(workflowStatuses.workflowId, workflowId),
          eq(workflowStatuses.workspaceId, principal.workspaceId),
          isNull(workflowStatuses.archivedAt),
        ),
      )
      .orderBy(asc(workflowStatuses.position));
  }
}
