import { ProjectRouteView } from "@/modules/workspace-ui/components/project-route-view";

export default async function ProjectOverviewPage({ params }: { params: Promise<{ workspaceSlug: string; projectId: string }> }) {
  const values = await params;
  return <ProjectRouteView projectId={values.projectId} tab="overview" workspaceSlug={values.workspaceSlug} />;
}
