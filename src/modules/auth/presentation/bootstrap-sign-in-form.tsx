"use client";

import { KeyRound, LoaderCircle } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBootstrapSignInMutation } from "@/modules/auth/presentation/use-auth-mutations";

export function BootstrapSignInForm({ callbackUrl }: { callbackUrl: string }) {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const mutation = useBootstrapSignInMutation(callbackUrl);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (email.trim() && token) {
      mutation.mutate({ email: email.trim().toLowerCase(), token });
    }
  };

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <label className="grid gap-2 text-sm font-medium">
        Owner email
        <Input autoComplete="username" autoFocus name="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Setup key
        <Input autoComplete="current-password" name="token" required type="password" value={token} onChange={(event) => setToken(event.target.value)} />
      </label>
      {mutation.error ? <Alert variant="destructive"><AlertDescription>{mutation.error.message}</AlertDescription></Alert> : null}
      <Button className="w-full" disabled={mutation.isPending || !email.trim() || !token} type="submit">
        {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <KeyRound />}
        Sign in as owner
      </Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">Use the setup key generated during installation.</p>
    </form>
  );
}
