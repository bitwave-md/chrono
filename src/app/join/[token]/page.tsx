import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { InvitationRegistrationService } from "@/modules/auth/application/invitation-registration-service";
import { authOptions } from "@/modules/auth/infrastructure/auth-options";
import { AuthCard } from "@/modules/auth/presentation/auth-card";
import { InvitationJoinForm } from "@/modules/auth/presentation/invitation-join-form";

interface Props { params: Promise<{ token: string }> }
export default async function JoinPage({ params }: Props) {
  const { token } = await params;
  const invitation = await new InvitationRegistrationService().inspect(token).catch(() => null);
  if (!invitation) notFound();
  const session = await getServerSession(authOptions);
  return <AuthCard title={`Join ${invitation.workspaceName}`} description={`You were invited as ${invitation.role}. Invitation links are one-time bearer credentials.`}><InvitationJoinForm invitation={invitation} sessionEmail={session?.user?.email ?? null} token={token} /></AuthCard>;
}
