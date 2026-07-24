CREATE TABLE "user_password_credentials" (
	"user_id" text PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"credential_version" integer DEFAULT 1 NOT NULL,
	"password_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"target_membership_id" uuid NOT NULL,
	"target_user_id" text NOT NULL,
	"created_by_membership_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "accounts" CASCADE;--> statement-breakpoint
DROP TABLE "authenticators" CASCADE;--> statement-breakpoint
DROP TABLE "sessions" CASCADE;--> statement-breakpoint
DROP TABLE "verification_tokens" CASCADE;--> statement-breakpoint
ALTER TABLE "user_password_credentials" ADD CONSTRAINT "user_password_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_links" ADD CONSTRAINT "password_reset_links_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_links" ADD CONSTRAINT "password_reset_links_target_membership_fk" FOREIGN KEY ("workspace_id","target_membership_id","target_user_id") REFERENCES "public"."workspace_memberships"("workspace_id","id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_links" ADD CONSTRAINT "password_reset_links_creator_membership_fk" FOREIGN KEY ("workspace_id","created_by_membership_id") REFERENCES "public"."workspace_memberships"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_password_credentials_version_idx" ON "user_password_credentials" USING btree ("user_id","credential_version");--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_links_token_hash_unique" ON "password_reset_links" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "password_reset_links_target_active_idx" ON "password_reset_links" USING btree ("target_user_id","expires_at");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "email_verified";