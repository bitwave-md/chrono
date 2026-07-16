CREATE TYPE "public"."milestone_state" AS ENUM('planned', 'active', 'completed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."project_health" AS ENUM('on_track', 'at_risk', 'off_track');--> statement-breakpoint
CREATE TYPE "public"."project_state" AS ENUM('planned', 'active', 'paused', 'completed', 'canceled');--> statement-breakpoint
CREATE TABLE "issue_assignees" (
	"workspace_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"created_by_membership_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"author_membership_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "issue_labels" (
	"workspace_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"label_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"icon" text DEFAULT 'circle-dot' NOT NULL,
	"color" text DEFAULT '#6b7280' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6b7280' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "project_activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"actor_membership_id" uuid,
	"event_type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_assignees" (
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"created_by_membership_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"state" "milestone_state" DEFAULT 'planned' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"target_date" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_by_membership_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"author_membership_id" uuid NOT NULL,
	"body" text NOT NULL,
	"health" "project_health",
	"progress" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_updates_progress_check" CHECK ("project_updates"."progress" is null or ("project_updates"."progress" >= 0 and "project_updates"."progress" <= 100))
);
--> statement-breakpoint
ALTER TABLE "issues" DROP CONSTRAINT "issues_team_tenant_fk";
--> statement-breakpoint
ALTER TABLE "issues" DROP CONSTRAINT "issues_assignee_membership_tenant_fk";
--> statement-breakpoint
ALTER TABLE "time_logs" DROP CONSTRAINT "time_logs_team_tenant_fk";
--> statement-breakpoint
ALTER TABLE "timer_sessions" DROP CONSTRAINT "timer_sessions_team_tenant_fk";
--> statement-breakpoint
ALTER TABLE "team_memberships" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "teams" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "team_memberships";--> statement-breakpoint
DROP TABLE "teams";--> statement-breakpoint
DROP INDEX "issues_team_rank_idx";--> statement-breakpoint
DROP INDEX "issues_assignee_idx";--> statement-breakpoint
DROP INDEX "time_logs_team_started_idx";--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "issue_type_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "state" "project_state" DEFAULT 'planned' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "summary" text;--> statement-breakpoint
CREATE UNIQUE INDEX "issues_workspace_id_unique" ON "issues" USING btree ("workspace_id","id");--> statement-breakpoint
ALTER TABLE "issue_assignees" ADD CONSTRAINT "issue_assignees_issue_tenant_fk" FOREIGN KEY ("workspace_id","issue_id") REFERENCES "public"."issues"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_assignees" ADD CONSTRAINT "issue_assignees_membership_tenant_fk" FOREIGN KEY ("workspace_id","membership_id") REFERENCES "public"."workspace_memberships"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_assignees" ADD CONSTRAINT "issue_assignees_creator_tenant_fk" FOREIGN KEY ("workspace_id","created_by_membership_id") REFERENCES "public"."workspace_memberships"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_issue_tenant_fk" FOREIGN KEY ("workspace_id","issue_id") REFERENCES "public"."issues"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_author_tenant_fk" FOREIGN KEY ("workspace_id","author_membership_id") REFERENCES "public"."workspace_memberships"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_labels" ADD CONSTRAINT "issue_labels_issue_tenant_fk" FOREIGN KEY ("workspace_id","issue_id") REFERENCES "public"."issues"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_labels" ADD CONSTRAINT "issue_labels_label_tenant_fk" FOREIGN KEY ("workspace_id","label_id") REFERENCES "public"."labels"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_types" ADD CONSTRAINT "issue_types_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activity_events" ADD CONSTRAINT "project_activity_project_tenant_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activity_events" ADD CONSTRAINT "project_activity_actor_tenant_fk" FOREIGN KEY ("workspace_id","actor_membership_id") REFERENCES "public"."workspace_memberships"("workspace_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_assignees" ADD CONSTRAINT "project_assignees_project_tenant_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_assignees" ADD CONSTRAINT "project_assignees_membership_tenant_fk" FOREIGN KEY ("workspace_id","membership_id") REFERENCES "public"."workspace_memberships"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_assignees" ADD CONSTRAINT "project_assignees_creator_tenant_fk" FOREIGN KEY ("workspace_id","created_by_membership_id") REFERENCES "public"."workspace_memberships"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_project_tenant_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_resources" ADD CONSTRAINT "project_resources_project_tenant_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_resources" ADD CONSTRAINT "project_resources_creator_tenant_fk" FOREIGN KEY ("workspace_id","created_by_membership_id") REFERENCES "public"."workspace_memberships"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_project_tenant_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_author_tenant_fk" FOREIGN KEY ("workspace_id","author_membership_id") REFERENCES "public"."workspace_memberships"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "issue_assignees_issue_membership_unique" ON "issue_assignees" USING btree ("issue_id","membership_id");--> statement-breakpoint
CREATE INDEX "issue_assignees_membership_idx" ON "issue_assignees" USING btree ("workspace_id","membership_id");--> statement-breakpoint
CREATE INDEX "issue_comments_issue_created_idx" ON "issue_comments" USING btree ("issue_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "issue_labels_issue_label_unique" ON "issue_labels" USING btree ("issue_id","label_id");--> statement-breakpoint
CREATE UNIQUE INDEX "issue_types_workspace_name_unique" ON "issue_types" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "issue_types_workspace_id_unique" ON "issue_types" USING btree ("workspace_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "labels_workspace_name_unique" ON "labels" USING btree ("workspace_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "labels_workspace_id_unique" ON "labels" USING btree ("workspace_id","id");--> statement-breakpoint
CREATE INDEX "project_activity_project_created_idx" ON "project_activity_events" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "project_assignees_project_membership_unique" ON "project_assignees" USING btree ("project_id","membership_id");--> statement-breakpoint
CREATE INDEX "project_assignees_membership_idx" ON "project_assignees" USING btree ("workspace_id","membership_id");--> statement-breakpoint
CREATE INDEX "project_milestones_project_position_idx" ON "project_milestones" USING btree ("project_id","position");--> statement-breakpoint
CREATE INDEX "project_resources_project_position_idx" ON "project_resources" USING btree ("project_id","position");--> statement-breakpoint
CREATE INDEX "project_updates_project_created_idx" ON "project_updates" USING btree ("project_id","created_at");--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_type_tenant_fk" FOREIGN KEY ("workspace_id","issue_type_id") REFERENCES "public"."issue_types"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issues_type_idx" ON "issues" USING btree ("issue_type_id","updated_at");--> statement-breakpoint
INSERT INTO "issue_assignees" (
	"workspace_id",
	"issue_id",
	"membership_id",
	"created_by_membership_id"
)
SELECT
	issue."workspace_id",
	issue."id",
	membership."id",
	issue."creator_membership_id"
FROM "issues" issue
INNER JOIN "workspace_memberships" membership
	ON membership."workspace_id" = issue."workspace_id"
	AND membership."user_id" = issue."assignee_id"
WHERE issue."assignee_id" IS NOT NULL
ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "team_id";--> statement-breakpoint
ALTER TABLE "issues" DROP COLUMN "assignee_id";--> statement-breakpoint
ALTER TABLE "time_logs" DROP COLUMN "team_id";--> statement-breakpoint
ALTER TABLE "timer_sessions" DROP COLUMN "team_id";--> statement-breakpoint
DROP TYPE "public"."team_role";
