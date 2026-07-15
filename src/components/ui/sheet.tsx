"use client";

import * as SheetPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn("fixed inset-0 z-60 bg-black/25 backdrop-blur-[1px]", className)}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  showOverlay = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
  showCloseButton?: boolean;
  showOverlay?: boolean;
}) {
  const sideClass = {
    top: "inset-x-0 top-0 border-b",
    right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
    bottom: "inset-x-0 bottom-0 border-t",
    left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
  }[side];

  return (
    <SheetPortal>
      {showOverlay ? <SheetOverlay /> : null}
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed z-70 flex flex-col gap-4 bg-popover text-popover-foreground shadow-2xl outline-none will-change-transform",
          sideClass,
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <SheetPrimitive.Close className="absolute top-4 right-4 rounded-sm text-muted-foreground opacity-80 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        ) : null}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-1.5 p-4", className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-footer" className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn("font-semibold", className)} {...props} />;
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description data-slot="sheet-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
