"use client";

import { GripVertical } from "lucide-react";

import { PriorityBadge } from "@/modules/workspace-ui/components/issue-badges";
import type {
  IssueRecord,
  WorkflowStatusRecord,
} from "@/modules/workspace-ui/domain/workspace-types";

interface IssueBoardProps {
  issues: IssueRecord[];
  statuses: WorkflowStatusRecord[];
  selectedProjectId: string | null;
  onMove: (issue: IssueRecord, status: WorkflowStatusRecord) => void;
  onOpen: (issueId: string) => void;
}

export function IssueBoard(props: IssueBoardProps) {
  if (!props.selectedProjectId) {
    return (
      <div className="issue-empty-state board-empty-state">
        <span className="empty-orbit" />
        <h2>Select a Project or Sprint</h2>
        <p>Board movement is scoped to one effective Project workflow.</p>
      </div>
    );
  }

  return (
    <div className="issue-board">
      {props.statuses.map((status) => {
        const columnIssues = props.issues.filter(
          (issue) => issue.statusId === status.id,
        );

        return (
          <section
            className="board-column"
            key={status.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const issue = props.issues.find(
                (candidate) =>
                  candidate.id === event.dataTransfer.getData("text/issue-id"),
              );

              if (issue && issue.statusId !== status.id) {
                props.onMove(issue, status);
              }
            }}
          >
            <header className="board-column-header">
              <span
                className="board-status-dot"
                style={{ backgroundColor: status.color ?? undefined }}
              />
              <strong>{status.name}</strong>
              <span>{columnIssues.length}</span>
            </header>
            <div className="board-card-list">
              {columnIssues.map((issue) => (
                <button
                  className="board-card"
                  draggable={!issue.optimistic}
                  key={issue.id}
                  type="button"
                  onClick={() => props.onOpen(issue.id)}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/issue-id", issue.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                >
                  <span className="board-card-topline">
                    <span>{issue.identifier}</span>
                    <GripVertical size={14} />
                  </span>
                  <strong>{issue.title}</strong>
                  <span className="board-card-footer">
                    <PriorityBadge priority={issue.priority} />
                    <span>{issue.teamName ?? "Unassigned"}</span>
                  </span>
                </button>
              ))}
              {!columnIssues.length ? (
                <div className="board-drop-placeholder">Drop issues here</div>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
