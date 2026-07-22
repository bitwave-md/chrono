import { redirect } from "next/navigation";

export default async function SettingsIndexPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  redirect(`/app/${workspaceSlug}/settings/personal/profile`);
}
