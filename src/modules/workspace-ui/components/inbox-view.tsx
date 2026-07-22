"use client";

import { ArrowLeft, CheckCheck, Filter, Inbox as InboxIcon, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useInboxQuery, useMarkInboxReadMutation, useUpdateInboxNotificationMutation } from "@/modules/workspace-ui/application/use-inbox-queries";
import { EmptyView } from "@/modules/workspace-ui/components/empty-view";
import { IssueDetailView } from "@/modules/workspace-ui/components/issue-detail-view";
import { WorkflowStatusIcon } from "@/modules/workspace-ui/components/issue-property-picker-content";
import type { InboxNotificationRecord } from "@/modules/workspace-ui/domain/workspace-types";

export function InboxView({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const inbox = useInboxQuery(workspaceSlug);
  const update = useUpdateInboxNotificationMutation(workspaceSlug);
  const markAllRead = useMarkInboxReadMutation(workspaceSlug);
  const allNotifications = inbox.data ?? [];
  const notifications = unreadOnly
    ? allNotifications.filter((item) => !item.readAt)
    : allNotifications;
  const selectedId = searchParams.get("notification");
  const selected = allNotifications.find((item) => item.id === selectedId)
    ?? (!selectedId ? notifications[0] : undefined);
  const unreadCount = allNotifications.filter((item) => !item.readAt).length;

  const select = (notification: InboxNotificationRecord) => {
    const parameters = new URLSearchParams(searchParams);
    parameters.set("notification", notification.id);
    router.replace(`${pathname}?${parameters.toString()}`);
    if (!notification.readAt) update.mutate({ id: notification.id, action: "read" });
  };

  const dismiss = (notification: InboxNotificationRecord) => {
    update.mutate({ id: notification.id, action: "dismiss" });
    if (selectedId === notification.id) router.replace(pathname);
  };

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[380px_minmax(0,1fr)] max-lg:grid-cols-1">
      <section className={cn("min-h-0 border-r max-lg:border-r-0", selectedId && "max-lg:hidden")}>
        <header className="flex h-12 items-center gap-2 border-b px-3">
          <SidebarTrigger className="text-muted-foreground" />
          <h1 className="text-sm font-semibold">Inbox</h1>
          {unreadCount ? <span className="text-xs tabular-nums text-muted-foreground">{unreadCount}</span> : null}
          <div className="ml-auto flex items-center gap-0.5">
            <Button aria-label={unreadOnly ? "Show all notifications" : "Show unread only"} size="icon-sm" variant={unreadOnly ? "secondary" : "ghost"} onClick={() => setUnreadOnly((value) => !value)}><Filter /></Button>
            <Button aria-label="Mark all as read" disabled={!unreadCount || markAllRead.isPending} size="icon-sm" variant="ghost" onClick={() => markAllRead.mutate()}><CheckCheck /></Button>
          </div>
        </header>

        <div className="h-[calc(100%-3rem)] overflow-y-auto p-2">
          {inbox.isLoading ? <p className="p-4 text-sm text-muted-foreground">Loading notifications...</p> : null}
          {inbox.error ? <p className="p-4 text-sm text-destructive">{inbox.error.message}</p> : null}
          {!inbox.isLoading && !inbox.error && !notifications.length ? (
            <EmptyView
              className="min-h-[calc(100svh-7rem)]"
              description={unreadOnly ? "You have reviewed every notification." : "Updates to Issues you created or are assigned to will appear here when someone else makes them."}
              icon={InboxIcon}
              title={unreadOnly ? "No unread notifications" : "Your Inbox is clear"}
            />
          ) : null}
          {notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              selected={notification.id === selected?.id}
              onDismiss={() => dismiss(notification)}
              onSelect={() => select(notification)}
            />
          ))}
        </div>
      </section>

      <section className={cn("min-h-0", !selectedId && "max-lg:hidden")}>
        {selected ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="hidden h-11 shrink-0 items-center border-b px-3 max-lg:flex">
              <Button size="sm" variant="ghost" onClick={() => router.replace(pathname)}><ArrowLeft />Inbox</Button>
            </div>
            <IssueDetailView embedded issueId={selected.issueId} workspaceSlug={workspaceSlug} />
          </div>
        ) : (
          <EmptyView className="min-h-full" description="Choose an update from the Inbox to review its Issue." icon={InboxIcon} title="Select a notification" />
        )}
      </section>
    </div>
  );
}

function NotificationRow({ notification, selected, onDismiss, onSelect }: {
  notification: InboxNotificationRecord;
  selected: boolean;
  onDismiss: () => void;
  onSelect: () => void;
}) {
  const actor = notification.actorName ?? notification.actorEmail;
  return (
    <article className={cn("group/notification relative mb-0.5 flex cursor-pointer gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-accent/45", selected && "bg-accent/65")} tabIndex={0} onClick={onSelect} onKeyDown={(event) => { if (event.key === "Enter") onSelect(); }}>
      <div className="relative mt-0.5 shrink-0">
        <Avatar className="size-8"><AvatarImage alt="" src={notification.actorAvatarUrl ?? undefined} /><AvatarFallback className="text-[0.6rem]">{actor.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
        <span className="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full bg-background">
          <WorkflowStatusIcon category={notification.statusCategory} className="size-3.5" color={notification.statusColor} />
        </span>
      </div>
      <div className="min-w-0 flex-1 pr-7">
        <div className="flex items-center gap-1.5">
          {!notification.readAt ? <span className="size-1.5 shrink-0 rounded-full bg-blue-500" /> : null}
          <strong className="truncate text-xs font-medium">{notification.identifier} {notification.issueTitle}</strong>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">{notificationDescription(notification, actor)}</p>
        <p className="mt-1 text-[0.65rem] text-muted-foreground/75">{formatDistanceToNowStrict(new Date(notification.createdAt), { addSuffix: true })}</p>
      </div>
      <Button aria-label="Dismiss notification" className="absolute top-2.5 right-2 opacity-0 group-hover/notification:opacity-100 focus-visible:opacity-100" size="icon-xs" variant="ghost" onClick={(event) => { event.stopPropagation(); onDismiss(); }}><X /></Button>
    </article>
  );
}

function notificationDescription(notification: InboxNotificationRecord, actor: string): string {
  if (notification.kind === "assigned") return `${actor} assigned this Issue to you`;
  if (notification.kind === "status_changed") return `${actor} moved this Issue to ${notification.detail ?? notification.statusName}`;
  return `${actor} commented${notification.detail ? `: ${notification.detail}` : ""}`;
}
