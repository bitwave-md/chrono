"use client";

import { formatDistanceToNowStrict } from "date-fns";
import {
  CalendarDays,
  CircleCheck,
  CircleDot,
  Eye,
  FileText,
  LoaderCircle,
  Palette,
  Pencil,
  Save,
  Signal,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useEditProjectUpdateMutation,
  useProjectActivityQuery,
  usePublishProjectUpdateMutation,
} from "@/modules/workspace-ui/application/use-project-detail-queries";
import { OptionProperty } from "@/modules/workspace-ui/components/option-property";
import type {
  ProjectActivityRecord,
  ProjectDetailRecord,
  ProjectUpdateRecord,
} from "@/modules/workspace-ui/domain/workspace-types";
import { useWorkspaceIdentity } from "@/modules/workspace-ui/state/workspace-ui-provider";

const healthOptions = [
  { value: "on_track", label: "On track", color: "#22c55e" },
  { value: "at_risk", label: "At risk", color: "#f59e0b" },
  { value: "off_track", label: "Off track", color: "#ef4444" },
];

type ProjectEvent = ProjectActivityRecord["events"][number];
type ActivityEntry =
  | { kind: "update"; date: string; item: ProjectUpdateRecord }
  | { kind: "event"; date: string; item: ProjectEvent };

interface ActivityChange {
  field: string;
  from?: string | null;
  to?: string | null;
}

export function ProjectActivity({ project, workspaceSlug }: { project: ProjectDetailRecord; workspaceSlug: string }) {
  const workspace = useWorkspaceIdentity();
  const activityQuery = useProjectActivityQuery(workspaceSlug, project.id);
  const publish = usePublishProjectUpdateMutation(workspaceSlug, project.id);
  const [body, setBody] = useState("");
  const [health, setHealth] = useState<string | null>(project.latestUpdate?.health ?? "on_track");
  const [progress, setProgress] = useState(project.progress.percentage.toString());
  const activity = useMemo(
    () => activityEntries(activityQuery.data),
    [activityQuery.data],
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;
    publish.mutate({
      body: body.trim(),
      health: workspace.role === "guest" ? null : health,
      progress: workspace.role === "guest" ? null : Number(progress),
    }, { onSuccess: () => setBody("") });
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-7">
      <form className="border-b pb-6" onSubmit={submit}>
        <Textarea maxLength={20_000} placeholder="Write a project update..." rows={5} value={body} onChange={(event) => setBody(event.target.value)} />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {workspace.role !== "guest" ? <>
            <OptionProperty icon={CircleDot} label="Health" options={healthOptions} placeholder="Health" value={health} onChange={setHealth} />
            <Input className="h-8 w-20" max={100} min={0} type="number" value={progress} onChange={(event) => setProgress(event.target.value)} />
          </> : null}
          <Button className="ml-auto" disabled={publish.isPending || !body.trim()} size="sm" type="submit">
            {publish.isPending ? <LoaderCircle className="animate-spin" /> : null}Publish update
          </Button>
        </div>
      </form>
      <div className="mt-6 grid gap-2">
        {activity.map((entry) => entry.kind === "update"
          ? <ProjectUpdateItem item={entry.item} key={`update-${entry.item.id}`} projectId={project.id} workspaceSlug={workspaceSlug} />
          : <ProjectEventItem event={entry.item} key={`event-${entry.item.id}`} />)}
        {!activityQuery.isLoading && !activity.length ? (
          <div className="flex min-h-24 items-center justify-center text-sm text-muted-foreground">No activity yet.</div>
        ) : null}
      </div>
    </div>
  );
}

