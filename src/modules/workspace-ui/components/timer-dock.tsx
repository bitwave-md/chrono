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
    <Card className="fixed right-4 bottom-4 z-50 grid min-w-96 grid-cols-[10px_minmax(0,1fr)_auto_auto] items-center gap-3 bg-card/95 px-3 py-2 shadow-xl backdrop-blur-xl max-md:right-2 max-md:bottom-2 max-md:left-2 max-md:min-w-0 max-md:grid-cols-[10px_minmax(0,1fr)_auto]">
      <span className="size-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/10" />
      <div className="min-w-0">
        <span className="block truncate font-mono text-[0.62rem] text-muted-foreground">{state.timer.identifier}</span>
        <strong className="mt-0.5 block truncate text-xs">{state.timer.issueTitle}</strong>
      </div>
      <time className="font-mono text-sm tabular-nums max-md:hidden">{formatElapsed(elapsed)}</time>
      <Button
        aria-label="Stop active timer"
        disabled={stopTimer.isPending}
        size="sm"
        variant="destructive"
        onClick={() => stopTimer.mutate()}
      >
        {stopTimer.isPending ? (
          <LoaderCircle className="animate-spin" size={15} />
        ) : (
          <Square fill="currentColor" size={13} />
        )}
        Stop
      </Button>
    </Card>
  );
}
