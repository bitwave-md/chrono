import { SettingsPage } from "@/modules/settings/components/settings-page";

export default async function WorkspaceSettingsPage({ params }: { params: Promise<{ workspaceSlug: string; settingsPath: string[] }> }) {
  const { workspaceSlug, settingsPath } = await params;
  return <SettingsPage path={settingsPath.join("/")} workspaceSlug={workspaceSlug} />;
}
