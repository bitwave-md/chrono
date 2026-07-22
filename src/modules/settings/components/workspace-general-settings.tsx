"use client";

import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRemoveWorkspaceIconMutation, useUpdateWorkspaceGeneralMutation, useWorkspaceGeneralQuery, useWorkspaceIconMutation } from "@/modules/settings/application/use-settings-queries";
import { SettingsError, SettingsLoading, SettingsPageFrame, SettingsRow, SettingsSection } from "@/modules/settings/components/settings-primitives";
import { EntityIconPicker } from "@/modules/workspace-ui/components/client-icon-picker";

export function WorkspaceGeneralSettings({ workspaceSlug }: { workspaceSlug: string }) {
  const general = useWorkspaceGeneralQuery(workspaceSlug);
  const update = useUpdateWorkspaceGeneralMutation(workspaceSlug);
  const remove = useRemoveWorkspaceIconMutation(workspaceSlug);
  const picker = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const upload = useWorkspaceIconMutation(workspaceSlug, setProgress);
  if (general.isLoading) return <SettingsPageFrame description="Manage Workspace identity." title="General"><SettingsLoading /></SettingsPageFrame>;
  if (general.error || !general.data) return <SettingsPageFrame description="Manage Workspace identity." title="General"><SettingsError message={general.error?.message ?? "Workspace settings unavailable."} /></SettingsPageFrame>;
  const value = general.data;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const name = new FormData(event.currentTarget).get("name"); if (typeof name !== "string") return;
    update.mutate({ name }, { onSuccess: () => toast.success("Workspace updated"), onError: (error) => toast.error(error.message) });
  };
  const selectFile = (file?: File) => {
    if (!file) return; setProgress(0);
    upload.mutate(file, { onSuccess: () => { setProgress(0); toast.success("Workspace image updated"); }, onError: (error) => { setProgress(0); toast.error(error.message); } });
  };
  return (
    <SettingsPageFrame description="Configure the name and visual identity shown throughout Chrono." title="General">
      <SettingsSection title="Workspace image" description="Use an uploaded image, or keep a customizable icon or emoji.">
        <div className="flex items-center gap-4 p-4">
          {value.imageUrl ? <Avatar className="size-16 rounded-xl"><AvatarImage alt="" src={value.imageUrl} /><AvatarFallback className="rounded-xl">{value.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar> : <EntityIconPicker disabled={!value.canManage} entity={{ name: value.name, iconType: value.iconType, iconKey: value.iconKey, iconColor: value.iconColor }} label="Workspace" onChange={(appearance) => update.mutate(appearance, { onError: (error) => toast.error(error.message) })} />}
          {value.canManage ? <div className="flex flex-wrap gap-2"><Button disabled={upload.isPending} size="sm" variant="outline" onClick={() => picker.current?.click()}>{upload.isPending ? <LoaderCircle className="animate-spin" /> : <ImagePlus />}Upload image</Button>{value.imageUrl ? <Button disabled={remove.isPending} size="sm" variant="ghost" onClick={() => remove.mutate(undefined, { onSuccess: () => toast.success("Workspace image removed"), onError: (error) => toast.error(error.message) })}><Trash2 />Use custom icon</Button> : null}</div> : null}
          <input accept="image/jpeg,image/png,image/webp" className="hidden" ref={picker} type="file" onChange={(event) => { selectFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
        </div>
        {upload.isPending ? <div className="h-1 bg-muted"><div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} /></div> : null}
      </SettingsSection>
      <form onSubmit={submit}><SettingsSection title="Workspace details">
        <SettingsRow label="Name"><Input className="max-w-72" defaultValue={value.name} disabled={!value.canManage} key={value.name} name="name" required /></SettingsRow>
        <SettingsRow label="URL slug" description="Workspace slugs are immutable in this version."><Input className="max-w-72" disabled value={value.slug} /></SettingsRow>
        {value.canManage ? <div className="flex justify-end p-3"><Button disabled={update.isPending} size="sm" type="submit">Save changes</Button></div> : null}
      </SettingsSection></form>
    </SettingsPageFrame>
  );
}
