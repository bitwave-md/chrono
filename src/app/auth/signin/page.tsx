import { AuthCard } from "@/modules/auth/presentation/auth-card";
import { EmailSignInForm } from "@/modules/auth/presentation/email-sign-in-form";
import { SetupRegistrationService } from "@/modules/auth/application/setup-registration-service";
import { redirect } from "next/navigation";

interface SignInPageProps {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}

export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: SignInPageProps) {
  if ((await new SetupRegistrationService().status()).available) redirect("/auth/setup");
  const params = await searchParams;
  const requestedCallback = Array.isArray(params.callbackUrl)
    ? params.callbackUrl[0]
    : params.callbackUrl;
  const callbackUrl = requestedCallback?.startsWith("/") ? requestedCallback : "/app";

  return (
    <AuthCard
      description="Sign in with your Chrono email and password."
      title="Sign in to your workspace"
    >
      <EmailSignInForm autoFocus callbackUrl={callbackUrl} />
    </AuthCard>
  );
}
