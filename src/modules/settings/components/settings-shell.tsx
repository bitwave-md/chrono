"use client";

import type { ReactNode } from "react";

import { SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { SettingsSidebar } from "@/modules/settings/components/settings-sidebar";
import type { WorkspaceIdentity } from "@/modules/workspace-ui/domain/workspace-types";

export function SettingsShell({ children, workspace }: { children: ReactNode; workspace: WorkspaceIdentity }) {
  return (
    <>
      <SettingsSidebar workspace={workspace} />
      <SidebarInset className="min-h-svh overflow-x-hidden bg-background md:min-h-svh">{children}</SidebarInset>
      <Toaster />
    </>
  );
}
