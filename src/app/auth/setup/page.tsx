import { SetupRegistrationForm } from "@/modules/auth/presentation/setup-registration-form";
import { SetupRegistrationService } from "@/modules/auth/application/setup-registration-service";
import { redirect } from "next/navigation";
import { AuthCard } from "@/modules/auth/presentation/auth-card";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (!(await new SetupRegistrationService().status()).available) redirect("/auth/signin");
  return <AuthCard description="Claim the first Workspace owner account on this Chrono installation." title="Set up Chrono"><SetupRegistrationForm /></AuthCard>;
}
