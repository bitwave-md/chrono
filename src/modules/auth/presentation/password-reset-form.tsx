"use client";

import { Check, LoaderCircle, X } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordPolicy } from "@/modules/auth/domain/password-policy";

export function PasswordResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState(""); const [error, setError] = useState<string | null>(null); const [pending, setPending] = useState(false); const [done, setDone] = useState(false); const requirements = PasswordPolicy.requirements(password);
  async function submit(event: FormEvent) { event.preventDefault(); setError(null); if (password !== confirmation) { setError("Passwords do not match."); return; } if (requirements.some((item) => !item.valid)) { setError("Choose a stronger password."); return; } setPending(true); try { const response = await fetch(`/api/auth/password-resets/${token}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) }); const body = await response.json() as { error?: { message: string } }; if (!response.ok) throw new Error(body.error?.message ?? "Password could not be reset."); setDone(true); } catch (reason) { setError(reason instanceof Error ? reason.message : "Password could not be reset."); } finally { setPending(false); } }
  if (done) return <div className="grid gap-4 text-sm"><p>Your password was changed and previous sessions are no longer valid.</p><Button asChild><Link href="/auth/signin">Sign in</Link></Button></div>;
  return <form className="grid gap-4" onSubmit={submit}><label className="grid gap-2 text-sm font-medium">New password<Input autoFocus required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><label className="grid gap-2 text-sm font-medium">Confirm password<Input required type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><PasswordRequirements items={requirements} />{error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}<Button disabled={pending} type="submit">{pending ? <LoaderCircle className="animate-spin" /> : null}Reset password</Button></form>;
}

export function PasswordRequirements({ items }: { items: ReturnType<typeof PasswordPolicy.requirements> }) { return <ul className="grid gap-1 text-xs text-muted-foreground">{items.map((item) => <li className="flex items-center gap-2" key={item.label}>{item.valid ? <Check className="size-3 text-emerald-500" /> : <X className="size-3" />}{item.label}</li>)}</ul>; }
