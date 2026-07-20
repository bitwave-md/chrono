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
        <Button asChild className="h-10 rounded-xl border-indigo-400/35 bg-indigo-400/10 px-4 text-indigo-300 hover:bg-indigo-400/15 hover:text-indigo-200" variant="outline">
          <Link href={input.href} onClick={() => toast.dismiss(current.id)}>View issue</Link>
        </Button>
      )}
      indicator={<WorkflowStatusIcon category={input.status.category} color={input.status.color} />}
    >
      <p className="truncate text-sm font-medium text-muted-foreground">{input.identifier}</p>
      <p className="truncate text-base font-semibold text-foreground">{input.title}</p>
    </ToastSurface>
  ), {
    ariaProps: { role: "status", "aria-live": "polite" },
    duration: 8_000,
  });
}
