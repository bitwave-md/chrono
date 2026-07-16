"use client";

import { Check, UserRound, UsersRound } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PropertyTrigger } from "@/modules/workspace-ui/components/property-trigger";
import type { MemberRecord } from "@/modules/workspace-ui/domain/workspace-types";

interface AssigneePropertyProps {
  members: MemberRecord[];
  value: MemberRecord[];
  disabled?: boolean;
  onChange: (members: MemberRecord[]) => void;
}

function initials(member: MemberRecord): string {
  return (member.displayName ?? member.email)
    .split(/\s+|@/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AssigneeProperty({ members, value, disabled, onChange }: AssigneePropertyProps) {
  const selected = new Set(value.map((member) => member.membershipId));
  const toggle = (member: MemberRecord) => {
    onChange(
      selected.has(member.membershipId)
        ? value.filter((candidate) => candidate.membershipId !== member.membershipId)
        : [...value, member],
    );
  };

  const display = value.length ? (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="flex -space-x-1.5">
        {value.slice(0, 3).map((member) => (
          <Avatar className="size-5 border border-background" key={member.membershipId}>
            <AvatarImage alt="" src={member.avatarUrl ?? undefined} />
            <AvatarFallback className="text-[0.6rem]">{initials(member)}</AvatarFallback>
          </Avatar>
        ))}
      </span>
      <span className="truncate">
        {value.length === 1 ? value[0].displayName ?? value[0].email : `${value.length} assignees`}
      </span>
    </span>
  ) : "Unassigned";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <span>
          <PropertyTrigger disabled={disabled} icon={UsersRound} label="Assignees" value={display} />
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Assign people..." />
          <CommandList>
            <CommandEmpty>No Workspace member found.</CommandEmpty>
            <CommandGroup heading="People">
              {members.map((member) => (
                <CommandItem
                  key={member.membershipId}
                  value={`${member.displayName ?? ""} ${member.email}`}
                  onSelect={() => toggle(member)}
                >
                  <Avatar className="size-6">
                    <AvatarImage alt="" src={member.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-[0.6rem]">{initials(member)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate">{member.displayName ?? member.email}</span>
                  {selected.has(member.membershipId) ? <Check className="size-4" /> : <UserRound className="size-4 opacity-0" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
