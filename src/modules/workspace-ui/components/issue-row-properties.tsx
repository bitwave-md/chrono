"use client";

import {
  Check,
  CheckCircle2,
  Circle,
  CircleDashed,
  CircleX,
  LoaderCircle,
  Tags,
  UserRound,
} from "lucide-react";
import type { MouseEvent } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { issuePriorityMetadata } from "@/modules/workspace-ui/components/issue-badges";
import type {
  IssuePriority,
  IssueRecord,
  MemberRecord,
  WorkflowStatusRecord,
} from "@/modules/workspace-ui/domain/workspace-types";

const priorities = ["none", "urgent", "high", "medium", "low"] as const;

export function IssuePriorityTrigger({
  value,
  disabled,
  onChange,
}: {
  value: IssuePriority;
  disabled?: boolean;
  onChange: (priority: IssuePriority) => void;
}) {
  const selected = issuePriorityMetadata[value];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label={`Priority: ${selected.label}`}
          className={cn("size-7 text-muted-foreground", priorityClass(value))}
          disabled={disabled}
          size="icon-sm"
          title={selected.label}
          variant="ghost"
          onClick={stopRowClick}
        >
          <selected.Icon className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0" onClick={stopPopoverClick}>
        <Command>
          <CommandInput placeholder="Change priority..." />
          <CommandList>
            <CommandGroup>
              {priorities.map((priority) => {
                const metadata = issuePriorityMetadata[priority];
                return (
                  <CommandItem key={priority} onSelect={() => onChange(priority)}>
                    <metadata.Icon className={cn("size-4", priorityClass(priority))} />
                    <span className="flex-1">{metadata.label}</span>
                    {priority === value ? <Check className="size-4" /> : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function IssueStatusTrigger({
  statuses,
  issue,
  disabled,
  onChange,
}: {
  statuses: WorkflowStatusRecord[];
  issue: IssueRecord;
  disabled?: boolean;
  onChange: (status: WorkflowStatusRecord) => void;
}) {
  const selected = statuses.find((status) => status.id === issue.statusId);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label={`Status: ${issue.statusName ?? "Backlog"}`}
          className="size-7"
          disabled={disabled || !statuses.length}
          size="icon-sm"
          title={issue.statusName ?? "Backlog"}
          variant="ghost"
          onClick={stopRowClick}
        >
          <WorkflowStatusIcon
            category={selected?.category}
            color={issue.statusColor}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0" onClick={stopPopoverClick}>
        <Command>
          <CommandInput placeholder="Change status..." />
          <CommandList>
            <CommandEmpty>No workflow status found.</CommandEmpty>
            <CommandGroup>
              {statuses.map((status) => (
                <CommandItem key={status.id} value={status.name} onSelect={() => onChange(status)}>
                  <WorkflowStatusIcon category={status.category} color={status.color} />
                  <span className="flex-1">{status.name}</span>
                  {status.id === issue.statusId ? <Check className="size-4" /> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function IssueLabelsTrigger({
  options,
  value,
  disabled,
  onChange,
}: {
  options: IssueRecord["labels"];
  value: IssueRecord["labels"];
  disabled?: boolean;
  onChange: (labels: IssueRecord["labels"]) => void;
}) {
  const selected = new Set(value.map((label) => label.id));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label="Labels"
          className="h-7 max-w-64 justify-end gap-1 overflow-hidden px-1.5"
          disabled={disabled}
          size="sm"
          variant="ghost"
          onClick={stopRowClick}
        >
          {value.length ? value.slice(0, 2).map((label) => (
            <Badge className="max-w-28 gap-1.5 bg-background/50" key={label.id} variant="outline">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: label.color }} />
              <span className="truncate">{label.name}</span>
            </Badge>
          )) : <Tags className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover/issue:opacity-100 group-focus-within/issue:opacity-100" />}
          {value.length > 2 ? <span className="text-xs text-muted-foreground">+{value.length - 2}</span> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0" onClick={stopPopoverClick}>
        <Command>
          <CommandInput placeholder="Change labels..." />
          <CommandList>
            <CommandEmpty>No labels found.</CommandEmpty>
            <CommandGroup>
              {options.map((label) => (
                <CommandItem
                  key={label.id}
                  value={label.name}
                  onSelect={() => onChange(selected.has(label.id)
                    ? value.filter((item) => item.id !== label.id)
                    : [...value, label])}
                >
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: label.color }} />
                  <span className="flex-1">{label.name}</span>
                  {selected.has(label.id) ? <Check className="size-4" /> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function IssueAssigneesTrigger({
  members,
  value,
  disabled,
  onChange,
}: {
  members: MemberRecord[];
  value: MemberRecord[];
  disabled?: boolean;
  onChange: (members: MemberRecord[]) => void;
}) {
  const selected = new Set(value.map((member) => member.membershipId));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label="Assignees"
          className="size-7"
          disabled={disabled}
          size="icon-sm"
          variant="ghost"
          onClick={stopRowClick}
        >
          {value[0] ? <MemberAvatar member={value[0]} /> : <UserRound className="size-4 text-muted-foreground" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0" onClick={stopPopoverClick}>
        <Command>
          <CommandInput placeholder="Assign people..." />
          <CommandList>
            <CommandEmpty>No Workspace member found.</CommandEmpty>
            <CommandGroup heading="People">
              {members.map((member) => (
                <CommandItem
                  key={member.membershipId}
                  value={`${member.displayName ?? ""} ${member.email}`}
                  onSelect={() => onChange(selected.has(member.membershipId)
                    ? value.filter((item) => item.membershipId !== member.membershipId)
                    : [...value, member])}
                >
                  <MemberAvatar member={member} />
                  <span className="min-w-0 flex-1 truncate">{member.displayName ?? member.email}</span>
                  {selected.has(member.membershipId) ? <Check className="size-4" /> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
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
  const Icon = category === "completed"
    ? CheckCircle2
    : category === "canceled"
      ? CircleX
      : category === "started"
        ? LoaderCircle
        : category === "unstarted"
          ? Circle
          : CircleDashed;
  return <Icon className={cn("size-4", className)} style={color ? { color } : undefined} />;
}

function MemberAvatar({ member }: { member: MemberRecord }) {
  const label = member.displayName ?? member.email;
  return (
    <Avatar className="size-5">
      <AvatarImage alt="" src={member.avatarUrl ?? undefined} />
      <AvatarFallback className="text-[0.55rem]">{label.slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

function priorityClass(priority: IssuePriority) {
  if (priority === "urgent") return "text-destructive";
  if (priority === "high") return "text-amber-400";
  if (priority === "medium") return "text-foreground/75";
  if (priority === "low") return "text-blue-400";
  return "text-muted-foreground";
}

function stopRowClick(event: MouseEvent<HTMLButtonElement>) {
  event.stopPropagation();
}

function stopPopoverClick(event: MouseEvent<HTMLDivElement>) {
  event.stopPropagation();
}
