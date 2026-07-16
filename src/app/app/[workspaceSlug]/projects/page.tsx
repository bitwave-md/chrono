import { ProjectDirectoryView } from "@/modules/workspace-ui/components/directory-views";

export default async function ProjectsPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  return <ProjectDirectoryView workspaceSlug={workspaceSlug} />;
}
