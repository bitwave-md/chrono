"use client";

import { ArrowUp, FileText, LoaderCircle, Paperclip, X } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useDeleteAttachmentMutation, useUploadAttachmentMutation } from "@/modules/workspace-ui/application/use-attachment-queries";

export interface IssueCommentInput {
  body: string;
  parentCommentId?: string | null;
  attachmentIds?: string[];
}

interface PendingCommentAttachment {
  id: string;
  filename: string;
  sizeBytes: number;
}

export function IssueCommentComposer({
  issueId,
  parentCommentId = null,
  placeholder,
  workspaceSlug,
  onSubmit,
}: {
  issueId: string;
  parentCommentId?: string | null;
  placeholder: string;
  workspaceSlug: string;
  onSubmit: (input: IssueCommentInput) => Promise<unknown>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<PendingCommentAttachment[]>([]);
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const target = { targetType: "issue" as const, targetId: issueId };
  const upload = useUploadAttachmentMutation(workspaceSlug, target, setProgress, false);
  const deletion = useDeleteAttachmentMutation(workspaceSlug, target);
  const compact = Boolean(parentCommentId);

  const selectFiles = async (selected: FileList | null) => {
    if (!selected?.length) return;
    for (const file of Array.from(selected).slice(0, 10 - files.length)) {
      try {
        setProgress(0);
        const uploaded = await upload.mutateAsync(file);
        setFiles((current) => [...current, { id: uploaded.attachmentId, filename: file.name, sizeBytes: file.size }]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "The attachment could not be uploaded.");
        break;
      }
    }
    setProgress(0);
  };

  const removeFile = (attachment: PendingCommentAttachment) => {
    deletion.mutate(attachment.id, {
      onSuccess: () => setFiles((current) => current.filter((item) => item.id !== attachment.id)),
      onError: (error) => toast.error(error.message),
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if ((!body.trim() && !files.length) || upload.isPending || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ body: body.trim(), parentCommentId, attachmentIds: files.map((file) => file.id) });
      setBody("");
      setFiles([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The comment could not be posted.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={cn("overflow-hidden border bg-card/55", compact ? "border-x-0 border-b-0" : "rounded-lg")} onSubmit={submit}>
      <Textarea
        className={cn("resize-none border-0 bg-transparent px-4 shadow-none focus-visible:ring-0", compact ? "min-h-12 py-3 text-sm" : "min-h-24 py-4 leading-6")}
        maxLength={20_000}
        placeholder={placeholder}
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />
      {files.length ? <div className="grid gap-1 px-3 pb-2">
        {files.map((file) => <div className="flex min-w-0 items-center gap-2 rounded-md border bg-background/60 px-2 py-1.5 text-xs" key={file.id}>
          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">{file.filename}</span>
          <span className="shrink-0 text-muted-foreground">{formatBytes(file.sizeBytes)}</span>
          <Button aria-label={`Remove ${file.filename}`} disabled={deletion.isPending} size="icon-xs" type="button" variant="ghost" onClick={() => removeFile(file)}><X /></Button>
        </div>)}
      </div> : null}
      {upload.isPending ? <div className="mx-3 mb-2 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} /></div> : null}
      <div className="flex items-center justify-end gap-1 border-t px-2 py-1.5">
        <input className="hidden" multiple ref={inputRef} type="file" onChange={(event) => { void selectFiles(event.target.files); event.currentTarget.value = ""; }} />
        <Button aria-label="Attach files" disabled={upload.isPending || files.length >= 10} size="icon-xs" type="button" variant="ghost" onClick={() => inputRef.current?.click()}><Paperclip /></Button>
        <Button aria-label={compact ? "Post reply" : "Post comment"} className="rounded-full" disabled={(!body.trim() && !files.length) || upload.isPending || submitting} size="icon-xs" type="submit">
          {submitting ? <LoaderCircle className="animate-spin" /> : <ArrowUp />}
        </Button>
      </div>
    </form>
  );
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}
