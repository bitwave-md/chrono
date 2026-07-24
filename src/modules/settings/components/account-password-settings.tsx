"use client";

import { LoaderCircle } from "lucide-react";
import { type FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordPolicy } from "@/modules/auth/domain/password-policy";
import { PasswordRequirements } from "@/modules/auth/presentation/password-reset-form";
import { useChangePasswordMutation } from "@/modules/settings/application/use-settings-queries";
import { SettingsSection } from "./settings-primitives";

export function AccountPasswordSettings({ workspaceSlug }: { workspaceSlug: string }) {
  const mutation = useChangePasswordMutation(workspaceSlug); const [current, setCurrent] = useState(""); const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState(""); const requirements = PasswordPolicy.requirements(password);
  function submit(event: FormEvent) { event.preventDefault(); if (password !== confirmation) { toast.error("Passwords do not match"); return; } if (requirements.some((item) => !item.valid)) { toast.error("Choose a stronger password"); return; } mutation.mutate({ currentPassword: current, password }, { onSuccess: () => { setCurrent(""); setPassword(""); setConfirmation(""); toast.success("Password changed. Other sessions were signed out."); }, onError: (error) => toast.error(error.message) }); }
  return <form onSubmit={submit}><SettingsSection title="Password" description="Changing your password invalidates your other signed-in sessions."><div className="grid gap-3 p-4"><Input autoComplete="current-password" placeholder="Current password" required type="password" value={current} onChange={(event) => setCurrent(event.target.value)} /><Input autoComplete="new-password" placeholder="New password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /><Input autoComplete="new-password" placeholder="Confirm new password" required type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /><PasswordRequirements items={requirements} /><div><Button disabled={mutation.isPending} size="sm" type="submit">{mutation.isPending ? <LoaderCircle className="animate-spin" /> : null}Change password</Button></div></div></SettingsSection></form>;
}
