"use client";

import { Check, CircleDashed } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  issuePriorityMetadata,
  issuePriorityOptions,
  workflowStatusIcons,
} from "@/modules/workspace-ui/components/issue-property-metadata";
import type {
  IssuePriority,
  WorkflowStatusRecord,
} from "@/modules/workspace-ui/domain/workspace-types";

export function IssuePriorityPickerContent({
  value,
  onChange,
}: {
  value: IssuePriority;
  onChange: (priority: IssuePriority) => void;
}) {
  return (
    <Command>
      <CommandInput placeholder="Change priority..." />
      <CommandList>
        <CommandGroup>
          {issuePriorityOptions.map((option) => (
            <CommandItem key={option.value} onSelect={() => onChange(option.value)}>
              <IssuePriorityIcon priority={option.value} />
              <span className="flex-1">{option.label}</span>
              {option.value === value ? <Check className="size-4" /> : null}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export function IssueStatusPickerContent({
  statuses,
  value,
  onChange,
}: {
  statuses: WorkflowStatusRecord[];
  value: string | null;
  onChange: (status: WorkflowStatusRecord) => void;
}) {
  return (
    <Command>
      <CommandInput placeholder="Change status..." />
      <CommandList>
        <CommandEmpty>No workflow status found.</CommandEmpty>
        <CommandGroup>
          {statuses.map((status) => (
            <CommandItem key={status.id} value={status.name} onSelect={() => onChange(status)}>
              <WorkflowStatusIcon category={status.category} color={status.color} />
              <span className="flex-1">{status.name}</span>
              {status.id === value ? <Check className="size-4" /> : null}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export function IssuePriorityIcon({
  priority,
  className,
}: {
  priority: IssuePriority;
  className?: string;
}) {
  const metadata = issuePriorityMetadata[priority];
  const Icon = metadata.icon;
  return <Icon className={cn("size-4", metadata.iconClassName, className)} />;
}

export function WorkflowStatusIcon({
  category,
  color,
  className,
}: {
  category?: WorkflowStatusRecord["category"];
  color?: string | null;
  className?: string;
}) {
  const Icon = category ? workflowStatusIcons[category] : CircleDashed;
  return <Icon className={cn("size-4", className)} style={color ? { color } : undefined} />;
}
