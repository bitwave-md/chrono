"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const EMPTY_VALUE = "__chrono_empty__";

interface WorkspaceSelectOption {
  value: string;
  label: string;
}

interface WorkspaceSelectProps {
  value: string | null;
  options: WorkspaceSelectOption[];
  emptyLabel?: string;
  disabled?: boolean;
  label: string;
  className?: string;
  onValueChange: (value: string | null) => void;
}

export function WorkspaceSelect({
  value,
  options,
  emptyLabel,
  disabled,
  label,
  className,
  onValueChange,
}: WorkspaceSelectProps) {
  return (
    <Select
      disabled={disabled}
      value={value || EMPTY_VALUE}
      onValueChange={(nextValue) =>
        onValueChange(nextValue === EMPTY_VALUE ? null : nextValue)
      }
    >
      <SelectTrigger aria-label={label} className={cn("w-full", className)}>
        <SelectValue placeholder={emptyLabel ?? "Select an option"} />
      </SelectTrigger>
      <SelectContent>
        {emptyLabel ? <SelectItem value={EMPTY_VALUE}>{emptyLabel}</SelectItem> : null}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
