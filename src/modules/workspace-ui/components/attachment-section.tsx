"use client";

import { Download, FileText, LoaderCircle, Paperclip, Share2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAttachmentsQuery, useAttachmentShareLinksQuery, useCreateAttachmentShareMutation, useDeleteAttachmentMutation, useRevokeAttachmentShareMutation, useUploadAttachmentMutation } from "@/modules/workspace-ui/application/use-attachment-queries";
import { ImageAttachmentPreview } from "@/modules/workspace-ui/components/image-attachment-preview";
import type { AttachmentRecord, AttachmentTargetType } from "@/modules/workspace-ui/domain/workspace-types";
import { useWorkspaceIdentity } from "@/modules/workspace-ui/state/workspace-ui-provider";

const lifetimeOptions = [
  { value: "3600", label: "1 hour" },
  { value: "86400", label: "1 day" },
  { value: "604800", label: "7 days" },
  { value: "2592000", label: "30 days" },
];

export function AttachmentSection({
  canUpload,
  targetId,
  targetType,
  workspaceSlug,
  variant = "section",
}: {
  canUpload: boolean;
  targetId: string;
  targetType: AttachmentTargetType;
  workspaceSlug: string;
  variant?: "section" | "inline";
}) {
  const workspace = useWorkspaceIdentity();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const target = { targetType, targetId };
  const attachments = useAttachmentsQuery(workspaceSlug, target);
  const upload = useUploadAttachmentMutation(workspaceSlug, target, setProgress);
  const deletion = useDeleteAttachmentMutation(workspaceSlug, target);
  const canManage = workspace.role === "owner" || workspace.role === "admin";
  const inline = variant === "inline";
  const records = attachments.data ?? [];

  const selectFile = (file: File | undefined) => {
    if (!file) return;
    setProgress(0);
    upload.mutate(file, {
      onSuccess: () => { setProgress(0); toast.success("Attachment uploaded"); },
      onError: (error) => { setProgress(0); toast.error(error.message); },
    });
  };

  return (
    <section className={inline ? "mt-3" : "mt-8"}>
      {!inline ? <div className="flex items-center justify-between gap-3">
        <div><h2 className="text-sm font-medium">Attachments</h2><p className="mt-0.5 text-xs text-muted-foreground">Private files, up to 10 MB each.</p></div>
        {canUpload ? <Button disabled={upload.isPending} size="sm" variant="outline" onClick={() => inputRef.current?.click()}>{upload.isPending ? <LoaderCircle className="animate-spin" /> : <Paperclip />}Add file</Button> : null}
      </div> : null}
      <input className="hidden" ref={inputRef} type="file" onChange={(event) => { selectFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
      {upload.isPending ? <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} /></div> : null}
      {inline ? <div className={cn("grid gap-2", !records.length && "hidden")}>{records.map((attachment) => {
        const mayDelete = canManage || attachment.uploaderEmail === workspace.userEmail;
        return <InlineAttachment attachment={attachment} canShare={canUpload && (workspace.role !== "guest" || attachment.uploaderEmail === workspace.userEmail)} deleting={deletion.isPending} key={attachment.id} mayDelete={mayDelete} workspaceSlug={workspaceSlug} onDelete={() => deletion.mutate(attachment.id, { onSuccess: () => toast.success("Attachment deleted") })} />;
      })}</div> : <div className="mt-3 overflow-hidden rounded-lg border bg-card/35">
        {records.map((attachment) => {
          const uploader = attachment.uploaderName ?? attachment.uploaderEmail;
          const mayDelete = canManage || attachment.uploaderEmail === workspace.userEmail;
          return (
            <div className="flex min-h-14 items-center gap-3 border-b px-3 last:border-b-0" key={attachment.id}>
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><FileText className="size-4" /></span>
              <div className="min-w-0 flex-1"><strong className="block truncate text-sm font-medium">{attachment.filename}</strong><span className="block truncate text-xs text-muted-foreground">{formatBytes(attachment.sizeBytes)} · {uploader} · {new Date(attachment.createdAt).toLocaleDateString()}</span></div>
              <Avatar className="size-6 max-sm:hidden"><AvatarImage alt="" src={attachment.uploaderAvatarUrl ?? undefined} /><AvatarFallback className="text-[0.5rem]">{uploader.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
              <AttachmentActions attachment={attachment} canShare={canUpload && (workspace.role !== "guest" || attachment.uploaderEmail === workspace.userEmail)} deleting={deletion.isPending} mayDelete={mayDelete} workspaceSlug={workspaceSlug} onDelete={() => deletion.mutate(attachment.id, { onSuccess: () => toast.success("Attachment deleted") })} />
            </div>
          );
        })}
        {attachments.isLoading ? <p className="p-5 text-sm text-muted-foreground">Loading attachments...</p> : null}
        {!attachments.isLoading && !records.length ? <div className="grid min-h-24 place-items-center px-4 text-center"><p className="text-sm text-muted-foreground">No files attached.</p></div> : null}
      </div>}
      {inline && attachments.isLoading ? <p className="py-3 text-sm text-muted-foreground">Loading attachments...</p> : null}
      {attachments.error ? <p className="py-3 text-sm text-destructive">{attachments.error.message}</p> : null}
      {inline && canUpload ? <Button className="mt-2 h-7 px-1.5 text-xs text-muted-foreground" disabled={upload.isPending} size="sm" variant="ghost" onClick={() => inputRef.current?.click()}>{upload.isPending ? <LoaderCircle className="animate-spin" /> : <Paperclip />}Attach file</Button> : null}
    </section>
  );
}

function InlineAttachment({ attachment, canShare, deleting, mayDelete, workspaceSlug, onDelete }: { attachment: AttachmentRecord; canShare: boolean; deleting: boolean; mayDelete: boolean; workspaceSlug: string; onDelete: () => void }) {
  const uploader = attachment.uploaderName ?? attachment.uploaderEmail;
  const actions = <AttachmentActions attachment={attachment} canShare={canShare} deleting={deleting} mayDelete={mayDelete} workspaceSlug={workspaceSlug} onDelete={onDelete} />;
  if (attachment.contentType.startsWith("image/")) {
    return <article className="overflow-hidden rounded-lg border bg-card/35"><ImageAttachmentPreview attachment={attachment} className="max-h-[28rem]" workspaceSlug={workspaceSlug} /><div className="flex min-h-12 items-center gap-3 border-t px-3"><AttachmentDetails attachment={attachment} uploader={uploader} />{actions}</div></article>;
  }
  return <article className="flex min-h-14 items-center gap-3 rounded-lg border bg-card/35 px-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><FileText className="size-4" /></span><AttachmentDetails attachment={attachment} uploader={uploader} />{actions}</article>;
}

function AttachmentDetails({ attachment, uploader }: { attachment: AttachmentRecord; uploader: string }) {
  return <div className="min-w-0 flex-1"><strong className="block truncate text-sm font-medium">{attachment.filename}</strong><span className="block truncate text-xs text-muted-foreground">{formatBytes(attachment.sizeBytes)} · {uploader} · {new Date(attachment.createdAt).toLocaleDateString()}</span></div>;
}

function AttachmentActions({ attachment, canShare, deleting, mayDelete, workspaceSlug, onDelete }: { attachment: AttachmentRecord; canShare: boolean; deleting: boolean; mayDelete: boolean; workspaceSlug: string; onDelete: () => void }) {
  return <>{canShare ? <ShareAttachment attachmentId={attachment.id} workspaceSlug={workspaceSlug} /> : null}<Button aria-label={`Download ${attachment.filename}`} asChild size="icon-sm" variant="ghost"><a download href={`/api/workspaces/${workspaceSlug}/attachments/${attachment.id}/content`}><Download /></a></Button>{mayDelete ? <Button aria-label={`Delete ${attachment.filename}`} disabled={deleting} size="icon-sm" variant="ghost" onClick={onDelete}><Trash2 /></Button> : null}</>;
}

function ShareAttachment({ attachmentId, workspaceSlug }: { attachmentId: string; workspaceSlug: string }) {
  const [lifetime, setLifetime] = useState("604800");
  const [open, setOpen] = useState(false);
  const share = useCreateAttachmentShareMutation(workspaceSlug);
  const links = useAttachmentShareLinksQuery(workspaceSlug, attachmentId, open);
  const revoke = useRevokeAttachmentShareMutation(workspaceSlug, attachmentId);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button aria-label="Share attachment" size="icon-sm" variant="ghost"><Share2 /></Button></PopoverTrigger>
      <PopoverContent align="end" className="grid w-72 gap-3">
        <div><strong className="text-sm">Expiring share link</strong><p className="mt-1 text-xs leading-5 text-muted-foreground">Anyone with the link can download this file until it expires.</p></div>
        <Select value={lifetime} onValueChange={setLifetime}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{lifetimeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>
        <Button disabled={share.isPending} size="sm" onClick={() => share.mutate({ attachmentId, lifetimeSeconds: Number(lifetime) }, { onSuccess: async (result) => { await navigator.clipboard.writeText(result.url); toast.success("Share link copied"); } })}>{share.isPending ? <LoaderCircle className="animate-spin" /> : <Share2 />}Create and copy link</Button>
        {links.data?.length ? <div className="border-t pt-2"><p className="mb-1 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">Existing links</p>{links.data.map((link) => <div className="flex items-center gap-2 py-1 text-xs" key={link.id}><span className="min-w-0 flex-1 truncate">{link.revokedAt ? "Revoked" : new Date(link.expiresAt) <= new Date() ? "Expired" : `Expires ${new Date(link.expiresAt).toLocaleDateString()}`} · {link.accessCount} uses</span>{!link.revokedAt && new Date(link.expiresAt) > new Date() ? <Button disabled={revoke.isPending} size="sm" variant="ghost" onClick={() => revoke.mutate(link.id, { onSuccess: () => toast.success("Share link revoked") })}>Revoke</Button> : null}</div>)}</div> : null}
        {share.error ? <p className="text-xs text-destructive">{share.error.message}</p> : null}
      </PopoverContent>
    </Popover>
  );
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}
