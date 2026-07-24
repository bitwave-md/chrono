"use client";

import { LoaderCircle } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordPolicy } from "@/modules/auth/domain/password-policy";
import { PasswordRequirements } from "./password-reset-form";

export function EmergencyRecoveryForm() {
  const [email, setEmail] = useState(""); const [setupToken, setSetupToken] = useState(""); const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState(""); const [pending, setPending] = useState(false); const [message, setMessage] = useState<string | null>(null); const requirements = PasswordPolicy.requirements(password);
  async function submit(event: FormEvent) { event.preventDefault(); if (password !== confirmation || requirements.some((item) => !item.valid)) { setMessage("Check the password requirements and confirmation."); return; } setPending(true); try { const response = await fetch("/api/auth/emergency-recovery", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, setupToken, password }) }); const body = await response.json() as { error?: { message: string } }; if (!response.ok) throw new Error(body.error?.message ?? "Recovery failed."); window.location.assign("/auth/signin"); } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Recovery failed."); setPending(false); } }
  return <form className="grid gap-4" onSubmit={submit}><label className="grid gap-2 text-sm font-medium">Owner email<Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="grid gap-2 text-sm font-medium">Installer setup code<Input required type="password" value={setupToken} onChange={(event) => setSetupToken(event.target.value)} /></label><label className="grid gap-2 text-sm font-medium">New password<Input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><label className="grid gap-2 text-sm font-medium">Confirm password<Input required type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><PasswordRequirements items={requirements} />{message ? <Alert variant="destructive"><AlertDescription>{message}</AlertDescription></Alert> : null}<Button disabled={pending} type="submit">{pending ? <LoaderCircle className="animate-spin" /> : null}Reset owner password</Button></form>;
}
