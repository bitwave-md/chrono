"use client";

import { Check, UserRound } from "lucide-react";

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

interface MemberPropertyProps {
  label: string;
  members: MemberRecord[];
  value: MemberRecord | null;
  disabled?: boolean;
  onChange: (member: MemberRecord | null) => void;
}

export function MemberProperty({
  label,
  members,
  value,
  disabled,
  onChange,
}: MemberPropertyProps) {
  const display = value ? (
    <span className="flex min-w-0 items-center gap-1.5">
      <MemberAvatar member={value} />
      <span className="truncate">{value.displayName ?? value.email}</span>
    </span>
  ) : `No ${label.toLowerCase()}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <span>
          <PropertyTrigger
            disabled={disabled}
            icon={UserRound}
            label={label}
            value={display}
          />
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command>
          <CommandInput placeholder={`Choose ${label.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No Workspace member found.</CommandEmpty>
            <CommandGroup heading="People">
              <CommandItem onSelect={() => onChange(null)}>
                <span className="grid size-6 place-items-center rounded-full bg-muted">
                  <UserRound className="size-3.5 text-muted-foreground" />
                </span>
                <span className="flex-1">No {label.toLowerCase()}</span>
                {!value ? <Check className="size-4" /> : null}
              </CommandItem>
              {members.map((member) => (
                <CommandItem
                  key={member.membershipId}
                  value={`${member.displayName ?? ""} ${member.email}`}
                  onSelect={() => onChange(member)}
                >
                  <MemberAvatar member={member} />
                  <span className="min-w-0 flex-1 truncate">
                    {member.displayName ?? member.email}
                  </span>
                  {value?.membershipId === member.membershipId ? (
                    <Check className="size-4" />
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function MemberAvatar({ member }: { member: MemberRecord }) {
  const label = member.displayName ?? member.email;
  return (
    <Avatar className="size-5">
      <AvatarImage alt="" src={member.avatarUrl ?? undefined} />
      <AvatarFallback className="text-[0.55rem]">
        {label.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
