"use client";

import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEmailSignInMutation } from "@/modules/auth/presentation/use-auth-mutations";

export function EmailSignInForm({ callbackUrl, autoFocus = true }: { callbackUrl: string; autoFocus?: boolean }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [visible, setVisible] = useState(false);
  const mutation = useEmailSignInMutation(callbackUrl);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (normalized && password) mutation.mutate({ email: normalized, password });
  };

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <label className="grid gap-2 text-sm font-medium" htmlFor="chrono-sign-in-email">
        Work email
        <Input
          autoComplete="email"
          autoFocus={autoFocus}
          id="chrono-sign-in-email"
          name="email"
          placeholder="you@company.com"
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label className="grid gap-2 text-sm font-medium" htmlFor="chrono-sign-in-password">Password<div className="relative"><Input autoComplete="current-password" id="chrono-sign-in-password" name="password" required type={visible ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} /><button aria-label={visible ? "Hide password" : "Show password"} className="absolute inset-y-0 right-2 text-muted-foreground" type="button" onClick={() => setVisible((value) => !value)}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></label>
      {mutation.error ? (
        <Alert variant="destructive">
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      ) : null}
      <Button className="w-full" disabled={mutation.isPending || !email.trim() || !password} type="submit">
        {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <LogIn />}
        Sign in
      </Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">
        Use the email and password stored for your Chrono account.
      </p>
    </form>
  );
}
