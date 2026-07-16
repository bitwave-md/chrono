import { redirect } from "next/navigation";

export default async function ProjectPage({ params }: { params: Promise<{ workspaceSlug: string; projectId: string }> }) {
  const values = await params;
  redirect(`/app/${values.workspaceSlug}/projects/${values.projectId}/overview`);
}
