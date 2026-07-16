"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  IssuePriorityIcon,
  IssuePriorityPickerContent,
  IssueStatusPickerContent,
  WorkflowStatusIcon,
} from "@/modules/workspace-ui/components/issue-property-picker-content";
import { issuePriorityMetadata } from "@/modules/workspace-ui/components/issue-property-metadata";
import { PropertyTrigger } from "@/modules/workspace-ui/components/property-trigger";
import type {
  IssuePriority,
  WorkflowStatusRecord,
} from "@/modules/workspace-ui/domain/workspace-types";

export function IssuePriorityProperty({
  value,
  disabled,
  onChange,
}: {
  value: IssuePriority;
  disabled?: boolean;
  onChange: (priority: IssuePriority) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <span>
          <PropertyTrigger
            disabled={disabled}
            iconElement={<IssuePriorityIcon priority={value} className="size-3.5" />}
            label="Priority"
            value={issuePriorityMetadata[value].label}
          />
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0">
        <IssuePriorityPickerContent value={value} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}

export function IssueStatusProperty({
  statuses,
  statusId,
  statusName,
  statusColor,
  disabled,
  onChange,
}: {
  statuses: WorkflowStatusRecord[];
  statusId: string | null;
  statusName: string | null;
  statusColor: string | null;
  disabled?: boolean;
  onChange: (status: WorkflowStatusRecord) => void;
}) {
  const selected = statuses.find((status) => status.id === statusId);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <span>
          <PropertyTrigger
            disabled={disabled || !statuses.length}
            iconElement={(
              <WorkflowStatusIcon
                category={selected?.category}
                className="size-3.5"
                color={statusColor}
              />
            )}
            label="Status"
            value={statusName ?? "Backlog"}
          />
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <IssueStatusPickerContent statuses={statuses} value={statusId} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}
