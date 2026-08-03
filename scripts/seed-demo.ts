import { closeDemoSeederDatabase, DemoWorkspaceSeeder } from "@/db/demo-seeder";

const workspaceSlug = process.argv[2] ?? process.env.AUTH_SETUP_WORKSPACE_SLUG ?? "bitwave";

try {
  const summary = await new DemoWorkspaceSeeder().seed(workspaceSlug);
  console.log(
    `Demo seed complete for ${workspaceSlug}: ${summary.clients} clients, ${summary.projects} projects, ${summary.branches} branches, ${summary.issues} issues, and ${summary.timeLogs} current-month time logs created.`,
  );
} finally {
  await closeDemoSeederDatabase();
}
