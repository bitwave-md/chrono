"use client";

import { Clock3, UserRound } from "lucide-react";

import {
  PriorityBadge,
  StatusBadge,
} from "@/modules/workspace-ui/components/issue-badges";
import type { IssueRecord } from "@/modules/workspace-ui/domain/workspace-types";

interface IssueListProps {
  issues: IssueRecord[];
  focusedIssueId: string | null;
  onFocus: (issueId: string) => void;
  onOpen: (issueId: string) => void;
}

export function IssueList(props: IssueListProps) {
  if (!props.issues.length) {
    return (
      <div className="issue-empty-state">
        <span className="empty-orbit" />
        <h2>No issues in this view</h2>
        <p>Press C to create the first item without leaving the keyboard.</p>
      </div>
    );
  }

  return (
    <div className="issue-list" role="list">
      <div className="issue-list-header" aria-hidden="true">
        <span>Issue</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Team</span>
      </div>
      {props.issues.map((issue) => (
        <button
          className="issue-row"
          data-focused={props.focusedIssueId === issue.id}
          data-optimistic={issue.optimistic}
          key={issue.id}
          role="listitem"
          type="button"
          onClick={() => props.onOpen(issue.id)}
          onFocus={() => props.onFocus(issue.id)}
          onMouseEnter={() => props.onFocus(issue.id)}
        >
          <span className="issue-primary-cell">
            <span className="issue-identifier">{issue.identifier}</span>
            <span className="issue-title">{issue.title}</span>
            {issue.description ? (
              <span className="issue-has-description" title="Has description" />
            ) : null}
          </span>
          <StatusBadge name={issue.statusName} />
          <PriorityBadge priority={issue.priority} />
          <span className="issue-team-cell">
            {issue.teamName ? (
              <>
                <span className="team-avatar">{issue.teamName.slice(0, 2)}</span>
                <span>{issue.teamName}</span>
              </>
            ) : issue.assigneeName ? (
              <>
                <UserRound size={14} />
                <span>{issue.assigneeName}</span>
              </>
            ) : (
              <span className="muted-inline">Unassigned</span>
            )}
          </span>
          {issue.optimistic ? (
            <span className="optimistic-indicator">
              <Clock3 size={12} /> Saving
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
