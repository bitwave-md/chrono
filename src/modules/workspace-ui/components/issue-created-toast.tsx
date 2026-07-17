"use client";

import { CircleCheck, X } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
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
    <article className="w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl">
      <div className="flex items-center gap-3">
        <CircleCheck className="size-7 shrink-0 fill-emerald-500 text-background" />
        <strong className="min-w-0 flex-1 text-lg font-semibold">Issue created</strong>
        <Button
          aria-label="Dismiss notification"
          className="size-8 rounded-full text-muted-foreground"
          size="icon-sm"
          variant="ghost"
          onClick={() => toast.dismiss(current.id)}
        >
          <X />
        </Button>
      </div>
      <div className="mt-4 flex min-w-0 items-center gap-2 pl-10 text-base">
        <WorkflowStatusIcon category={input.status.category} color={input.status.color} />
        <span className="truncate">{input.identifier} — {input.title}</span>
      </div>
      <Link
        className="mt-5 inline-flex pl-10 text-sm font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
        href={input.href}
        onClick={() => toast.dismiss(current.id)}
      >
        View issue
      </Link>
    </article>
  ), {
    ariaProps: { role: "status", "aria-live": "polite" },
    duration: 8_000,
  });
}
