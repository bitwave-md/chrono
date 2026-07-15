"use client";

import { LoaderCircle, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  formatElapsed,
  useElapsedSeconds,
} from "@/modules/workspace-ui/application/use-elapsed-seconds";
import { useStopTimerMutation } from "@/modules/workspace-ui/application/use-timer-query";
import type { ActiveTimerState } from "@/modules/workspace-ui/domain/workspace-types";

export function TimerDock({
  workspaceSlug,
  state,
}: {
  workspaceSlug: string;
  state: ActiveTimerState | undefined;
}) {
  const stopTimer = useStopTimerMutation(workspaceSlug);
  const elapsed = useElapsedSeconds(
    state?.timer?.startedAt ?? null,
    state?.serverNow ?? null,
  );

  if (!state?.timer) {
    return null;
  }

  return (
    <Card className="timer-dock">
      <span className="timer-pulse" />
      <div className="timer-dock-issue">
        <span>{state.timer.identifier}</span>
        <strong>{state.timer.issueTitle}</strong>
      </div>
      <time>{formatElapsed(elapsed)}</time>
      <Button
        aria-label="Stop active timer"
        className="timer-stop-button"
        disabled={stopTimer.isPending}
        size="sm"
        variant="destructive"
        onClick={() => stopTimer.mutate()}
      >
        {stopTimer.isPending ? (
          <LoaderCircle className="spinner" size={15} />
        ) : (
          <Square fill="currentColor" size={13} />
        )}
        Stop
      </Button>
    </Card>
  );
}
