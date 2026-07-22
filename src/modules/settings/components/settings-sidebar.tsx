"use client";

import { ArrowLeft, Bell, Clock3, Database, Palette, Search, Settings2, UserRound, UsersRound, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Input } from "@/components/ui/input";
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
  useSidebar,
} from "@/components/ui/sidebar";
import type { WorkspaceIdentity } from "@/modules/workspace-ui/domain/workspace-types";

const sections = [
  { title: "Personal", operatorOnly: false, items: [
    { segment: "personal/profile", label: "Profile", icon: UserRound },
    { segment: "personal/preferences", label: "Preferences", icon: Palette },
    { segment: "personal/notifications", label: "Notifications", icon: Bell },
  ] },
  { title: "Workspace", operatorOnly: false, items: [
    { segment: "workspace/general", label: "General", icon: Settings2 },
    { segment: "workspace/members", label: "Members", icon: UsersRound },
    { segment: "workspace/time-entry-types", label: "Time entry types", icon: Clock3 },
  ] },
  { title: "Administration", operatorOnly: true, items: [
    { segment: "administration/storage", label: "Storage", icon: Database },
    { segment: "administration/updates", label: "Updates", icon: Wrench },
  ] },
] as const;

export function SettingsSidebar({ workspace }: { workspace: WorkspaceIdentity }) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const { isMobile, setOpenMobile } = useSidebar();
  const root = `/app/${workspace.slug}`;
  const normalized = search.trim().toLowerCase();
  const finish = () => { if (isMobile) setOpenMobile(false); };

  return (
    <Sidebar className="border-r border-sidebar-border" collapsible="offcanvas">
      <SidebarHeader className="gap-3 px-3 pt-3">
        <SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild><Link href={`${root}/inbox`} onClick={finish}><ArrowLeft /><span>Back to app</span></Link></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
        <div className="relative"><Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search settings" className="h-8 bg-sidebar-accent/60 pl-8 text-xs" placeholder="Search settings" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      </SidebarHeader>
      <SidebarContent>
        {sections.filter((section) => !section.operatorOnly || workspace.isOperator).map((section) => {
          const items = section.items.filter((item) => item.label.toLowerCase().includes(normalized));
          if (!items.length) return null;
          return (
            <SidebarGroup key={section.title}>
              <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
              <SidebarGroupContent><SidebarMenu>{items.map((item) => {
                const href = `${root}/settings/${item.segment}`;
                const Icon = item.icon;
                return <SidebarMenuItem key={item.segment}><SidebarMenuButton asChild isActive={pathname === href}><Link href={href} onClick={finish}><Icon /><span>{item.label}</span></Link></SidebarMenuButton></SidebarMenuItem>;
              })}</SidebarMenu></SidebarGroupContent>
            </SidebarGroup>
          );
        })}
        {normalized && !sections.some((section) => (!section.operatorOnly || workspace.isOperator) && section.items.some((item) => item.label.toLowerCase().includes(normalized))) ? <p className="px-4 py-8 text-center text-xs text-muted-foreground">No settings found.</p> : null}
      </SidebarContent>
    </Sidebar>
  );
}
