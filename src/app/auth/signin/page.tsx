import { AuthCard } from "@/modules/auth/presentation/auth-card";
import { EmailSignInForm } from "@/modules/auth/presentation/email-sign-in-form";

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
      description="Enter your approved email address. Chrono will send a secure, single-use sign-in link."
      title="Sign in to your workspace"
    >
      <EmailSignInForm callbackUrl={callbackUrl} />
    </AuthCard>
  );
}
