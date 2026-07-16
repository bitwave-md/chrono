"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PropertyTriggerProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  color?: string | null;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}

export function PropertyTrigger({ icon: Icon, label, value, color, ...props }: PropertyTriggerProps) {
  return (
    <Button
      aria-label={`${label}: ${typeof value === "string" ? value : "selected"}`}
      className={cn("h-8 max-w-56 justify-start gap-1.5 px-2 text-muted-foreground hover:text-foreground", props.className)}
      disabled={props.disabled}
      size="sm"
      variant="ghost"
      onClick={props.onClick}
    >
      <Icon className="size-3.5" style={color ? { color } : undefined} />
      <span className="truncate">{value}</span>
    </Button>
  );
}
