CREATE TYPE "public"."client_permission" AS ENUM('view', 'comment', 'contribute');--> statement-breakpoint
CREATE TYPE "public"."project_kind" AS ENUM('project', 'subproject', 'sprint');--> statement-breakpoint
CREATE TYPE "public"."project_visibility" AS ENUM('internal', 'client_shared', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."project_workflow_mode" AS ENUM('own', 'inherit');--> statement-breakpoint
CREATE TYPE "public"."workflow_status_category" AS ENUM('backlog', 'unstarted', 'started', 'completed', 'canceled');--> statement-breakpoint
CREATE TABLE "client_memberships" (
	"workspace_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"workspace_membership_id" uuid NOT NULL,
	"permission" "client_permission" DEFAULT 'view' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_memberships_client_id_workspace_membership_id_pk" PRIMARY KEY("client_id","workspace_membership_id")
);
--> statement-breakpoint
CREATE TABLE "clients" (
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
CREATE TABLE "issue_namespaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"project_id" uuid,
	"prefix" text NOT NULL,
	"next_number" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issue_namespaces_next_number_check" CHECK ("issue_namespaces"."next_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"parent_id" uuid,
	"kind" "project_kind" NOT NULL,
	"workflow_mode" "project_workflow_mode" NOT NULL,
	"visibility" "project_visibility" DEFAULT 'internal' NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"start_date" timestamp with time zone,
	"target_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "projects_root_kind_check" CHECK (("projects"."parent_id" is null and "projects"."kind" = 'project') or ("projects"."parent_id" is not null and "projects"."kind" <> 'project')),
	CONSTRAINT "projects_root_workflow_check" CHECK ("projects"."parent_id" is not null or "projects"."workflow_mode" = 'own')
);
--> statement-breakpoint
CREATE TABLE "workflow_statuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" "workflow_status_category" NOT NULL,
	"color" text NOT NULL,
	"position" integer NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "clients_workspace_id_unique" ON "clients" USING btree ("workspace_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_workspace_id_unique" ON "projects" USING btree ("workspace_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_tenant_client_id_unique" ON "projects" USING btree ("workspace_id","client_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "workflows_workspace_id_unique" ON "workflows" USING btree ("workspace_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_memberships_workspace_id_unique" ON "workspace_memberships" USING btree ("workspace_id","id");--> statement-breakpoint
ALTER TABLE "client_memberships" ADD CONSTRAINT "client_memberships_client_tenant_fk" FOREIGN KEY ("workspace_id","client_id") REFERENCES "public"."clients"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_memberships" ADD CONSTRAINT "client_memberships_workspace_membership_tenant_fk" FOREIGN KEY ("workspace_id","workspace_membership_id") REFERENCES "public"."workspace_memberships"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_namespaces" ADD CONSTRAINT "issue_namespaces_client_tenant_fk" FOREIGN KEY ("workspace_id","client_id") REFERENCES "public"."clients"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_namespaces" ADD CONSTRAINT "issue_namespaces_project_tenant_client_fk" FOREIGN KEY ("workspace_id","client_id","project_id") REFERENCES "public"."projects"("workspace_id","client_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_tenant_fk" FOREIGN KEY ("workspace_id","client_id") REFERENCES "public"."clients"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_parent_tenant_client_fk" FOREIGN KEY ("workspace_id","client_id","parent_id") REFERENCES "public"."projects"("workspace_id","client_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_statuses" ADD CONSTRAINT "workflow_statuses_workflow_tenant_fk" FOREIGN KEY ("workspace_id","workflow_id") REFERENCES "public"."workflows"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_project_tenant_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_memberships_membership_idx" ON "client_memberships" USING btree ("workspace_membership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_workspace_key_unique" ON "clients" USING btree ("workspace_id","key");--> statement-breakpoint
CREATE INDEX "clients_workspace_active_idx" ON "clients" USING btree ("workspace_id","name") WHERE "clients"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "issue_namespaces_workspace_prefix_unique" ON "issue_namespaces" USING btree ("workspace_id","prefix");--> statement-breakpoint
CREATE UNIQUE INDEX "issue_namespaces_client_default_unique" ON "issue_namespaces" USING btree ("client_id") WHERE "issue_namespaces"."project_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "issue_namespaces_project_override_unique" ON "issue_namespaces" USING btree ("project_id") WHERE "issue_namespaces"."project_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "projects_client_slug_unique" ON "projects" USING btree ("client_id","slug");--> statement-breakpoint
CREATE INDEX "projects_parent_position_idx" ON "projects" USING btree ("parent_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_statuses_workflow_slug_unique" ON "workflow_statuses" USING btree ("workflow_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_statuses_default_unique" ON "workflow_statuses" USING btree ("workflow_id") WHERE "workflow_statuses"."is_default" = true and "workflow_statuses"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "workflows_project_unique" ON "workflows" USING btree ("project_id");--> statement-breakpoint
