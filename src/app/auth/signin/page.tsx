import { AuthCard } from "@/modules/auth/presentation/auth-card";
import { BootstrapSignInForm } from "@/modules/auth/presentation/bootstrap-sign-in-form";
import { EmailSignInForm } from "@/modules/auth/presentation/email-sign-in-form";
import { authCapabilities } from "@/modules/auth/infrastructure/auth-options";

interface SignInPageProps {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const requestedCallback = Array.isArray(params.callbackUrl)
    ? params.callbackUrl[0]
    : params.callbackUrl;
  const callbackUrl = requestedCallback?.startsWith("/") ? requestedCallback : "/app";

  return (
    <AuthCard
      description={authCapabilities.email
        ? "Sign in with the owner setup key or request a secure email link."
        : "Sign in with the owner credentials generated during installation."}
      title="Sign in to your workspace"
    >
      <div className="grid gap-5">
        {authCapabilities.bootstrap ? <BootstrapSignInForm callbackUrl={callbackUrl} /> : null}
        {authCapabilities.bootstrap && authCapabilities.email ? (
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /><span>or use email</span><span className="h-px flex-1 bg-border" /></div>
        ) : null}
        {authCapabilities.email ? <EmailSignInForm autoFocus={!authCapabilities.bootstrap} callbackUrl={callbackUrl} /> : null}
      </div>
    </AuthCard>
  );
}
