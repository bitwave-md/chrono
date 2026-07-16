CREATE TYPE "public"."client_icon_type" AS ENUM('icon', 'emoji');--> statement-breakpoint
CREATE TABLE "client_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"icon_key" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_by_membership_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "icon_type" "client_icon_type" DEFAULT 'icon' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "icon_key" text DEFAULT 'hash' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "icon_color" text DEFAULT '#6366f1' NOT NULL;--> statement-breakpoint
ALTER TABLE "client_resources" ADD CONSTRAINT "client_resources_client_tenant_fk" FOREIGN KEY ("workspace_id","client_id") REFERENCES "public"."clients"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_resources" ADD CONSTRAINT "client_resources_creator_tenant_fk" FOREIGN KEY ("workspace_id","created_by_membership_id") REFERENCES "public"."workspace_memberships"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "client_resources_workspace_id_unique" ON "client_resources" USING btree ("workspace_id","id");--> statement-breakpoint
CREATE INDEX "client_resources_client_position_idx" ON "client_resources" USING btree ("client_id","position");--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_icon_color_check" CHECK ("clients"."icon_color" ~ '^#[0-9A-Fa-f]{6}$');--> statement-breakpoint
INSERT INTO "client_memberships" (
	"workspace_id",
	"client_id",
	"workspace_membership_id",
	"permission",
	"created_at"
)
SELECT
	client."workspace_id",
	client."id",
	membership."id",
	'contribute',
	now()
FROM "clients" client
INNER JOIN "workspace_memberships" membership
	ON membership."workspace_id" = client."workspace_id"
	AND membership."role" IN ('owner', 'admin')
	AND membership."status" = 'active'
ON CONFLICT ("client_id", "workspace_membership_id") DO NOTHING;
