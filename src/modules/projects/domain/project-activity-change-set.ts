export type ProjectActivityField =
  | "state"
  | "priority"
  | "lead"
  | "summary"
  | "description"
  | "visibility"
  | "startDate"
  | "targetDate"
  | "assignees"
  | "icon";

export interface ProjectActivityChange {
  field: ProjectActivityField;
  from?: string | null;
  to?: string | null;
}

export interface ProjectActivitySnapshot {
  state: string;
  priority: string;
  leadMembershipId: string | null;
  summary: string | null;
  description: string | null;
  visibility: string;
  startDate: Date | string | null;
  targetDate: Date | string | null;
  assigneeMembershipIds: string[];
  iconType: string;
  iconKey: string;
  iconColor: string;
}

export type ProjectActivityPatch = Partial<ProjectActivitySnapshot>;

const valueFields = new Set<ProjectActivityField>([
  "state",
  "priority",
  "visibility",
  "startDate",
  "targetDate",
]);

export class ProjectActivityChangeSet {
  readonly #changes: ProjectActivityChange[];

  private constructor(changes: ProjectActivityChange[]) {
    this.#changes = changes;
  }

  static between(current: ProjectActivitySnapshot, patch: ProjectActivityPatch) {
    const changes: ProjectActivityChange[] = [];
    const append = (field: ProjectActivityField, from: unknown, to: unknown) => {
      const normalizedFrom = normalize(field, from);
      const normalizedTo = normalize(field, to);
      if (normalizedFrom === normalizedTo) return;
      changes.push(valueFields.has(field)
        ? { field, from: normalizedFrom, to: normalizedTo }
        : { field });
    };

    for (const field of [
      "state",
      "priority",
      "summary",
      "description",
      "visibility",
      "startDate",
      "targetDate",
    ] as const) {
      if (patch[field] !== undefined) append(field, current[field], patch[field]);
    }

    if (patch.leadMembershipId !== undefined) {
      append("lead", current.leadMembershipId, patch.leadMembershipId);
    }
    if (patch.assigneeMembershipIds !== undefined) {
      append("assignees", current.assigneeMembershipIds, patch.assigneeMembershipIds);
    }
    if (
      patch.iconType !== undefined
      || patch.iconKey !== undefined
      || patch.iconColor !== undefined
    ) {
      append(
        "icon",
        [current.iconType, current.iconKey, current.iconColor],
        [
          patch.iconType ?? current.iconType,
          patch.iconKey ?? current.iconKey,
          patch.iconColor ?? current.iconColor,
        ],
      );
    }

    return new ProjectActivityChangeSet(changes);
  }

  get hasChanges(): boolean {
    return this.#changes.length > 0;
  }

  has(field: ProjectActivityField): boolean {
    return this.#changes.some((change) => change.field === field);
  }

  payload(): { changes: ProjectActivityChange[] } {
    return { changes: this.#changes.map((change) => ({ ...change })) };
  }
}

function normalize(field: ProjectActivityField, value: unknown): string | null {
  if (value === null) return null;
  if (field === "startDate" || field === "targetDate") {
    return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
  }
  if (Array.isArray(value)) return [...value].map(String).sort().join("\u0000");
  return String(value);
}
