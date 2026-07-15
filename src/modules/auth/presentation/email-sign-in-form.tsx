"use client";

import { LoaderCircle, Mail } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEmailSignInMutation } from "@/modules/auth/presentation/use-auth-mutations";

export function EmailSignInForm({ callbackUrl }: { callbackUrl: string }) {
  const [email, setEmail] = useState("");
  const mutation = useEmailSignInMutation(callbackUrl);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (normalized) mutation.mutate(normalized);
  };

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <label className="grid gap-2 text-sm font-medium" htmlFor="chrono-sign-in-email">
        Work email
        <Input
          autoComplete="email"
          autoFocus
          id="chrono-sign-in-email"
          name="email"
          placeholder="you@company.com"
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      {mutation.error ? (
        <Alert variant="destructive">
          <AlertDescription>{mutation.error.message}</AlertDescription>
        </Alert>
      ) : null}
      <Button className="w-full" disabled={mutation.isPending || !email.trim()} type="submit">
        {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <Mail />}
        Email me a sign-in link
      </Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">
        Passwordless links expire after 15 minutes and can only be requested by
        approved workspace members.
      </p>
    </form>
  );
}
