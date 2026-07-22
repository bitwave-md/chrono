CREATE TYPE "public"."default_issue_view" AS ENUM('list', 'board');--> statement-breakpoint
CREATE TYPE "public"."interface_density" AS ENUM('compact', 'comfortable');--> statement-breakpoint
CREATE TYPE "public"."user_theme" AS ENUM('dark', 'light', 'system');--> statement-breakpoint
CREATE TYPE "public"."stored_object_scope" AS ENUM('personal', 'workspace');--> statement-breakpoint
CREATE TYPE "public"."stored_object_state" AS ENUM('pending', 'ready', 'deleted');--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"theme" "user_theme" DEFAULT 'dark' NOT NULL,
	"density" "interface_density" DEFAULT 'compact' NOT NULL,
	"issue_view" "default_issue_view" DEFAULT 'list' NOT NULL,
	"sidebar_collapsed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_assets" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"icon_type" text DEFAULT 'icon' NOT NULL,
	"icon_key" text DEFAULT 'waves' NOT NULL,
	"icon_color" text DEFAULT '#6366f1' NOT NULL,
	"image_object_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_notification_preferences" (
	"workspace_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"assignments" boolean DEFAULT true NOT NULL,
	"status_changes" boolean DEFAULT true NOT NULL,
	"comments" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_notification_preferences_workspace_id_membership_id_pk" PRIMARY KEY("workspace_id","membership_id")
);
--> statement-breakpoint
CREATE TABLE "attachment_share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"attachment_id" uuid NOT NULL,
	"created_by_membership_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"access_count" integer DEFAULT 0 NOT NULL,
	"last_accessed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attachment_share_links_expiry_check" CHECK ("attachment_share_links"."expires_at" > "attachment_share_links"."created_at")
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"object_id" uuid NOT NULL,
	"uploader_membership_id" uuid NOT NULL,
	"client_id" uuid,
	"project_id" uuid,
	"issue_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "attachments_exact_target_check" CHECK (num_nonnulls("attachments"."client_id", "attachments"."project_id", "attachments"."issue_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "stored_objects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" "stored_object_scope" NOT NULL,
	"workspace_id" uuid,
	"owner_user_id" text NOT NULL,
	"object_key" text NOT NULL,
	"original_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text,
	"state" "stored_object_state" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ready_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "stored_objects_scope_workspace_check" CHECK (("stored_objects"."scope" = 'personal' and "stored_objects"."workspace_id" is null) or ("stored_objects"."scope" = 'workspace' and "stored_objects"."workspace_id" is not null)),
	CONSTRAINT "stored_objects_size_check" CHECK ("stored_objects"."size_bytes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_profile_assets" (
	"user_id" text PRIMARY KEY NOT NULL,
	"avatar_object_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "attachments_workspace_id_unique" ON "attachments" USING btree ("workspace_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "stored_objects_workspace_id_unique" ON "stored_objects" USING btree ("workspace_id","id");--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_assets" ADD CONSTRAINT "workspace_assets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_notification_preferences" ADD CONSTRAINT "workspace_notification_preferences_membership_tenant_fk" FOREIGN KEY ("workspace_id","membership_id") REFERENCES "public"."workspace_memberships"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment_share_links" ADD CONSTRAINT "attachment_share_links_attachment_tenant_fk" FOREIGN KEY ("workspace_id","attachment_id") REFERENCES "public"."attachments"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment_share_links" ADD CONSTRAINT "attachment_share_links_creator_tenant_fk" FOREIGN KEY ("workspace_id","created_by_membership_id") REFERENCES "public"."workspace_memberships"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_object_tenant_fk" FOREIGN KEY ("workspace_id","object_id") REFERENCES "public"."stored_objects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploader_tenant_fk" FOREIGN KEY ("workspace_id","uploader_membership_id") REFERENCES "public"."workspace_memberships"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_client_tenant_fk" FOREIGN KEY ("workspace_id","client_id") REFERENCES "public"."clients"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_project_tenant_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_issue_tenant_fk" FOREIGN KEY ("workspace_id","issue_id") REFERENCES "public"."issues"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stored_objects" ADD CONSTRAINT "stored_objects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stored_objects" ADD CONSTRAINT "stored_objects_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile_assets" ADD CONSTRAINT "user_profile_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile_assets" ADD CONSTRAINT "user_profile_assets_avatar_object_id_stored_objects_id_fk" FOREIGN KEY ("avatar_object_id") REFERENCES "public"."stored_objects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attachment_share_links_token_unique" ON "attachment_share_links" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "attachment_share_links_attachment_idx" ON "attachment_share_links" USING btree ("attachment_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "attachments_object_unique" ON "attachments" USING btree ("object_id");--> statement-breakpoint
CREATE INDEX "attachments_client_created_idx" ON "attachments" USING btree ("client_id","created_at");--> statement-breakpoint
CREATE INDEX "attachments_project_created_idx" ON "attachments" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "attachments_issue_created_idx" ON "attachments" USING btree ("issue_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "stored_objects_key_unique" ON "stored_objects" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "stored_objects_owner_state_idx" ON "stored_objects" USING btree ("owner_user_id","state","created_at");--> statement-breakpoint
CREATE INDEX "stored_objects_workspace_state_idx" ON "stored_objects" USING btree ("workspace_id","state","created_at");
