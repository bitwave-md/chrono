"use client";

import { Check, Eye, EyeOff, LoaderCircle, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordPolicy } from "@/modules/auth/domain/password-policy";
import { signIn } from "next-auth/react";

export function SetupRegistrationForm() {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState(""); const [setupToken, setSetupToken] = useState(""); const [visible, setVisible] = useState(false); const [error, setError] = useState<string | null>(null); const [pending, setPending] = useState(false);
  const requirements = PasswordPolicy.requirements(password);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (password !== confirmation) { setError("Passwords do not match."); return; }
    if (requirements.some((item) => !item.valid)) { setError("Choose a stronger password."); return; }
    setPending(true);
    try {
      const response = await fetch("/api/auth/setup/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, email, password, setupToken }) });
      const body = await response.json() as { data?: { email: string }; error?: { message: string } };
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Setup could not be completed.");
      const result = await signIn("credentials", { email: body.data.email, password, callbackUrl: "/app", redirect: false });
      if (!result?.url) throw new Error("Account created, but sign in could not be completed.");
      window.location.assign(result.url);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Setup could not be completed."); setPending(false); }
  }
  return <form className="grid gap-4" onSubmit={submit}>
    <label className="grid gap-2 text-sm font-medium">Full name<Input autoFocus required value={name} onChange={(event) => setName(event.target.value)} /></label>
    <label className="grid gap-2 text-sm font-medium">Email<Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
    <label className="grid gap-2 text-sm font-medium">Installer setup code<Input required type="password" value={setupToken} onChange={(event) => setSetupToken(event.target.value)} /></label>
    <label className="grid gap-2 text-sm font-medium">Password<div className="relative"><Input required type={visible ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} /><button aria-label="Toggle password visibility" className="absolute inset-y-0 right-2" type="button" onClick={() => setVisible((value) => !value)}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></label>
    <label className="grid gap-2 text-sm font-medium">Confirm password<Input required type={visible ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
    <ul className="grid gap-1 text-xs text-muted-foreground">{requirements.map((item) => <li className="flex items-center gap-2" key={item.label}>{item.valid ? <Check className="size-3 text-emerald-500" /> : <X className="size-3" />}{item.label}</li>)}</ul>
    {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
    <Button disabled={pending || !name || !email || !setupToken} type="submit">{pending ? <LoaderCircle className="animate-spin" /> : null}Create owner account</Button>
  </form>;
}
