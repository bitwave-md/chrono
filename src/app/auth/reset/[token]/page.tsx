import { notFound } from "next/navigation";
import { PasswordRecoveryService } from "@/modules/auth/application/password-recovery-service";
import { AuthCard } from "@/modules/auth/presentation/auth-card";
import { PasswordResetForm } from "@/modules/auth/presentation/password-reset-form";

interface Props { params: Promise<{ token: string }> }
export default async function ResetPage({ params }: Props) { const { token } = await params; const reset = await new PasswordRecoveryService().inspect(token).catch(() => null); if (!reset) notFound(); return <AuthCard title="Choose a new password" description={`Reset the password for ${reset.email}. This link can be used once.`}><PasswordResetForm token={token} /></AuthCard>; }
