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
  X,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMemo, useRef, useState } from "react";

import {
  gsap,
  useGSAP,
} from "@/modules/workspace-ui/application/workspace-animation";
import type {
  ClientRecord,
  ProjectNode,
  TeamRecord,
} from "@/modules/workspace-ui/domain/workspace-types";

interface Command {
  id: string;
  label: string;
  group: string;
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

export function CommandMenu(props: CommandMenuProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const run = (action: () => void) => {
    action();
    props.onOpenChange(false);
    setQuery("");
  };
  const commands = useMemo<Command[]>(
    () => [
      {
        id: "create-issue",
        label: "Create issue",
        group: "Actions",
        keywords: "new add task",
        shortcut: "C",
        Icon: Plus,
        action: props.onOpenCreate,
      },
      {
        id: "view-list",
        label: "Switch to list view",
        group: "Actions",
        keywords: "view issues rows",
        shortcut: "1",
        Icon: List,
        action: props.onSetList,
      },
      {
        id: "view-board",
        label: "Switch to board view",
        group: "Actions",
        keywords: "kanban columns",
        shortcut: "2",
        Icon: Columns3,
        action: props.onSetBoard,
      },
      {
        id: "toggle-sidebar",
        label: "Toggle navigation",
        group: "Actions",
        keywords: "sidebar collapse",
        shortcut: "[",
        Icon: PanelLeft,
        action: props.onToggleSidebar,
      },
      ...props.clients.map((client) => ({
        id: `client-${client.id}`,
        label: client.name,
        group: "Clients",
        keywords: `${client.key} client`,
        Icon: Building2,
        action: () => props.onSelectClient(client.id),
      })),
      ...props.projects.map((project) => ({
        id: `project-${project.id}`,
        label: project.name,
        group: "Projects",
        keywords: `${project.kind} ${project.slug}`,
        Icon: FolderKanban,
        action: () => props.onSelectProject(project.id),
      })),
      ...props.teams.map((team) => ({
        id: `team-${team.id}`,
        label: team.name,
        group: "Teams",
        keywords: `${team.key} team`,
        Icon: Users,
        action: () => props.onSelectTeam(team.id),
      })),
    ],
    [props],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const visibleCommands = commands.filter((command) =>
    `${command.label} ${command.keywords}`.toLowerCase().includes(normalizedQuery),
  );
  const focusCommand = (index: number) => {
    const items = contentRef.current?.querySelectorAll<HTMLButtonElement>(
      ".command-item",
    );
    items?.[Math.max(0, Math.min(index, items.length - 1))]?.focus();
  };

  useGSAP(
    () => {
      if (props.open) {
        gsap.fromTo(
          contentRef.current,
          { opacity: 0, y: -14, scale: 0.985 },
          { opacity: 1, y: 0, scale: 1, duration: 0.18, ease: "power2.out" },
        );
      }
    },
    { dependencies: [props.open], revertOnUpdate: true },
  );

  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay command-overlay" />
        <Dialog.Content className="command-menu" ref={contentRef}>
          <Dialog.Title className="sr-only">Command menu</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search navigation and workspace actions
          </Dialog.Description>
          <div className="command-search-row">
            <Search size={17} />
            <input
              autoFocus
              placeholder="Type a command or search…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  focusCommand(0);
                }
              }}
            />
            <Dialog.Close className="icon-button" aria-label="Close commands">
              <X size={16} />
            </Dialog.Close>
          </div>
          <div className="command-results">
            {visibleCommands.map((command, index) => (
              <button
                className="command-item"
                data-first={index === 0}
                key={command.id}
                type="button"
                onClick={() => run(command.action)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    focusCommand(index + (event.key === "ArrowDown" ? 1 : -1));
                  }
                }}
              >
                <command.Icon size={16} />
                <span>
                  <strong>{command.label}</strong>
                  <small>{command.group}</small>
                </span>
                {command.shortcut ? <kbd>{command.shortcut}</kbd> : null}
              </button>
            ))}
            {!visibleCommands.length ? (
              <div className="command-empty">No matching commands</div>
            ) : null}
          </div>
          <footer className="command-footer">
            <span>↑↓ navigate</span>
            <span>↵ select</span>
            <span>esc close</span>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
