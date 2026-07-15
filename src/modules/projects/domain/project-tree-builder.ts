import { ConflictError } from "../../shared/application/application-error.ts";

export interface ProjectRecord {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  kind: "project" | "subproject" | "sprint";
  workflowMode: "own" | "inherit";
  visibility: "internal" | "client_shared" | "restricted";
  position: number;
  namespacePrefix: string | null;
  workflowId: string | null;
}

export interface ProjectTreeNode extends ProjectRecord {
  effectiveNamespacePrefix: string;
  effectiveWorkflowId: string;
  children: ProjectTreeNode[];
}

interface ResolvedMetadata {
  namespacePrefix: string;
  workflowId: string;
}

export class ProjectTreeBuilder {
  build(
    records: ProjectRecord[],
    clientNamespacePrefix: string,
  ): ProjectTreeNode[] {
    const recordsById = new Map(records.map((record) => [record.id, record]));
    const resolved = new Map<string, ResolvedMetadata>();
    const visiting = new Set<string>();

    const resolve = (record: ProjectRecord): ResolvedMetadata => {
      const cached = resolved.get(record.id);

      if (cached) {
        return cached;
      }

      if (visiting.has(record.id)) {
        throw new ConflictError("The project hierarchy contains a cycle.");
      }

      visiting.add(record.id);

      const parent = record.parentId
        ? recordsById.get(record.parentId)
        : undefined;

      if (record.parentId && !parent) {
        throw new ConflictError("The project hierarchy contains an orphan.");
      }

      const inherited = parent ? resolve(parent) : null;
      const metadata = {
        namespacePrefix:
          record.namespacePrefix ??
          inherited?.namespacePrefix ??
          clientNamespacePrefix,
        workflowId: record.workflowId ?? inherited?.workflowId ?? "",
      };

      if (!metadata.workflowId) {
        throw new ConflictError("The project has no effective workflow.");
      }

      visiting.delete(record.id);
      resolved.set(record.id, metadata);
      return metadata;
    };

    const nodesById = new Map<string, ProjectTreeNode>();

    for (const record of records) {
      const metadata = resolve(record);
      nodesById.set(record.id, {
        ...record,
        effectiveNamespacePrefix: metadata.namespacePrefix,
        effectiveWorkflowId: metadata.workflowId,
        children: [],
      });
    }

    const roots: ProjectTreeNode[] = [];

    for (const node of nodesById.values()) {
      if (!node.parentId) {
        roots.push(node);
        continue;
      }

      nodesById.get(node.parentId)?.children.push(node);
    }

    const sortNodes = (nodes: ProjectTreeNode[]): void => {
      nodes.sort(
        (left, right) =>
          left.position - right.position || left.name.localeCompare(right.name),
      );
      nodes.forEach((node) => sortNodes(node.children));
    };

    sortNodes(roots);
    return roots;
  }
}
