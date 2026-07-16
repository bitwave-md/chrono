"use client";

import { CalendarDays } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PropertyTrigger } from "@/modules/workspace-ui/components/property-trigger";

export function DateProperty({ label, value, onChange }: { label: string; value: string | null; onChange: (value: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const dateValue = value ? new Date(value).toISOString().slice(0, 10) : "";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><span><PropertyTrigger icon={CalendarDays} label={label} value={value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : label} /></span></PopoverTrigger>
      <PopoverContent align="start" className="grid w-64 gap-2 p-3">
        <span className="text-xs font-medium">{label}</span>
        <Input type="date" value={dateValue} onChange={(event) => {
          onChange(event.target.value ? new Date(`${event.target.value}T12:00:00Z`).toISOString() : null);
          setOpen(false);
        }} />
        {value ? <Button size="sm" variant="ghost" onClick={() => { onChange(null); setOpen(false); }}>Clear date</Button> : null}
      </PopoverContent>
    </Popover>
  );
}
