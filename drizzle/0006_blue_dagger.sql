CREATE TYPE "public"."project_priority" AS ENUM('none', 'urgent', 'high', 'medium', 'low');--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "priority" "project_priority" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "lead_membership_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_lead_membership_tenant_fk" FOREIGN KEY ("workspace_id","lead_membership_id") REFERENCES "public"."workspace_memberships"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_lead_membership_idx" ON "projects" USING btree ("workspace_id","lead_membership_id");