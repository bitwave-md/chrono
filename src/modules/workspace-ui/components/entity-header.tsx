"use client";

import { ChevronRight, Copy, ExternalLink, LoaderCircle, MoreHorizontal, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useDeleteEntityMutation } from "@/modules/workspace-ui/application/use-delete-entity-mutation";
import { useFavoritesQuery, useSetFavoriteMutation } from "@/modules/workspace-ui/application/use-favorite-queries";
import { deletedEntityParentPath } from "@/modules/workspace-ui/domain/favorite-target";
import type { FavoriteRecord } from "@/modules/workspace-ui/domain/workspace-types";

export interface EntityBreadcrumb {
  label: string;
  href: string;
  icon?: ReactNode;
}

export function EntityHeader({
  workspaceSlug,
  breadcrumbs = [],
  icon,
  title,
  favoriteTarget,
  allowDelete = false,
  children,
}: {
  workspaceSlug: string;
  breadcrumbs?: EntityBreadcrumb[];
  icon: ReactNode;
  title: string;
  favoriteTarget: FavoriteRecord;
  allowDelete?: boolean;
  children?: ReactNode;
}) {
  const favorites = useFavoritesQuery(workspaceSlug);
  const toggle = useSetFavoriteMutation(workspaceSlug);
  const selected = favorites.data?.some((item) => (
    item.targetType === favoriteTarget.targetType
    && item.targetId === favoriteTarget.targetId
  )) ?? false;

  return (
    <header className="shrink-0">
      <div className="flex h-14 min-w-0 items-center gap-1.5 border-b px-4">
        <SidebarTrigger className="mr-1 text-muted-foreground" />
        {breadcrumbs.map((item) => (
          <span className="contents" key={`${item.href}:${item.label}`}>
            <Link className="flex min-w-0 shrink items-center gap-2 rounded-sm text-xs font-medium text-foreground/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={item.href}>
              {item.icon}
              <span className="max-w-44 truncate">{item.label}</span>
            </Link>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground/65" />
          </span>
        ))}
        {icon}
        <span className="min-w-0 truncate text-sm font-medium text-foreground">{title}</span>
        <Button
          aria-label={selected ? "Remove from favorites" : "Add to favorites"}
          className="ml-1 shrink-0 text-muted-foreground hover:text-foreground"
          disabled={toggle.isPending}
          size="icon-sm"
          variant="ghost"
          onClick={() => toggle.mutate({ favorite: !selected, target: favoriteTarget })}
        >
          <Star className={cn("size-5", selected && "fill-amber-400 text-amber-400")} />
        </Button>
        <EntityActionsMenu allowDelete={allowDelete} target={favoriteTarget} workspaceSlug={workspaceSlug} />
      </div>
      {children}
    </header>
  );
}

function EntityActionsMenu({
  allowDelete,
  target,
  workspaceSlug,
}: {
  allowDelete: boolean;
  target: FavoriteRecord;
  workspaceSlug: string;
}) {
  const router = useRouter();
  const deletion = useDeleteEntityMutation(workspaceSlug);
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const entityLabel = target.targetType[0]!.toUpperCase() + target.targetType.slice(1);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
      setOpen(false);
    } catch {
      toast.error("The link could not be copied.");
    }
  };
  const openInNewTab = () => {
    window.open(window.location.href, "_blank", "noopener,noreferrer");
    setOpen(false);
  };
  const deleteEntity = () => deletion.mutate(target, {
    onSuccess: () => {
      toast.success(`${entityLabel} deleted`);
      setDeleteOpen(false);
      router.push(deletedEntityParentPath(workspaceSlug, target));
    },
  });

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button aria-label="Actions" className="shrink-0 text-muted-foreground hover:text-foreground" size="icon-sm" variant="ghost"><MoreHorizontal className="size-5" /></Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-52 p-1">
          <button className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-sm hover:bg-accent" type="button" onClick={copyLink}><Copy className="size-4" />Copy link</button>
          <button className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-sm hover:bg-accent" type="button" onClick={openInNewTab}><ExternalLink className="size-4" />Open in new tab</button>
          {allowDelete ? <button className="mt-1 flex h-8 w-full items-center gap-2 border-t border-border px-2 pt-1 text-sm text-destructive hover:bg-destructive/10" type="button" onClick={() => { setOpen(false); setDeleteOpen(true); }}><Trash2 className="size-4" />Delete {target.targetType}</button> : null}
        </PopoverContent>
      </Popover>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {target.title}?</DialogTitle>
            <DialogDescription>This removes the {target.targetType} from active workspace views. Historical time entries remain available for reporting.</DialogDescription>
          </DialogHeader>
          {deletion.error ? <p className="text-sm text-destructive">{deletion.error.message}</p> : null}
          <DialogFooter>
            <Button disabled={deletion.isPending} variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button disabled={deletion.isPending} variant="destructive" onClick={deleteEntity}>{deletion.isPending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}Delete {entityLabel}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