function ProjectEventItem({ event }: { event: ProjectEvent }) {
  const presentation = eventPresentation(event);
  const Icon = presentation.icon;
  const name = event.actorName ?? event.actorEmail ?? "System";
  return (
    <article className="flex min-h-8 items-center gap-2.5 px-2 text-xs text-muted-foreground">
      <Avatar className="size-5 shrink-0">
        <AvatarImage alt="" src={event.actorAvatarUrl ?? undefined} />
        <AvatarFallback className="bg-transparent"><Icon className="size-4" /></AvatarFallback>
      </Avatar>
      <p className="min-w-0 flex-1">
        <span className="font-medium text-foreground/75">{name}</span> {presentation.text}{" "}
        <span className="whitespace-nowrap">· {relativeTime(event.createdAt)}</span>
      </p>
    </article>
  );
}

function ProjectUpdateItem({ item, projectId, workspaceSlug }: { item: ProjectUpdateRecord; projectId: string; workspaceSlug: string }) {
  const workspace = useWorkspaceIdentity();
  const edit = useEditProjectUpdateMutation(workspaceSlug, projectId);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(item.body);
  const canEdit = workspace.role !== "guest" || item.authorEmail === workspace.userEmail;
  return (
    <article className="group/update my-2 rounded-lg border bg-card/45 p-4">
      <div className="flex items-center gap-2">
        <Avatar className="size-6"><AvatarImage alt="" src={item.authorAvatarUrl ?? undefined} /><AvatarFallback className="text-[0.55rem]">{initials(item.authorName ?? item.authorEmail)}</AvatarFallback></Avatar>
        <strong className="text-sm font-medium">{item.authorName ?? item.authorEmail}</strong>
        <span className="text-xs text-muted-foreground">{relativeTime(item.createdAt)}</span>
        {canEdit && !editing ? <Button aria-label="Edit update" className="ml-auto opacity-0 group-hover/update:opacity-100 focus-visible:opacity-100" size="icon-sm" type="button" variant="ghost" onClick={() => setEditing(true)}><Pencil /></Button> : null}
      </div>
      {editing ? (
        <div className="mt-3 grid gap-2">
          <Textarea maxLength={20_000} value={body} onChange={(event) => setBody(event.target.value)} />
          <div className="flex justify-end gap-1">
            <Button size="sm" type="button" variant="ghost" onClick={() => { setBody(item.body); setEditing(false); }}><X />Cancel</Button>
            <Button disabled={edit.isPending || !body.trim()} size="sm" type="button" onClick={() => edit.mutate({ updateId: item.id, body: body.trim() }, { onSuccess: () => setEditing(false) })}><Save />Save</Button>
          </div>
          {edit.error ? <p className="text-xs text-destructive">{edit.error.message}</p> : null}
        </div>
      ) : <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{item.body}</p>}
      <div className="mt-3 flex items-center gap-2">
        {item.health ? <Badge variant="outline">{humanize(item.health)}</Badge> : null}
        {item.progress !== null ? <span className="text-xs tabular-nums text-muted-foreground">{item.progress}% complete</span> : null}
      </div>
    </article>
  );
}

function activityEntries(data: ProjectActivityRecord | undefined): ActivityEntry[] {
  if (!data) return [];
  const ordered: ActivityEntry[] = [
    ...data.updates.map((item) => ({ kind: "update" as const, date: item.createdAt, item })),
    ...data.events.map((item) => ({ kind: "event" as const, date: item.createdAt, item })),
  ].sort((left, right) => left.date.localeCompare(right.date));

  return ordered.reduce<ActivityEntry[]>((result, entry) => {
    const previous = result.at(-1);
    if (
      entry.kind === "event"
      && previous?.kind === "event"
      && sameRapidEvent(previous.item, entry.item)
    ) {
      result[result.length - 1] = entry;
    } else {
      result.push(entry);
    }
    return result;
  }, []);
}

function sameRapidEvent(left: ProjectEvent, right: ProjectEvent): boolean {
  const elapsed = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  return elapsed <= 60_000
    && left.actorEmail === right.actorEmail
    && eventPresentation(left).dedupeKey === eventPresentation(right).dedupeKey;
}

