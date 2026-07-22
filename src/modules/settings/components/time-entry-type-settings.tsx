"use client";

import { ArrowDown, ArrowUp, Archive, LoaderCircle, Plus } from "lucide-react";
import { type FormEvent } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateSettingsCategoryMutation, useSettingsCategoriesQuery, useUpdateSettingsCategoryMutation } from "@/modules/settings/application/use-settings-queries";
import { SettingsError, SettingsLoading, SettingsPageFrame, SettingsSection, SettingsToggle } from "@/modules/settings/components/settings-primitives";

export function TimeEntryTypeSettings({ workspaceSlug }: { workspaceSlug: string }) {
  const query = useSettingsCategoriesQuery(workspaceSlug);
  const create = useCreateSettingsCategoryMutation(workspaceSlug);
  const update = useUpdateSettingsCategoryMutation(workspaceSlug);
  if (query.isLoading) return <SettingsPageFrame description="Customize Workspace-wide time classifications." title="Time entry types"><SettingsLoading /></SettingsPageFrame>;
  if (query.error) return <SettingsPageFrame description="Customize Workspace-wide time classifications." title="Time entry types"><SettingsError message={query.error.message} /></SettingsPageFrame>;
  const categories = query.data ?? [];
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const name = String(data.get("name") ?? "").trim(); const color = String(data.get("color") ?? "#71717A");
    create.mutate({ name, key: slug(name), color, defaultBillable: false }, { onSuccess: () => { form.reset(); toast.success("Time entry type created"); }, onError: (error) => toast.error(error.message) });
  };
  const save = (id: string, values: Parameters<typeof update.mutate>[0]["values"], message = "Time entry type updated") => update.mutate({ id, values }, { onSuccess: () => toast.success(message), onError: (error) => toast.error(error.message) });
  return (
    <SettingsPageFrame description="Create, recolor, reorder, bill, or archive the types available in every time entry." title="Time entry types">
      <SettingsSection title="Active types" description="Order is shared across timers, manual logs, and reports.">
        {categories.map((category, index) => <div className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto]" key={category.id}>
          <input aria-label={`${category.name} color`} className="size-7 cursor-pointer rounded border-0 bg-transparent" defaultValue={category.color ?? "#71717A"} type="color" onBlur={(event) => save(category.id, { color: event.currentTarget.value })} />
          <Input className="h-8 border-transparent bg-transparent px-1 shadow-none hover:border-input focus-visible:border-input" defaultValue={category.name} onBlur={(event) => { const name = event.currentTarget.value.trim(); if (name && name !== category.name) save(category.id, { name }); }} />
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="hidden sm:inline">Billable</span><SettingsToggle checked={category.defaultBillable} label={`${category.name} billable by default`} onChange={(value) => save(category.id, { defaultBillable: value })} /></div>
          <div className="hidden gap-1 sm:flex"><Button aria-label="Move up" disabled={index === 0 || update.isPending} size="icon-xs" variant="ghost" onClick={() => save(category.id, { position: Math.max(0, (categories[index - 1]?.position ?? 0) - 1) })}><ArrowUp /></Button><Button aria-label="Move down" disabled={index === categories.length - 1 || update.isPending} size="icon-xs" variant="ghost" onClick={() => save(category.id, { position: (categories[index + 1]?.position ?? category.position) + 1 })}><ArrowDown /></Button></div>
          <Button aria-label={`Archive ${category.name}`} disabled={update.isPending} size="icon-sm" variant="ghost" onClick={() => save(category.id, { archived: true }, "Time entry type archived")}><Archive /></Button>
        </div>)}
        {!categories.length ? <p className="p-8 text-center text-sm text-muted-foreground">No active time entry types.</p> : null}
      </SettingsSection>
      <SettingsSection title="Add a type">
        <form className="grid gap-2 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]" onSubmit={submit}><input aria-label="Color" className="h-9 w-10 cursor-pointer rounded bg-transparent" defaultValue="#71717A" name="color" type="color" /><Input name="name" placeholder="e.g. Research" required /><Button disabled={create.isPending} size="sm" type="submit">{create.isPending ? <LoaderCircle className="animate-spin" /> : <Plus />}Add type</Button></form>
      </SettingsSection>
    </SettingsPageFrame>
  );
}

function slug(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 63) || "time-entry"; }
