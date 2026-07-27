import { ProjectRouteView } from "@/modules/workspace-ui/components/project-route-view";

export default async function ProjectTimePage({ params }: { params: Promise<{ workspaceSlug: string; projectId: string }> }) {
  const values = await params;
  return <ProjectRouteView projectId={values.projectId} tab="time" workspaceSlug={values.workspaceSlug} />;
}
