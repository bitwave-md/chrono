ALTER TABLE "issue_comments" ADD COLUMN "parent_comment_id" uuid;--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "comment_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "issue_comments_workspace_issue_id_unique" ON "issue_comments" USING btree ("workspace_id","issue_id","id");--> statement-breakpoint
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_parent_tenant_issue_fk" FOREIGN KEY ("workspace_id","issue_id","parent_comment_id") REFERENCES "public"."issue_comments"("workspace_id","issue_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_comment_tenant_issue_fk" FOREIGN KEY ("workspace_id","issue_id","comment_id") REFERENCES "public"."issue_comments"("workspace_id","issue_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachments_comment_created_idx" ON "attachments" USING btree ("comment_id","created_at");--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_comment_issue_check" CHECK ("attachments"."comment_id" is null or "attachments"."issue_id" is not null);
