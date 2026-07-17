"use client";

import { Check, ChevronDown, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCreateTimeCategoryMutation } from "@/modules/workspace-ui/application/use-workspace-queries";
import type { TimeCategoryRecord } from "@/modules/workspace-ui/domain/workspace-types";

const fallbackColor = "#6B7280";

export function TimeEntryTypePicker({
  canCreate,
  categories,
  disabled,
  value,
  workspaceSlug,
  onChange,
}: {
  canCreate: boolean;
  categories: TimeCategoryRecord[];
  disabled?: boolean;
  value: string | null;
  workspaceSlug: string;
  onChange: (categoryId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const selected = categories.find((category) => category.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button className="max-w-48 justify-between rounded-full" disabled={disabled} size="sm" variant="outline">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: selected?.color ?? fallbackColor }} />
          <span className="min-w-0 flex-1 truncate text-left">{selected?.name ?? "Select type"}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        {creating ? (
          <CreateTypeForm
            workspaceSlug={workspaceSlug}
            onCancel={() => setCreating(false)}
            onCreated={(category) => {
              onChange(category.id);
              setCreating(false);
              setOpen(false);
            }}
          />
        ) : (
          <Command>
            <CommandInput placeholder="Search time entry types..." />
            <CommandList>
              <CommandEmpty>No time entry type found.</CommandEmpty>
              <CommandGroup heading="Time entry type">
                {categories.map((category) => (
                  <CommandItem
                    key={category.id}
                    value={category.name}
                    onSelect={() => {
                      onChange(category.id);
                      setOpen(false);
                    }}
                  >
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: category.color ?? fallbackColor }} />
                    <span className="flex-1 truncate">{category.name}</span>
                    {category.id === value ? <Check className="size-4" /> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
              {canCreate ? (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem onSelect={() => setCreating(true)}><Plus />Add time entry type</CommandItem>
                  </CommandGroup>
                </>
              ) : null}
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}

function CreateTypeForm({
  workspaceSlug,
  onCancel,
  onCreated,
}: {
  workspaceSlug: string;
  onCancel: () => void;
  onCreated: (category: TimeCategoryRecord) => void;
}) {
  const create = useCreateTimeCategoryMutation(workspaceSlug);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#8B5CF6");
  const key = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return (
    <form
      className="grid gap-3 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!key || name.trim().length < 2) return;
        create.mutate({ name: name.trim(), key, color }, { onSuccess: onCreated });
      }}
    >
      <div><p className="text-sm font-medium">New time entry type</p><p className="mt-0.5 text-xs text-muted-foreground">Available across this Workspace.</p></div>
      <Input autoFocus maxLength={120} placeholder="Type name" value={name} onChange={(event) => setName(event.target.value)} />
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <Input aria-label="Type color" className="size-8 cursor-pointer p-1" type="color" value={color} onChange={(event) => setColor(event.target.value.toUpperCase())} />
        Type color
      </label>
      {create.error ? <p className="text-xs text-destructive">{create.error.message}</p> : null}
      <div className="flex justify-end gap-2">
        <Button size="sm" type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button disabled={!key || name.trim().length < 2 || create.isPending} size="sm" type="submit">Add type</Button>
      </div>
    </form>
  );
}
