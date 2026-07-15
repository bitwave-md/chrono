"use client";

import {
  Building2,
  Columns3,
  FolderKanban,
  List,
  PanelLeft,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { useMemo, useRef } from "react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { gsap, useGSAP } from "@/modules/workspace-ui/application/workspace-animation";
import type { ClientRecord, ProjectNode, TeamRecord } from "@/modules/workspace-ui/domain/workspace-types";

interface WorkspaceCommand {
  id: string;
  label: string;
  group: "Actions" | "Clients" | "Projects" | "Teams";
  keywords: string;
  shortcut?: string;
  Icon: typeof Search;
  action: () => void;
}

interface CommandMenuProps {
  open: boolean;
  clients: ClientRecord[];
  projects: ProjectNode[];
  teams: TeamRecord[];
  onOpenChange: (open: boolean) => void;
  onOpenCreate: () => void;
  onSelectClient: (clientId: string) => void;
  onSelectProject: (projectId: string) => void;
  onSelectTeam: (teamId: string) => void;
  onSetList: () => void;
  onSetBoard: () => void;
  onToggleSidebar: () => void;
}

const groups: WorkspaceCommand["group"][] = ["Actions", "Clients", "Projects", "Teams"];

export function CommandMenu(props: CommandMenuProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const commands = useMemo<WorkspaceCommand[]>(
    () => [
      { id: "create-issue", label: "Create issue", group: "Actions", keywords: "new add task", shortcut: "C", Icon: Plus, action: props.onOpenCreate },
      { id: "view-list", label: "Switch to list view", group: "Actions", keywords: "view issues rows", shortcut: "1", Icon: List, action: props.onSetList },
      { id: "view-board", label: "Switch to board view", group: "Actions", keywords: "kanban columns", shortcut: "2", Icon: Columns3, action: props.onSetBoard },
      { id: "toggle-sidebar", label: "Toggle navigation", group: "Actions", keywords: "sidebar collapse", shortcut: "[", Icon: PanelLeft, action: props.onToggleSidebar },
      ...props.clients.map((client) => ({ id: `client-${client.id}`, label: client.name, group: "Clients" as const, keywords: `${client.key} client`, Icon: Building2, action: () => props.onSelectClient(client.id) })),
      ...props.projects.map((project) => ({ id: `project-${project.id}`, label: project.name, group: "Projects" as const, keywords: `${project.kind} ${project.slug}`, Icon: FolderKanban, action: () => props.onSelectProject(project.id) })),
      ...props.teams.map((team) => ({ id: `team-${team.id}`, label: team.name, group: "Teams" as const, keywords: `${team.key} team`, Icon: Users, action: () => props.onSelectTeam(team.id) })),
    ],
    [props],
  );

  useGSAP(
    () => {
      if (props.open) {
        gsap.fromTo(contentRef.current, { opacity: 0, y: -14, scale: 0.985 }, { opacity: 1, y: 0, scale: 1, duration: 0.18, ease: "power2.out" });
      }
    },
    { dependencies: [props.open], revertOnUpdate: true },
  );

  const run = (command: WorkspaceCommand) => {
    command.action();
    props.onOpenChange(false);
  };

  return (
    <CommandDialog
      className="command-menu left-0 top-[12vh] translate-x-0 translate-y-0 gap-0 sm:max-w-[570px]"
      open={props.open}
      onOpenChange={props.onOpenChange}
    >
      <div ref={contentRef}>
        <Command loop>
          <CommandInput autoFocus placeholder="Type a command or search…" />
          <CommandList>
            <CommandEmpty>No matching commands</CommandEmpty>
            {groups.map((group) => {
              const groupCommands = commands.filter((command) => command.group === group);
              return groupCommands.length ? (
                <CommandGroup heading={group} key={group}>
                  {groupCommands.map((command) => (
                    <CommandItem
                      key={command.id}
                      value={`${command.label} ${command.keywords}`}
                      onSelect={() => run(command)}
                    >
                      <command.Icon />
                      <span>{command.label}</span>
                      {command.shortcut ? (
                        <CommandShortcut><Kbd>{command.shortcut}</Kbd></CommandShortcut>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null;
            })}
          </CommandList>
          <footer className="command-footer">
            <span>↑↓ navigate</span><span>↵ select</span><span>esc close</span>
          </footer>
        </Command>
      </div>
    </CommandDialog>
  );
}
