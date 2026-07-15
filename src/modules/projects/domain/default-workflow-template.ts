export interface WorkflowStatusTemplate {
  name: string;
  slug: string;
  category: "backlog" | "unstarted" | "started" | "completed" | "canceled";
  color: string;
  position: number;
  isDefault: boolean;
}

export class DefaultWorkflowTemplate {
  readonly name = "Default workflow";

  statuses(): WorkflowStatusTemplate[] {
    return [
      {
        name: "Backlog",
        slug: "backlog",
        category: "backlog",
        color: "#71717a",
        position: 0,
        isDefault: true,
      },
      {
        name: "Todo",
        slug: "todo",
        category: "unstarted",
        color: "#a1a1aa",
        position: 1,
        isDefault: false,
      },
      {
        name: "In Progress",
        slug: "in-progress",
        category: "started",
        color: "#60a5fa",
        position: 2,
        isDefault: false,
      },
      {
        name: "Done",
        slug: "done",
        category: "completed",
        color: "#4ade80",
        position: 3,
        isDefault: false,
      },
      {
        name: "Canceled",
        slug: "canceled",
        category: "canceled",
        color: "#f87171",
        position: 4,
        isDefault: false,
      },
    ];
  }
}
