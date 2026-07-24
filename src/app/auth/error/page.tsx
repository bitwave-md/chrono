import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/modules/auth/presentation/auth-card";

const errorMessages: Record<string, string> = {
  AccessDenied: "This email is not approved for an active Chrono workspace.",
  Configuration: "Chrono authentication is not configured correctly on this host.",
};

interface AuthErrorPageProps {
  searchParams: Promise<{ error?: string | string[] }>;
}

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const message = (error && errorMessages[error]) ?? "Chrono could not complete authentication. Check your credentials and try again.";

  return (
    <AuthCard description="The authentication request could not be completed." title="Sign-in problem">
      <div className="grid gap-4">
        <Alert variant="destructive"><AlertDescription>{message}</AlertDescription></Alert>
        <Button asChild className="w-full"><Link href="/auth/signin">Try again</Link></Button>
      </div>
    </AuthCard>
  );
}
