"use client";

import {
  Building2,
  Check,
  ChevronRight,
  FolderKanban,
  Inbox,
  ListTodo,
  LogOut,
  Waves,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSignOutMutation } from "@/modules/auth/presentation/use-auth-mutations";
import type { ClientRecord, WorkspaceIdentity, WorkspaceOption } from "@/modules/workspace-ui/domain/workspace-types";
import { useWorkspaceView } from "@/modules/workspace-ui/state/workspace-ui-provider";

interface WorkspaceSidebarProps {
  workspace: WorkspaceIdentity;
  workspaces: WorkspaceOption[];
  clients: ClientRecord[];
}

export function WorkspaceSidebar({ workspace, workspaces, clients }: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const signOut = useSignOutMutation();
  const { isMobile, setOpenMobile } = useSidebar();
  const workspaceOpen = useWorkspaceView((state) => state.workspaceSectionOpen);
  const clientsOpen = useWorkspaceView((state) => state.clientsSectionOpen);
  const expandedClients = useWorkspaceView((state) => state.expandedClientIds);
  const setWorkspaceOpen = useWorkspaceView((state) => state.setWorkspaceSectionOpen);
  const setClientsOpen = useWorkspaceView((state) => state.setClientsSectionOpen);
  const setClientExpanded = useWorkspaceView((state) => state.setClientExpanded);
  const root = `/app/${workspace.slug}`;

  const finishNavigation = () => {
    if (isMobile) setOpenMobile(false);
  };

  const active = (href: string, exact = true) => exact ? pathname === href : pathname.startsWith(href);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Popover>
          <PopoverTrigger asChild>
            <SidebarMenuButton className="h-10" tooltip={workspace.name}>
              <span className="grid size-7 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"><Waves className="size-4" /></span>
              <span className="min-w-0 flex-1 truncate font-medium group-data-[collapsible=icon]:hidden">{workspace.name}</span>
              <ChevronRight className="rotate-90 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-0">
            <Command>
              <CommandInput placeholder="Switch workspace..." />
              <CommandList>
                <CommandEmpty>No workspace found.</CommandEmpty>
                <CommandGroup heading="Workspaces">
                  {workspaces.map((candidate) => (
                    <CommandItem
                      key={candidate.id}
                      value={candidate.name}
                      onSelect={() => router.push(`/app/${candidate.slug}/inbox`)}
                    >
                      <span className="grid size-6 place-items-center rounded bg-muted"><Waves className="size-3.5" /></span>
                      <span className="flex-1 truncate">{candidate.name}</span>
                      {candidate.id === workspace.id ? <Check className="size-4" /> : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandGroup>
                  <CommandItem disabled={signOut.isPending} onSelect={() => signOut.mutate()}>
                    <LogOut /> Sign out
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarLink href={`${root}/inbox`} icon={Inbox} isActive={active(`${root}/inbox`)} label="Inbox" onNavigate={finishNavigation} />
              <SidebarLink href={`${root}/my-issues`} icon={ListTodo} isActive={active(`${root}/my-issues`)} label="My Issues" onNavigate={finishNavigation} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Collapsible open={workspaceOpen} onOpenChange={setWorkspaceOpen}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer select-none">
                <span>Workspace</span><ChevronRight className={`ml-auto size-3.5 transition-transform ${workspaceOpen ? "rotate-90" : ""}`} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarLink href={`${root}/clients`} icon={Building2} isActive={active(`${root}/clients`)} label="Clients" onNavigate={finishNavigation} />
                  <SidebarLink href={`${root}/projects`} icon={FolderKanban} isActive={active(`${root}/projects`)} label="Projects" onNavigate={finishNavigation} />
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <Collapsible open={clientsOpen} onOpenChange={setClientsOpen}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer select-none">
                <span>Your clients</span><ChevronRight className={`ml-auto size-3.5 transition-transform ${clientsOpen ? "rotate-90" : ""}`} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {clients.map((client) => {
                    const clientRoot = `${root}/clients/${client.id}`;
                    const open = expandedClients[client.id] ?? pathname.startsWith(clientRoot);
                    return (
                      <Collapsible key={client.id} open={open} onOpenChange={(value) => setClientExpanded(client.id, value)}>
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton isActive={pathname.startsWith(clientRoot)} tooltip={client.name}>
                              <span className="grid size-4 place-items-center rounded-sm bg-muted text-[0.55rem] font-semibold">{client.name.slice(0, 1).toUpperCase()}</span>
                              <span>{client.name}</span>
                              <ChevronRight className={`ml-auto transition-transform ${open ? "rotate-90" : ""}`} />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {[
                                ["Home", "home"],
                                ["Issues", "issues"],
                                ["Projects", "projects"],
                              ].map(([label, segment]) => {
                                const href = `${clientRoot}/${segment}`;
                                return (
                                  <SidebarMenuSubItem key={segment}>
                                    <SidebarMenuSubButton asChild isActive={active(href)}>
                                      <Link href={href} onClick={finishNavigation}>{label}</Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

function SidebarLink({ href, icon: Icon, isActive, label, onNavigate }: {
  href: string;
  icon: typeof Inbox;
  isActive: boolean;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
        <Link href={href} onClick={onNavigate}><Icon /><span>{label}</span></Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
