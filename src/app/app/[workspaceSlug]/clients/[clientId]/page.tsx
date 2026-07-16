import { redirect } from "next/navigation";

export default async function ClientPage({ params }: { params: Promise<{ workspaceSlug: string; clientId: string }> }) {
  const values = await params;
  redirect(`/app/${values.workspaceSlug}/clients/${values.clientId}/home`);
}
