"use client";

import { Camera, LoaderCircle, Trash2 } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import toast from "react-hot-toast";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAvatarMutation, useProfileQuery, useRemoveAvatarMutation, useUpdateProfileMutation } from "@/modules/settings/application/use-settings-queries";
import { SettingsError, SettingsLoading, SettingsPageFrame, SettingsRow, SettingsSection } from "@/modules/settings/components/settings-primitives";

export function AccountProfileSettings({ workspaceSlug }: { workspaceSlug: string }) {
  const profile = useProfileQuery(workspaceSlug);
  const update = useUpdateProfileMutation(workspaceSlug);
  const remove = useRemoveAvatarMutation(workspaceSlug);
  const picker = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const upload = useAvatarMutation(workspaceSlug, setProgress);

  if (profile.isLoading) return <SettingsPageFrame description="Manage your identity across Chrono." title="Profile"><SettingsLoading /></SettingsPageFrame>;
  if (profile.error || !profile.data) return <SettingsPageFrame description="Manage your identity across Chrono." title="Profile"><SettingsError message={profile.error?.message ?? "Profile unavailable."} /></SettingsPageFrame>;
  const value = profile.data;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = new FormData(event.currentTarget).get("name");
    if (typeof name !== "string") return;
    update.mutate(name, { onSuccess: () => toast.success("Profile updated"), onError: (error) => toast.error(error.message) });
  };
  const selectFile = (file?: File) => {
    if (!file) return;
    setProgress(0);
    upload.mutate(file, { onSuccess: () => { setProgress(0); toast.success("Profile photo updated"); }, onError: (error) => { setProgress(0); toast.error(error.message); } });
  };

  return (
    <SettingsPageFrame description="Manage your personal identity and profile photo across every Workspace." title="Profile">
      <SettingsSection title="Profile photo" description="PNG, JPEG, or WebP. Images are cropped and safely re-encoded.">
        <div className="flex items-center gap-4 p-4">
          <Avatar className="size-16"><AvatarImage alt="" src={value.image ?? undefined} /><AvatarFallback>{initials(value.name ?? value.email)}</AvatarFallback></Avatar>
          <div className="flex flex-wrap gap-2"><Button disabled={upload.isPending} size="sm" variant="outline" onClick={() => picker.current?.click()}>{upload.isPending ? <LoaderCircle className="animate-spin" /> : <Camera />}Upload photo</Button>{value.image ? <Button disabled={remove.isPending} size="sm" variant="ghost" onClick={() => remove.mutate(undefined, { onSuccess: () => toast.success("Profile photo removed"), onError: (error) => toast.error(error.message) })}><Trash2 />Remove</Button> : null}</div>
          <input accept="image/jpeg,image/png,image/webp" className="hidden" ref={picker} type="file" onChange={(event) => { selectFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
        </div>
        {upload.isPending ? <div className="h-1 bg-muted"><div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} /></div> : null}
      </SettingsSection>
      <form onSubmit={submit}>
        <SettingsSection title="Personal details">
          <SettingsRow label="Full name" description="Shown to teammates in assignments and activity."><Input className="max-w-72" defaultValue={value.name ?? ""} key={value.name} name="name" required /></SettingsRow>
          <SettingsRow label="Email" description="Your authentication email cannot be changed here."><Input className="max-w-72" disabled value={value.email} /></SettingsRow>
          <div className="flex justify-end p-3"><Button disabled={update.isPending} size="sm" type="submit">{update.isPending ? <LoaderCircle className="animate-spin" /> : null}Save changes</Button></div>
        </SettingsSection>
      </form>
    </SettingsPageFrame>
  );
}

function initials(value: string) { return value.split(/\s+|@/).filter(Boolean).slice(0, 2).map((item) => item[0]?.toUpperCase()).join(""); }
