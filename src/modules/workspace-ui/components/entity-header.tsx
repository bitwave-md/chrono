"use client";

import { Copy, ExternalLink, MoreHorizontal, Star } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useFavoritesQuery, useSetFavoriteMutation } from "@/modules/workspace-ui/application/use-favorite-queries";
import type { FavoriteRecord } from "@/modules/workspace-ui/domain/workspace-types";

export interface EntityBreadcrumb {
  label: string;
  href: string;
}

export function EntityHeader({
  workspaceSlug,
  breadcrumbs = [],
  icon,
  title,
  favoriteTarget,
  children,
}: {
  workspaceSlug: string;
  breadcrumbs?: EntityBreadcrumb[];
  icon: ReactNode;
  title: string;
  favoriteTarget: FavoriteRecord;
  children?: ReactNode;
}) {
  const favorites = useFavoritesQuery(workspaceSlug);
  const toggle = useSetFavoriteMutation(workspaceSlug);
  const selected = favorites.data?.some((item) => (
    item.targetType === favoriteTarget.targetType
    && item.targetId === favoriteTarget.targetId
  )) ?? false;

  return (
    <header>
      <div className="flex h-12 min-w-0 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        {breadcrumbs.map((item) => (
          <span className="contents" key={`${item.href}:${item.label}`}>
            <Link className="max-w-40 truncate text-xs text-muted-foreground hover:text-foreground" href={item.href}>{item.label}</Link>
            <span className="text-xs text-muted-foreground/50">/</span>
          </span>
        ))}
        {icon}
        <span className="min-w-0 truncate text-sm font-medium">{title}</span>
        <Button
          aria-label={selected ? "Remove from favorites" : "Add to favorites"}
          className="shrink-0"
          disabled={toggle.isPending}
          size="icon-sm"
          variant="ghost"
          onClick={() => toggle.mutate({ favorite: !selected, target: favoriteTarget })}
        >
          <Star className={cn(selected && "fill-amber-400 text-amber-400")} />
        </Button>
        <EntityActionsMenu />
      </div>
      {children}
    </header>
  );
}

function EntityActionsMenu() {
  const [open, setOpen] = useState(false);
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button aria-label="Actions" className="shrink-0" size="icon-sm" variant="ghost"><MoreHorizontal /></Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1">
        <button className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-sm hover:bg-accent" type="button" onClick={copyLink}><Copy className="size-4" />Copy link</button>
        <button className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-sm hover:bg-accent" type="button" onClick={openInNewTab}><ExternalLink className="size-4" />Open in new tab</button>
      </PopoverContent>
    </Popover>
  );
}
