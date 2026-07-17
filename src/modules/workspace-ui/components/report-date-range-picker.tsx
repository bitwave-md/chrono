"use client";

import { addDays, format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ClientReportRange } from "@/modules/workspace-ui/domain/client-time-report";

export function ReportDateRangePicker({
  range,
  onChange,
}: {
  range: ClientReportRange;
  onChange: (range: ClientReportRange) => void;
}) {
  const inclusiveTo = addDays(range.to, -1);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>({ from: range.from, to: inclusiveTo });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button className="justify-start rounded-full font-normal" size="sm" variant="outline">
          <CalendarDays />
          {format(range.from, "MMM d")} – {format(inclusiveTo, "MMM d, yyyy")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto max-w-[calc(100vw-2rem)] overflow-auto p-0">
        <Calendar
          defaultMonth={draft.from}
          disabled={{ after: new Date() }}
          mode="range"
          numberOfMonths={2}
          selected={draft}
          onSelect={(selection) => {
            setDraft(selection ?? { from: undefined, to: undefined });
            if (selection?.from && selection.to) {
              onChange({ from: selection.from, to: addDays(selection.to, 1) });
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
