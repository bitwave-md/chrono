"use client";

import { Check, Tags } from "lucide-react";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PropertyTrigger } from "@/modules/workspace-ui/components/property-trigger";

interface LabelRecord { id: string; name: string; color: string }

export function LabelProperty({ disabled = false, options, value, onChange }: { disabled?: boolean; options: LabelRecord[]; value: LabelRecord[]; onChange: (labels: LabelRecord[]) => void }) {
  const selected = new Set(value.map((label) => label.id));
  return (
    <Popover>
      <PopoverTrigger asChild><span><PropertyTrigger disabled={disabled} icon={Tags} label="Labels" value={value.length ? value.map((label) => label.name).join(", ") : "Add labels"} /></span></PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command aria-disabled={disabled}>
          <CommandInput placeholder="Change labels..." />
          <CommandList>
            <CommandEmpty>No labels found.</CommandEmpty>
            <CommandGroup>
              {options.map((label) => (
                <CommandItem disabled={disabled} key={label.id} value={label.name} onSelect={() => onChange(selected.has(label.id) ? value.filter((item) => item.id !== label.id) : [...value, label])}>
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: label.color }} /><span className="flex-1">{label.name}</span>{selected.has(label.id) ? <Check className="size-4" /> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
