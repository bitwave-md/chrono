"use client";

import Link from "next/link";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { ToastSurface } from "@/components/ui/toast-surface";
import { WorkflowStatusIcon } from "@/modules/workspace-ui/components/issue-property-picker-content";
import type { WorkflowStatusRecord } from "@/modules/workspace-ui/domain/workspace-types";

interface IssueCreatedToastInput {
  identifier: string;
  title: string;
  href: string;
  status: Pick<WorkflowStatusRecord, "category" | "color">;
}

export function showIssueCreatedToast(input: IssueCreatedToastInput): void {
  toast.custom((current) => (
    <ToastSurface
      action={(
        <Button asChild size="sm" variant="secondary">
          <Link href={input.href} onClick={() => toast.dismiss(current.id)}>View issue</Link>
        </Button>
      )}
      indicator={<WorkflowStatusIcon category={input.status.category} color={input.status.color} />}
    >
      <span className="block truncate font-mono text-[0.62rem] text-muted-foreground">{input.identifier}</span>
      <strong className="mt-0.5 block truncate text-xs">{input.title}</strong>
    </ToastSurface>
  ), {
    ariaProps: { role: "status", "aria-live": "polite" },
    duration: 8_000,
  });
}
