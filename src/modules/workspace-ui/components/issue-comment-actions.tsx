"use client";

import { Ellipsis, LoaderCircle, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useDeleteIssueCommentMutation, useUpdateIssueCommentMutation } from "@/modules/workspace-ui/application/use-issue-comment-queries";

export function IssueCommentActions({
  body,
  canDelete,
  canEdit,
  commentId,
  issueId,
  workspaceSlug,
}: {
  body: string;
  canDelete: boolean;
  canEdit: boolean;
  commentId: string;
  issueId: string;
  workspaceSlug: string;
}) {
  const update = useUpdateIssueCommentMutation(workspaceSlug, issueId);
  const deletion = useDeleteIssueCommentMutation(workspaceSlug, issueId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [draft, setDraft] = useState(body);

  if (!canEdit && !canDelete) return null;

  const beginEdit = () => {
    setDraft(body);
    setMenuOpen(false);
    setEditOpen(true);
  };
  const save = () => {
    const value = draft.trim();
    if (!value || value === body) return;
    update.mutate({ commentId, body: value }, {
      onSuccess: () => {
        setEditOpen(false);
        toast.success("Comment updated");
      },
      onError: (error) => toast.error(error.message),
    });
  };
  const remove = () => deletion.mutate(commentId, {
    onSuccess: () => {
      setDeleteOpen(false);
      toast.success("Comment deleted");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <Button aria-label="Comment actions" className="-mr-1 ml-auto shrink-0 text-muted-foreground opacity-100 hover:text-foreground sm:opacity-0 sm:group-hover/comment:opacity-100 sm:focus-visible:opacity-100 data-[state=open]:opacity-100" size="icon-xs" variant="ghost"><Ellipsis /></Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-40">
          {canEdit ? <button className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-sm hover:bg-accent" type="button" onClick={beginEdit}><Pencil className="size-3.5" />Edit comment</button> : null}
          {canDelete ? <button className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-sm text-destructive hover:bg-destructive/10" type="button" onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}><Trash2 className="size-3.5" />Delete comment</button> : null}
        </PopoverContent>
      </Popover>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit comment</DialogTitle><DialogDescription>Update the text of your comment.</DialogDescription></DialogHeader>
          <Textarea autoFocus className="min-h-32 resize-y" maxLength={20_000} value={draft} onChange={(event) => setDraft(event.target.value)} />
          <DialogFooter>
            <Button disabled={update.isPending} variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button disabled={update.isPending || !draft.trim() || draft.trim() === body} onClick={save}>{update.isPending ? <LoaderCircle className="animate-spin" /> : <Pencil />}Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete comment?</DialogTitle><DialogDescription>This action cannot be undone. Attached files in this comment will also be deleted.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button disabled={deletion.isPending} variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button disabled={deletion.isPending} variant="destructive" onClick={remove}>{deletion.isPending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}Delete comment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
