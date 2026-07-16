"use client";

import { Check, type LucideIcon } from "lucide-react";

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
import { PropertyTrigger } from "@/modules/workspace-ui/components/property-trigger";

export interface PropertyOption {
  value: string;
  label: string;
  color?: string | null;
  icon?: LucideIcon;
  iconClassName?: string;
}

interface OptionPropertyProps {
  icon: LucideIcon;
  label: string;
  placeholder: string;
  value: string | null;
  options: readonly PropertyOption[];
  allowEmpty?: boolean;
  disabled?: boolean;
  onChange: (value: string | null) => void;
}

export function OptionProperty(props: OptionPropertyProps) {
  const selected = props.options.find((option) => option.value === props.value);
  const SelectedIcon = selected?.icon ?? props.icon;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <span>
          <PropertyTrigger
            color={selected?.color}
            disabled={props.disabled}
            icon={SelectedIcon}
            iconClassName={selected?.iconClassName}
            label={props.label}
            value={selected?.label ?? props.placeholder}
          />
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder={`Change ${props.label.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup>
              {props.allowEmpty ? (
                <CommandItem onSelect={() => props.onChange(null)}>
                  <span className="size-2.5 rounded-full border" />
                  <span className="flex-1">{props.placeholder}</span>
                  {!props.value ? <Check className="size-4" /> : null}
                </CommandItem>
              ) : null}
              {props.options.map((option) => {
                const OptionIcon = option.icon;
                return (
                  <CommandItem key={option.value} value={option.label} onSelect={() => props.onChange(option.value)}>
                    {OptionIcon ? (
                      <OptionIcon
                        className={cn("size-4", option.iconClassName)}
                        style={option.color ? { color: option.color } : undefined}
                      />
                    ) : (
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: option.color ?? "currentColor" }}
                      />
                    )}
                    <span className="flex-1">{option.label}</span>
                    {props.value === option.value ? <Check className="size-4" /> : null}
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
