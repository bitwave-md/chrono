CREATE TABLE "invitation_client_access" (
	"workspace_id" uuid NOT NULL,
	"invitation_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitation_client_access_invitation_id_client_id_pk" PRIMARY KEY("invitation_id","client_id")
);
--> statement-breakpoint
CREATE TABLE "invitation_project_exclusions" (
	"workspace_id" uuid NOT NULL,
	"invitation_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitation_project_exclusions_invitation_id_project_id_pk" PRIMARY KEY("invitation_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "project_memberships" (
	"workspace_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"workspace_membership_id" uuid NOT NULL,
	"added_by_membership_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_memberships_project_id_workspace_membership_id_pk" PRIMARY KEY("project_id","workspace_membership_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_workspace_id_unique" ON "invitations" USING btree ("workspace_id","id");--> statement-breakpoint
ALTER TABLE "invitation_client_access" ADD CONSTRAINT "invitation_client_access_invitation_tenant_fk" FOREIGN KEY ("workspace_id","invitation_id") REFERENCES "public"."invitations"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_client_access" ADD CONSTRAINT "invitation_client_access_client_tenant_fk" FOREIGN KEY ("workspace_id","client_id") REFERENCES "public"."clients"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_project_exclusions" ADD CONSTRAINT "invitation_project_exclusions_invitation_tenant_fk" FOREIGN KEY ("workspace_id","invitation_id") REFERENCES "public"."invitations"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_project_exclusions" ADD CONSTRAINT "invitation_project_exclusions_client_tenant_fk" FOREIGN KEY ("workspace_id","client_id") REFERENCES "public"."clients"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_project_exclusions" ADD CONSTRAINT "invitation_project_exclusions_project_tenant_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_project_tenant_fk" FOREIGN KEY ("workspace_id","project_id") REFERENCES "public"."projects"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_client_tenant_fk" FOREIGN KEY ("workspace_id","client_id") REFERENCES "public"."clients"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_member_tenant_fk" FOREIGN KEY ("workspace_id","workspace_membership_id") REFERENCES "public"."workspace_memberships"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_memberships" ADD CONSTRAINT "project_memberships_adder_tenant_fk" FOREIGN KEY ("workspace_id","added_by_membership_id") REFERENCES "public"."workspace_memberships"("workspace_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invitation_client_access_workspace_idx" ON "invitation_client_access" USING btree ("workspace_id","invitation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invitation_project_exclusions_workspace_id_unique" ON "invitation_project_exclusions" USING btree ("workspace_id","invitation_id","project_id");--> statement-breakpoint
CREATE INDEX "invitation_project_exclusions_client_idx" ON "invitation_project_exclusions" USING btree ("workspace_id","client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_memberships_workspace_id_unique" ON "project_memberships" USING btree ("workspace_id","project_id","workspace_membership_id");--> statement-breakpoint
CREATE INDEX "project_memberships_member_idx" ON "project_memberships" USING btree ("workspace_id","workspace_membership_id");--> statement-breakpoint
CREATE INDEX "project_memberships_client_idx" ON "project_memberships" USING btree ("workspace_id","client_id");--> statement-breakpoint
INSERT INTO "project_memberships" ("workspace_id", "client_id", "project_id", "workspace_membership_id", "added_by_membership_id")
SELECT cm."workspace_id", cm."client_id", p."id", cm."workspace_membership_id", cm."workspace_membership_id"
FROM "client_memberships" cm
INNER JOIN "workspace_memberships" wm
  ON wm."workspace_id" = cm."workspace_id"
 AND wm."id" = cm."workspace_membership_id"
INNER JOIN "projects" p
  ON p."workspace_id" = cm."workspace_id"
 AND p."client_id" = cm."client_id"
 AND p."archived_at" IS NULL
WHERE wm."role" = 'guest'
ON CONFLICT ("project_id", "workspace_membership_id") DO NOTHING;
