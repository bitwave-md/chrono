ALTER TABLE "issues" DROP CONSTRAINT "issues_project_status_check";--> statement-breakpoint
ALTER TABLE "workflows" DROP CONSTRAINT "workflows_project_tenant_fk";--> statement-breakpoint
DROP INDEX "workflows_project_unique";--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "client_id" uuid;--> statement-breakpoint
UPDATE "workflows" workflow
SET "client_id" = project."client_id"
FROM "projects" project
WHERE project."id" = workflow."project_id"
	AND project."workspace_id" = workflow."workspace_id";--> statement-breakpoint
ALTER TABLE "workflows" ALTER COLUMN "project_id" DROP NOT NULL;--> statement-breakpoint
INSERT INTO "workflows" (
	"workspace_id",
	"client_id",
	"project_id",
	"name"
)
SELECT
	client."workspace_id",
	client."id",
	NULL,
	'Default workflow'
FROM "clients" client
WHERE client."archived_at" IS NULL
	AND NOT EXISTS (
		SELECT 1
		FROM "workflows" workflow
		WHERE workflow."workspace_id" = client."workspace_id"
			AND workflow."client_id" = client."id"
			AND workflow."project_id" IS NULL
	);--> statement-breakpoint
INSERT INTO "workflow_statuses" (
	"workspace_id",
	"workflow_id",
	"name",
	"slug",
	"category",
	"color",
	"position",
	"is_default"
)
SELECT
	workflow."workspace_id",
	workflow."id",
	template."name",
	template."slug",
	template."category"::"workflow_status_category",
	template."color",
	template."position",
	template."is_default"
FROM "workflows" workflow
CROSS JOIN (VALUES
	('Backlog', 'backlog', 'backlog', '#71717a', 0, true),
	('Todo', 'todo', 'unstarted', '#a1a1aa', 1, false),
	('In Progress', 'in-progress', 'started', '#60a5fa', 2, false),
	('Done', 'done', 'completed', '#4ade80', 3, false),
	('Canceled', 'canceled', 'canceled', '#f87171', 4, false)
) AS template("name", "slug", "category", "color", "position", "is_default")
WHERE workflow."project_id" IS NULL
	AND NOT EXISTS (
		SELECT 1
		FROM "workflow_statuses" status
		WHERE status."workflow_id" = workflow."id"
	);--> statement-breakpoint
UPDATE "issues" issue
SET "status_id" = status."id"
FROM "workflows" workflow
INNER JOIN "workflow_statuses" status
	ON status."workflow_id" = workflow."id"
	AND status."is_default" = true
	AND status."archived_at" IS NULL
WHERE issue."workspace_id" = workflow."workspace_id"
	AND issue."client_id" = workflow."client_id"
	AND issue."project_id" IS NULL
	AND issue."status_id" IS NULL
	AND workflow."project_id" IS NULL;--> statement-breakpoint
ALTER TABLE "issues" ALTER COLUMN "status_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "workflows" ALTER COLUMN "client_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_client_tenant_fk" FOREIGN KEY ("workspace_id","client_id") REFERENCES "public"."clients"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_project_tenant_client_fk" FOREIGN KEY ("workspace_id","client_id","project_id") REFERENCES "public"."projects"("workspace_id","client_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workflows_client_default_unique" ON "workflows" USING btree ("client_id") WHERE "workflows"."project_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "workflows_project_unique" ON "workflows" USING btree ("project_id") WHERE "workflows"."project_id" is not null;
