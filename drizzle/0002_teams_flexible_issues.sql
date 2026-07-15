CREATE TYPE "public"."issue_priority" AS ENUM('none', 'urgent', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."issue_visibility" AS ENUM('internal', 'client_shared', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('lead', 'member');--> statement-breakpoint
CREATE TABLE "issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"project_id" uuid,
	"team_id" uuid,
	"assignee_id" text,
	"status_id" uuid,
	"issue_namespace_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"priority" "issue_priority" DEFAULT 'none' NOT NULL,
	"visibility" "issue_visibility" DEFAULT 'internal' NOT NULL,
	"creator_membership_id" uuid NOT NULL,
	"parent_issue_id" uuid,
	"rank" text DEFAULT '0' NOT NULL,
	"estimate_minutes" integer,
	"due_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	CONSTRAINT "issues_project_status_check" CHECK (("issues"."project_id" is null and "issues"."status_id" is null) or ("issues"."project_id" is not null and "issues"."status_id" is not null)),
	CONSTRAINT "issues_number_check" CHECK ("issues"."number" > 0),
	CONSTRAINT "issues_version_check" CHECK ("issues"."version" > 0),
	CONSTRAINT "issues_estimate_check" CHECK ("issues"."estimate_minutes" is null or "issues"."estimate_minutes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "team_memberships" (
	"workspace_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"workspace_membership_id" uuid NOT NULL,
	"role" "team_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_memberships_team_id_workspace_membership_id_pk" PRIMARY KEY("team_id","workspace_membership_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "issues_tenant_client_id_unique" ON "issues" USING btree ("workspace_id","client_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_workspace_id_unique" ON "teams" USING btree ("workspace_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "issue_namespaces_tenant_client_id_unique" ON "issue_namespaces" USING btree ("workspace_id","client_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_statuses_workspace_id_unique" ON "workflow_statuses" USING btree ("workspace_id","id");--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_client_tenant_fk" FOREIGN KEY ("workspace_id","client_id") REFERENCES "public"."clients"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_project_tenant_client_fk" FOREIGN KEY ("workspace_id","client_id","project_id") REFERENCES "public"."projects"("workspace_id","client_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_team_tenant_fk" FOREIGN KEY ("workspace_id","team_id") REFERENCES "public"."teams"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_assignee_membership_tenant_fk" FOREIGN KEY ("workspace_id","assignee_id") REFERENCES "public"."workspace_memberships"("workspace_id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_status_tenant_fk" FOREIGN KEY ("workspace_id","status_id") REFERENCES "public"."workflow_statuses"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_namespace_tenant_client_fk" FOREIGN KEY ("workspace_id","client_id","issue_namespace_id") REFERENCES "public"."issue_namespaces"("workspace_id","client_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_creator_membership_tenant_fk" FOREIGN KEY ("workspace_id","creator_membership_id") REFERENCES "public"."workspace_memberships"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_parent_tenant_client_fk" FOREIGN KEY ("workspace_id","client_id","parent_issue_id") REFERENCES "public"."issues"("workspace_id","client_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_tenant_fk" FOREIGN KEY ("workspace_id","team_id") REFERENCES "public"."teams"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_workspace_membership_tenant_fk" FOREIGN KEY ("workspace_id","workspace_membership_id") REFERENCES "public"."workspace_memberships"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "issues_namespace_number_unique" ON "issues" USING btree ("issue_namespace_id","number");--> statement-breakpoint
CREATE INDEX "issues_workspace_created_idx" ON "issues" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "issues_project_rank_idx" ON "issues" USING btree ("project_id","rank");--> statement-breakpoint
CREATE INDEX "issues_team_rank_idx" ON "issues" USING btree ("team_id","rank");--> statement-breakpoint
CREATE INDEX "issues_assignee_idx" ON "issues" USING btree ("assignee_id","updated_at");--> statement-breakpoint
CREATE INDEX "team_memberships_membership_idx" ON "team_memberships" USING btree ("workspace_membership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_workspace_key_unique" ON "teams" USING btree ("workspace_id","key");--> statement-breakpoint
