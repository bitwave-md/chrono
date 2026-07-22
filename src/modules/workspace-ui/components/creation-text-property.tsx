"use client";

import type { LucideIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PropertyTrigger } from "@/modules/workspace-ui/components/property-trigger";

export function CreationTextProperty({
  help,
  icon,
  label,
  maxLength,
  placeholder,
  value,
  onChange,
}: {
  help: string;
  icon: LucideIcon;
  label: string;
  maxLength: number;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <span><PropertyTrigger icon={icon} label={label} value={value || placeholder} /></span>
      </PopoverTrigger>
      <PopoverContent align="start" className="grid w-72 gap-2 p-3">
        <strong className="text-sm">{label}</strong>
        <Input autoFocus maxLength={maxLength} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
        <p className="text-xs leading-5 text-muted-foreground">{help}</p>
      </PopoverContent>
    </Popover>
  );
}
