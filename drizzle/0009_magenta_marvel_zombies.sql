CREATE TYPE "public"."favorite_target_type" AS ENUM('client', 'project', 'issue');--> statement-breakpoint
CREATE TABLE "workspace_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"target_type" "favorite_target_type" NOT NULL,
	"client_id" uuid,
	"project_id" uuid,
	"issue_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_favorites_target_check" CHECK (("workspace_favorites"."target_type" = 'client' and "workspace_favorites"."client_id" is not null and "workspace_favorites"."project_id" is null and "workspace_favorites"."issue_id" is null)
        or ("workspace_favorites"."target_type" = 'project' and "workspace_favorites"."client_id" is null and "workspace_favorites"."project_id" is not null and "workspace_favorites"."issue_id" is null)
        or ("workspace_favorites"."target_type" = 'issue' and "workspace_favorites"."client_id" is null and "workspace_favorites"."project_id" is null and "workspace_favorites"."issue_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "icon_type" "client_icon_type" DEFAULT 'icon' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "icon_key" text DEFAULT 'folder-kanban' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "icon_color" text DEFAULT '#8b5cf6' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_favorites" ADD CONSTRAINT "workspace_favorites_membership_tenant_fk" FOREIGN KEY ("workspace_id","membership_id") REFERENCES "public"."workspace_memberships"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_favorites" ADD CONSTRAINT "workspace_favorites_client_tenant_fk" FOREIGN KEY ("workspace_id","client_id") REFERENCES "public"."clients"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_favorites" ADD CONSTRAINT "workspace_favorites_project_tenant_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_favorites" ADD CONSTRAINT "workspace_favorites_issue_tenant_fk" FOREIGN KEY ("workspace_id","issue_id") REFERENCES "public"."issues"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_favorites_membership_client_unique" ON "workspace_favorites" USING btree ("membership_id","client_id") WHERE "workspace_favorites"."client_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_favorites_membership_project_unique" ON "workspace_favorites" USING btree ("membership_id","project_id") WHERE "workspace_favorites"."project_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_favorites_membership_issue_unique" ON "workspace_favorites" USING btree ("membership_id","issue_id") WHERE "workspace_favorites"."issue_id" is not null;--> statement-breakpoint
CREATE INDEX "workspace_favorites_membership_created_idx" ON "workspace_favorites" USING btree ("membership_id","created_at");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_icon_color_check" CHECK ("projects"."icon_color" ~ '^#[0-9A-Fa-f]{6}$');