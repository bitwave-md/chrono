CREATE TYPE "public"."project_branch_kind" AS ENUM('feature', 'sprint', 'refactor', 'release', 'other');--> statement-breakpoint
CREATE TYPE "public"."project_branch_state" AS ENUM('planned', 'active', 'completed', 'canceled');--> statement-breakpoint
CREATE TABLE "project_branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"kind" "project_branch_kind" DEFAULT 'feature' NOT NULL,
	"state" "project_branch_state" DEFAULT 'planned' NOT NULL,
	"summary" text,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"start_date" timestamp with time zone,
	"target_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TEMP TABLE "nested_project_ids" AS
SELECT "id" FROM "projects" WHERE "parent_id" IS NOT NULL;--> statement-breakpoint
DELETE FROM "time_logs"
WHERE "project_id" IN (SELECT "id" FROM "nested_project_ids");--> statement-breakpoint
DELETE FROM "timer_sessions"
WHERE "project_id" IN (SELECT "id" FROM "nested_project_ids");--> statement-breakpoint
UPDATE "issues"
SET "parent_issue_id" = NULL
WHERE "parent_issue_id" IN (
	SELECT issue."id"
	FROM "issues" issue
	WHERE issue."project_id" IN (SELECT "id" FROM "nested_project_ids")
);--> statement-breakpoint
DELETE FROM "issues"
WHERE "project_id" IN (SELECT "id" FROM "nested_project_ids");--> statement-breakpoint
DELETE FROM "projects"
WHERE "id" IN (SELECT "id" FROM "nested_project_ids");--> statement-breakpoint
DROP TABLE "nested_project_ids";--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_root_kind_check";--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_root_workflow_check";--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_parent_tenant_client_fk";
--> statement-breakpoint
ALTER TABLE "time_logs" DROP CONSTRAINT "time_logs_root_project_tenant_client_fk";
--> statement-breakpoint
ALTER TABLE "timer_sessions" DROP CONSTRAINT "timer_sessions_root_project_tenant_client_fk";
--> statement-breakpoint
DROP INDEX "projects_parent_position_idx";--> statement-breakpoint
DROP INDEX "time_logs_root_project_started_idx";--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "time_logs" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "timer_sessions" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "project_branches" ADD CONSTRAINT "project_branches_project_tenant_client_fk" FOREIGN KEY ("workspace_id","client_id","project_id") REFERENCES "public"."projects"("workspace_id","client_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_branches_workspace_id_unique" ON "project_branches" USING btree ("workspace_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_branches_tenant_project_id_unique" ON "project_branches" USING btree ("workspace_id","client_id","project_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_branches_project_slug_unique" ON "project_branches" USING btree ("project_id","slug");--> statement-breakpoint
CREATE INDEX "project_branches_project_position_idx" ON "project_branches" USING btree ("project_id","position");--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_branch_tenant_project_fk" FOREIGN KEY ("workspace_id","client_id","project_id","branch_id") REFERENCES "public"."project_branches"("workspace_id","client_id","project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_branch_tenant_project_fk" FOREIGN KEY ("workspace_id","client_id","project_id","branch_id") REFERENCES "public"."project_branches"("workspace_id","client_id","project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timer_sessions" ADD CONSTRAINT "timer_sessions_branch_tenant_project_fk" FOREIGN KEY ("workspace_id","client_id","project_id","branch_id") REFERENCES "public"."project_branches"("workspace_id","client_id","project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issues_branch_rank_idx" ON "issues" USING btree ("branch_id","rank");--> statement-breakpoint
CREATE INDEX "projects_client_position_idx" ON "projects" USING btree ("client_id","position");--> statement-breakpoint
CREATE INDEX "time_logs_branch_started_idx" ON "time_logs" USING btree ("branch_id","started_at");--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "parent_id";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "kind";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "workflow_mode";--> statement-breakpoint
ALTER TABLE "time_logs" DROP COLUMN "root_project_id";--> statement-breakpoint
ALTER TABLE "timer_sessions" DROP COLUMN "root_project_id";--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_branch_project_check" CHECK ("issues"."branch_id" is null or "issues"."project_id" is not null);--> statement-breakpoint
DROP TYPE "public"."project_kind";--> statement-breakpoint
DROP TYPE "public"."project_workflow_mode";
