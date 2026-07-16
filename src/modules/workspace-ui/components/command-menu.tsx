"use client";

import { Building2, FolderKanban, Inbox, ListTodo, PanelLeft, Plus, Search } from "lucide-react";
import { useMemo, useRef } from "react";

import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { gsap, useGSAP } from "@/modules/workspace-ui/application/workspace-animation";
import type { ClientRecord, ProjectRecord } from "@/modules/workspace-ui/domain/workspace-types";

interface WorkspaceCommand {
  id: string;
  label: string;
  group: "Actions" | "Navigation" | "Clients" | "Projects";
  keywords: string;
  shortcut?: string;
  Icon: typeof Search;
  action: () => void;
}

interface CommandMenuProps {
  open: boolean;
  clients: ClientRecord[];
  projects: ProjectRecord[];
  onOpenChange: (open: boolean) => void;
  onOpenCreate: () => void;
  onNavigate: (path: string) => void;
  onToggleSidebar: () => void;
  workspaceRoot: string;
}

const groups: WorkspaceCommand["group"][] = ["Actions", "Navigation", "Clients", "Projects"];

export function CommandMenu(props: CommandMenuProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const commands = useMemo<WorkspaceCommand[]>(() => [
    { id: "create-issue", label: "Create issue", group: "Actions", keywords: "new add task", shortcut: "C", Icon: Plus, action: props.onOpenCreate },
    { id: "toggle-sidebar", label: "Toggle navigation", group: "Actions", keywords: "sidebar collapse", shortcut: "[", Icon: PanelLeft, action: props.onToggleSidebar },
    { id: "inbox", label: "Inbox", group: "Navigation", keywords: "inbox", Icon: Inbox, action: () => props.onNavigate(`${props.workspaceRoot}/inbox`) },
    { id: "my-issues", label: "My Issues", group: "Navigation", keywords: "assigned issues", Icon: ListTodo, action: () => props.onNavigate(`${props.workspaceRoot}/my-issues`) },
    ...props.clients.map((client) => ({ id: `client-${client.id}`, label: client.name, group: "Clients" as const, keywords: `${client.key} client`, Icon: Building2, action: () => props.onNavigate(`${props.workspaceRoot}/clients/${client.id}/home`) })),
    ...props.projects.map((project) => ({ id: `project-${project.id}`, label: project.name, group: "Projects" as const, keywords: project.slug, Icon: FolderKanban, action: () => props.onNavigate(`${props.workspaceRoot}/projects/${project.id}/overview`) })),
  ], [props]);

  useGSAP(() => {
    if (props.open) {
      gsap.fromTo(contentRef.current, { opacity: 0, y: -14, scale: 0.985 }, { opacity: 1, y: 0, scale: 1, duration: 0.18, ease: "power2.out" });
    }
  }, { dependencies: [props.open], revertOnUpdate: true });

  const run = (command: WorkspaceCommand) => {
    command.action();
    props.onOpenChange(false);
  };

  return (
    <CommandDialog className="top-[12svh] translate-y-0 gap-0 border-border p-0 shadow-2xl will-change-transform sm:max-w-xl max-md:top-[7svh]" open={props.open} onOpenChange={props.onOpenChange}>
      <div ref={contentRef}>
        <Command loop>
          <CommandInput autoFocus placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No matching commands</CommandEmpty>
            {groups.map((group) => {
              const items = commands.filter((command) => command.group === group);
              return items.length ? (
                <CommandGroup heading={group} key={group}>
                  {items.map((command) => (
                    <CommandItem key={command.id} value={`${command.label} ${command.keywords}`} onSelect={() => run(command)}>
                      <command.Icon /><span>{command.label}</span>
                      {command.shortcut ? <CommandShortcut><Kbd>{command.shortcut}</Kbd></CommandShortcut> : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null;
            })}
          </CommandList>
        </Command>
      </div>
    </CommandDialog>
  );
}