function eventPresentation(event: ProjectEvent): { icon: LucideIcon; text: string; dedupeKey: string } {
  const changes = eventChanges(event);
  if (!changes.length) return { icon: CircleDot, text: "updated the project", dedupeKey: event.eventType };
  if (changes.length > 1) {
    const labels = changes.map((change) => fieldLabel(change.field));
    return { icon: CircleDot, text: `updated ${joinList(labels)}`, dedupeKey: labels.join("|") };
  }

  const change = changes[0];
  const text = changeText(change);
  return { icon: fieldIcon(change.field), text, dedupeKey: `${change.field}:${text}` };
}

function eventChanges(event: ProjectEvent): ActivityChange[] {
  if (Array.isArray(event.payload.changes)) {
    return event.payload.changes.filter(isActivityChange);
  }
  const fields: ActivityChange[] = [];
  const legacy = event.payload;
  for (const [key, field] of [
    ["state", "state"], ["priority", "priority"], ["leadMembershipId", "lead"],
    ["summary", "summary"], ["description", "description"], ["visibility", "visibility"],
    ["startDate", "startDate"], ["targetDate", "targetDate"],
    ["assigneeMembershipIds", "assignees"],
  ] as const) {
    if (key in legacy) fields.push({ field, to: scalarValue(legacy[key]) });
  }
  if (["iconType", "iconKey", "iconColor"].some((key) => key in legacy)) fields.push({ field: "icon" });
  return fields;
}

function isActivityChange(value: unknown): value is ActivityChange {
  return Boolean(value && typeof value === "object" && "field" in value && typeof value.field === "string");
}

function changeText(change: ActivityChange): string {
  const from = displayValue(change.field, change.from);
  const to = displayValue(change.field, change.to);
  if (change.field === "state") return from && to ? `moved from ${from} to ${to}` : `changed status to ${to ?? "None"}`;
  if (change.field === "priority") return from && to ? `changed priority from ${from} to ${to}` : `changed priority to ${to ?? "None"}`;
  if (change.field === "visibility") return from && to ? `changed visibility from ${from} to ${to}` : `changed visibility to ${to ?? "None"}`;
  if (change.field === "startDate" || change.field === "targetDate") {
    const label = fieldLabel(change.field);
    if (!change.to) return `removed the ${label}`;
    return from ? `changed the ${label} from ${from} to ${to}` : `set the ${label} to ${to}`;
  }
  return `updated the project ${fieldLabel(change.field)}`;
}

function fieldIcon(field: string): LucideIcon {
  if (field === "state") return CircleCheck;
  if (field === "priority") return Signal;
  if (field === "lead") return UserRound;
  if (field === "visibility") return Eye;
  if (field === "startDate" || field === "targetDate") return CalendarDays;
  if (field === "assignees") return UsersRound;
  if (field === "icon") return Palette;
  if (field === "summary" || field === "description") return FileText;
  return CircleDot;
}

function fieldLabel(field: string): string {
  const labels: Record<string, string> = {
    state: "status", priority: "priority", lead: "lead", summary: "summary",
    description: "description", visibility: "visibility", startDate: "start date",
    targetDate: "target date", assignees: "assignees", icon: "icon",
  };
  return labels[field] ?? humanize(field);
}

function displayValue(field: string, value: string | null | undefined): string | null {
  if (!value) return null;
  if (field === "startDate" || field === "targetDate") return new Date(value).toLocaleDateString();
  return humanize(value);
}

function scalarValue(value: unknown): string | null {
  return value === null || value === undefined || Array.isArray(value) ? null : String(value);
}

function joinList(values: string[]): string {
  return values.length < 2 ? values[0] ?? "project details" : `${values.slice(0, -1).join(", ")} and ${values.at(-1)}`;
}

function relativeTime(value: string): string {
  return formatDistanceToNowStrict(new Date(value), { addSuffix: true });
}

function humanize(value: string): string {
  const text = value.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function initials(value: string): string {
  return value.split(/\s+|@/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}
