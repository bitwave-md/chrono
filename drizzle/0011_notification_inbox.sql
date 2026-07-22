CREATE TYPE "public"."inbox_notification_kind" AS ENUM('assigned', 'status_changed', 'commented');--> statement-breakpoint
CREATE TABLE "inbox_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"recipient_membership_id" uuid NOT NULL,
	"actor_membership_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"kind" "inbox_notification_kind" NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "inbox_notifications" ADD CONSTRAINT "inbox_notifications_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_notifications" ADD CONSTRAINT "inbox_notifications_recipient_tenant_fk" FOREIGN KEY ("workspace_id","recipient_membership_id") REFERENCES "public"."workspace_memberships"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_notifications" ADD CONSTRAINT "inbox_notifications_actor_tenant_fk" FOREIGN KEY ("workspace_id","actor_membership_id") REFERENCES "public"."workspace_memberships"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_notifications" ADD CONSTRAINT "inbox_notifications_issue_tenant_fk" FOREIGN KEY ("workspace_id","issue_id") REFERENCES "public"."issues"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inbox_notifications_recipient_open_idx" ON "inbox_notifications" USING btree ("workspace_id","recipient_membership_id","dismissed_at","created_at");--> statement-breakpoint
CREATE INDEX "inbox_notifications_issue_created_idx" ON "inbox_notifications" USING btree ("workspace_id","issue_id","created_at");