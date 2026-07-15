"use client";

import { useEffect } from "react";

import type { IssueRecord } from "@/modules/workspace-ui/domain/workspace-types";
import type { WorkspaceViewMode } from "@/modules/workspace-ui/state/workspace-view-store";

interface WorkspaceShortcutOptions {
  issues: IssueRecord[];
  focusedIssueId: string | null;
  dialogOpen: boolean;
  onToggleCommand: () => void;
  onOpenCreate: () => void;
  onToggleSidebar: () => void;
  onSetView: (view: WorkspaceViewMode) => void;
  onFocusIssue: (issueId: string) => void;
  onOpenIssue: (issueId: string) => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.matches("input, textarea, select") || target.isContentEditable)
  );
}

export function useWorkspaceShortcuts(options: WorkspaceShortcutOptions): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        options.onToggleCommand();
        return;
      }

      if (isTypingTarget(event.target) || options.dialogOpen) {
        return;
      }

      if (event.key.toLowerCase() === "c") {
        event.preventDefault();
        options.onOpenCreate();
        return;
      }

      if (event.key === "[") {
        event.preventDefault();
        options.onToggleSidebar();
        return;
      }

      if (event.key === "1" || event.key === "2") {
        options.onSetView(event.key === "1" ? "list" : "board");
        return;
      }

      const currentIndex = options.issues.findIndex(
        (issue) => issue.id === options.focusedIssueId,
      );

      if (event.key.toLowerCase() === "j" || event.key.toLowerCase() === "k") {
        event.preventDefault();
        const delta = event.key.toLowerCase() === "j" ? 1 : -1;
        const nextIndex = Math.min(
          options.issues.length - 1,
          Math.max(0, (currentIndex < 0 ? 0 : currentIndex) + delta),
        );
        const issue = options.issues[nextIndex];
        if (issue) {
          options.onFocusIssue(issue.id);
        }
        return;
      }

      if (event.key === "Enter" && options.focusedIssueId) {
        event.preventDefault();
        options.onOpenIssue(options.focusedIssueId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [options]);
}
