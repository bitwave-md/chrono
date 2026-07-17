"use client";

import { format } from "date-fns";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function ManualTimeDatePicker({
  value,
  onChange,
}: {
  value: Date;
  onChange: (date: Date) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="h-8 justify-start rounded-full font-normal" size="sm" variant="outline">
          <CalendarDays />
          {format(value, "MMM d, yyyy")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          disabled={{ after: new Date() }}
          mode="single"
          selected={value}
          onSelect={(date) => date && onChange(date)}
        />
      </PopoverContent>
    </Popover>
  );
}
