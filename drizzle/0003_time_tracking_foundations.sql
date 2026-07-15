CREATE TYPE "public"."time_log_source" AS ENUM('timer', 'manual');--> statement-breakpoint
CREATE TABLE "time_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"color" text,
	"default_billable" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "time_categories_position_check" CHECK ("time_categories"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "time_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"timer_session_id" uuid,
	"worker_membership_id" uuid NOT NULL,
	"worker_user_id" text NOT NULL,
	"client_id" uuid NOT NULL,
	"project_id" uuid,
	"root_project_id" uuid,
	"team_id" uuid,
	"category_id" uuid,
	"source" time_log_source NOT NULL,
	"note" text,
	"billable" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"duration_seconds" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "time_logs_duration_check" CHECK ("time_logs"."duration_seconds" > 0),
	CONSTRAINT "time_logs_version_check" CHECK ("time_logs"."version" > 0),
	CONSTRAINT "time_logs_ended_after_started_check" CHECK ("time_logs"."ended_at" > "time_logs"."started_at")
);
--> statement-breakpoint
CREATE TABLE "timer_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"worker_membership_id" uuid NOT NULL,
	"worker_user_id" text NOT NULL,
	"client_id" uuid NOT NULL,
	"project_id" uuid,
	"root_project_id" uuid,
	"team_id" uuid,
	"category_id" uuid,
	"note" text,
	"billable" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"stopped_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "timer_sessions_stopped_after_started_check" CHECK ("timer_sessions"."stopped_at" is null or "timer_sessions"."stopped_at" >= "timer_sessions"."started_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "time_categories_workspace_id_unique" ON "time_categories" USING btree ("workspace_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "timer_sessions_workspace_id_unique" ON "timer_sessions" USING btree ("workspace_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_memberships_tenant_id_user_unique" ON "workspace_memberships" USING btree ("workspace_id","id","user_id");--> statement-breakpoint
ALTER TABLE "time_categories" ADD CONSTRAINT "time_categories_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_issue_tenant_client_fk" FOREIGN KEY ("workspace_id","client_id","issue_id") REFERENCES "public"."issues"("workspace_id","client_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_timer_session_tenant_fk" FOREIGN KEY ("workspace_id","timer_session_id") REFERENCES "public"."timer_sessions"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_project_tenant_client_fk" FOREIGN KEY ("workspace_id","client_id","project_id") REFERENCES "public"."projects"("workspace_id","client_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_root_project_tenant_client_fk" FOREIGN KEY ("workspace_id","client_id","root_project_id") REFERENCES "public"."projects"("workspace_id","client_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_team_tenant_fk" FOREIGN KEY ("workspace_id","team_id") REFERENCES "public"."teams"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_category_tenant_fk" FOREIGN KEY ("workspace_id","category_id") REFERENCES "public"."time_categories"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_logs" ADD CONSTRAINT "time_logs_worker_membership_fk" FOREIGN KEY ("workspace_id","worker_membership_id","worker_user_id") REFERENCES "public"."workspace_memberships"("workspace_id","id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timer_sessions" ADD CONSTRAINT "timer_sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timer_sessions" ADD CONSTRAINT "timer_sessions_issue_tenant_client_fk" FOREIGN KEY ("workspace_id","client_id","issue_id") REFERENCES "public"."issues"("workspace_id","client_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timer_sessions" ADD CONSTRAINT "timer_sessions_project_tenant_client_fk" FOREIGN KEY ("workspace_id","client_id","project_id") REFERENCES "public"."projects"("workspace_id","client_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timer_sessions" ADD CONSTRAINT "timer_sessions_root_project_tenant_client_fk" FOREIGN KEY ("workspace_id","client_id","root_project_id") REFERENCES "public"."projects"("workspace_id","client_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timer_sessions" ADD CONSTRAINT "timer_sessions_team_tenant_fk" FOREIGN KEY ("workspace_id","team_id") REFERENCES "public"."teams"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timer_sessions" ADD CONSTRAINT "timer_sessions_category_tenant_fk" FOREIGN KEY ("workspace_id","category_id") REFERENCES "public"."time_categories"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timer_sessions" ADD CONSTRAINT "timer_sessions_worker_membership_fk" FOREIGN KEY ("workspace_id","worker_membership_id","worker_user_id") REFERENCES "public"."workspace_memberships"("workspace_id","id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "time_categories_workspace_key_unique" ON "time_categories" USING btree ("workspace_id","key");--> statement-breakpoint
CREATE INDEX "time_categories_workspace_position_idx" ON "time_categories" USING btree ("workspace_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "time_logs_timer_session_unique" ON "time_logs" USING btree ("timer_session_id") WHERE "time_logs"."timer_session_id" is not null;--> statement-breakpoint
CREATE INDEX "time_logs_workspace_started_idx" ON "time_logs" USING btree ("workspace_id","started_at");--> statement-breakpoint
CREATE INDEX "time_logs_client_started_idx" ON "time_logs" USING btree ("client_id","started_at");--> statement-breakpoint
CREATE INDEX "time_logs_project_started_idx" ON "time_logs" USING btree ("project_id","started_at");--> statement-breakpoint
CREATE INDEX "time_logs_root_project_started_idx" ON "time_logs" USING btree ("root_project_id","started_at");--> statement-breakpoint
CREATE INDEX "time_logs_team_started_idx" ON "time_logs" USING btree ("team_id","started_at");--> statement-breakpoint
CREATE INDEX "time_logs_worker_started_idx" ON "time_logs" USING btree ("worker_user_id","started_at");--> statement-breakpoint
CREATE INDEX "time_logs_category_started_idx" ON "time_logs" USING btree ("category_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "timer_sessions_worker_active_unique" ON "timer_sessions" USING btree ("worker_user_id") WHERE "timer_sessions"."stopped_at" is null;--> statement-breakpoint
CREATE INDEX "timer_sessions_workspace_worker_started_idx" ON "timer_sessions" USING btree ("workspace_id","worker_user_id","started_at");
