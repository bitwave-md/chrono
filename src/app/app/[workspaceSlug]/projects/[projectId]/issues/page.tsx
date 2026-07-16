import { ProjectRouteView } from "@/modules/workspace-ui/components/project-route-view";

export default async function ProjectIssuesPage({ params }: { params: Promise<{ workspaceSlug: string; projectId: string }> }) {
  const values = await params;
  return <ProjectRouteView projectId={values.projectId} tab="issues" workspaceSlug={values.workspaceSlug} />;
}
