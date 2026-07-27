"use client";

import { Slot } from "@radix-ui/react-slot";
import { PanelLeftIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "15.25rem";
const SIDEBAR_WIDTH_MOBILE = "17rem";
const SIDEBAR_WIDTH_ICON = "2.75rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

interface SidebarContextValue {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean | ((open: boolean) => boolean)) => void;
  openMobile: boolean;
  setOpenMobile: React.Dispatch<React.SetStateAction<boolean>>;
  isMobile: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within SidebarProvider.");
  return context;
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = openProp ?? internalOpen;

  const setOpen = React.useCallback(
    (value: boolean | ((current: boolean) => boolean)) => {
      const nextOpen = typeof value === "function" ? value(open) : value;
      if (onOpenChange) onOpenChange(nextOpen);
      else setInternalOpen(nextOpen);
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${nextOpen}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [onOpenChange, open],
  );

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) setOpenMobile((current) => !current);
    else setOpen((current) => !current);
  }, [isMobile, setOpen]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  const state: SidebarContextValue["state"] = open ? "expanded" : "collapsed";
  const value = React.useMemo(
    () => ({ state, open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar }),
    [state, open, setOpen, openMobile, isMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar-wrapper"
        className={cn("group/sidebar-wrapper flex min-h-svh w-full bg-sidebar", className)}
        style={{
          "--sidebar-width": SIDEBAR_WIDTH,
          "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
          ...style,
        } as React.CSSProperties}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function Sidebar({
  side = "left",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right";
  collapsible?: "offcanvas" | "icon" | "none";
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === "none") {
    return (
      <div className={cn("flex h-full w-[var(--sidebar-width)] flex-col bg-sidebar text-sidebar-foreground", className)} {...props}>
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          className="w-[var(--sidebar-width)] gap-0 bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
          showCloseButton={false}
          side={side}
          style={{ "--sidebar-width": SIDEBAR_WIDTH_MOBILE } as React.CSSProperties}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Workspace navigation</SheetTitle>
            <SheetDescription>Navigate Workspace, Clients, Projects, and Issues.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className="group peer hidden text-sidebar-foreground md:block"
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-side={side}
      data-state={state}
      data-slot="sidebar"
    >
      <div className="relative w-[var(--sidebar-width)] bg-transparent transition-[width] duration-200 ease-linear group-data-[collapsible=offcanvas]:w-0 group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)]" />
      <div
        className={cn(
          "fixed inset-y-0 z-20 hidden h-svh w-[var(--sidebar-width)] bg-sidebar transition-[left,right,width] duration-200 ease-linear md:flex",
          side === "left"
            ? "left-0 border-r group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
            : "right-0 border-l group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
          "group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)]",
          className,
        )}
        {...props}
      >
        <div className="flex size-full flex-col" data-sidebar="sidebar">
          {children}
        </div>
      </div>
    </div>
  );
}

function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      data-slot="sidebar-trigger"
      className={className}
      size="icon-sm"
      variant="ghost"
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeftIcon />
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  );
}

function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      aria-label="Toggle sidebar"
      className={cn("absolute inset-y-0 right-0 z-20 hidden w-1 translate-x-1/2 transition-colors hover:bg-sidebar-border md:block", className)}
      tabIndex={-1}
      title="Toggle sidebar"
      type="button"
      onClick={toggleSidebar}
      {...props}
    />
  );
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return <main data-slot="sidebar-inset" className={cn("relative flex min-w-0 flex-1 flex-col", className)} {...props} />;
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-header" className={cn("flex flex-col gap-2 px-2.5 pt-2.5 pb-1.5 group-data-[collapsible=icon]:px-1.5", className)} {...props} />;
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-footer" className={cn("flex flex-col gap-2 p-2", className)} {...props} />;
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-content" className={cn("flex min-h-0 flex-1 flex-col gap-1 overflow-auto pb-2 group-data-[collapsible=icon]:overflow-hidden", className)} {...props} />;
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-group" className={cn("relative flex w-full min-w-0 flex-col px-2 py-1 group-data-[collapsible=icon]:px-1.5", className)} {...props} />;
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-group-label" className={cn("flex h-7 items-center px-2 text-[11px] font-semibold text-sidebar-foreground/55 transition-[margin,opacity] group-data-[collapsible=icon]:-mt-7 group-data-[collapsible=icon]:opacity-0", className)} {...props} />;
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-group-content" className={cn("w-full text-[13px]", className)} {...props} />;
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="sidebar-menu" className={cn("flex w-full min-w-0 flex-col gap-0.5", className)} {...props} />;
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="sidebar-menu-item" className={cn("group/menu-item relative", className)} {...props} />;
}

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  tooltip,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean;
  isActive?: boolean;
  tooltip?: string;
}) {
  const { isMobile, state } = useSidebar();
  const Comp = asChild ? Slot : "button";
  const button = (
    <Comp
      data-active={isActive}
      data-slot="sidebar-menu-button"
      className={cn(
        "flex h-8 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-left text-[13px] font-medium text-sidebar-foreground/78 outline-none transition-colors hover:bg-sidebar-accent/75 hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:pointer-events-none disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:[&>*:not(:first-child)]:hidden [&>span:last-child]:truncate [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-sidebar-foreground/58 data-[active=true]:[&_svg]:text-sidebar-accent-foreground",
        className,
      )}
      {...props}
    />
  );

  if (!tooltip) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent align="center" hidden={state !== "collapsed" || isMobile} side="right">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarMenuBadge({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-menu-badge" className={cn("pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs tabular-nums text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden", className)} {...props} />;
}

function SidebarMenuAction({ className, ...props }: React.ComponentProps<"button">) {
  return <button data-slot="sidebar-menu-action" className={cn("absolute top-1.5 right-1 flex size-5 items-center justify-center rounded-md text-sidebar-foreground/70 outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:hidden [&_svg]:size-4", className)} type="button" {...props} />;
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="sidebar-menu-sub" className={cn("mx-3.5 flex min-w-0 flex-col gap-0.5 border-l border-sidebar-border/70 px-2.5 py-0.5 group-data-[collapsible=icon]:hidden", className)} {...props} />;
}

function SidebarMenuSubItem(props: React.ComponentProps<"li">) {
  return <li data-slot="sidebar-menu-sub-item" {...props} />;
}

function SidebarMenuSubButton({ className, isActive, asChild = false, ...props }: React.ComponentProps<"button"> & { isActive?: boolean; asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-active={isActive} data-slot="sidebar-menu-sub-button" className={cn("flex h-7 w-full min-w-0 items-center gap-2 overflow-hidden rounded-md px-2 text-left text-[12px] font-medium text-sidebar-foreground/62 outline-none hover:bg-sidebar-accent/75 hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground [&>span:last-child]:truncate [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-sidebar-foreground/50 data-[active=true]:[&_svg]:text-sidebar-accent-foreground", className)} {...props} />;
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
};
