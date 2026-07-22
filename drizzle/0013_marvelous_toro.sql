CREATE TABLE "issue_activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"actor_membership_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "issue_activity_events" ADD CONSTRAINT "issue_activity_events_issue_tenant_fk" FOREIGN KEY ("workspace_id","issue_id") REFERENCES "public"."issues"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_activity_events" ADD CONSTRAINT "issue_activity_events_actor_tenant_fk" FOREIGN KEY ("workspace_id","actor_membership_id") REFERENCES "public"."workspace_memberships"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issue_activity_events_issue_created_idx" ON "issue_activity_events" USING btree ("issue_id","created_at");--> statement-breakpoint
ALTER TABLE "workspace_assets" ADD CONSTRAINT "workspace_assets_image_object_id_stored_objects_id_fk" FOREIGN KEY ("image_object_id") REFERENCES "public"."stored_objects"("id") ON DELETE set null ON UPDATE no action;