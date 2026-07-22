"use client";

import { ChevronRight, Maximize2, Minimize2, X } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { gsap, useGSAP } from "@/modules/workspace-ui/application/workspace-animation";

export function CreationDialogFrame({
  children,
  context,
  description,
  open,
  title,
}: {
  children: ReactNode;
  context: ReactNode;
  description: string;
  open: boolean;
  title: string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  useGSAP(() => {
    if (open) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 18, scale: 0.985 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out" },
      );
    }
  }, { dependencies: [open], revertOnUpdate: true });

  return (
    <DialogContent
      className={cn(
        "top-[7svh] h-[min(560px,86svh)] grid-rows-[auto_minmax(0,1fr)] translate-y-0 gap-0 overflow-hidden rounded-3xl border-white/10 bg-card p-0 shadow-2xl will-change-transform sm:max-w-4xl max-md:top-[3svh] max-md:h-[94svh]",
        expanded && "top-3 left-3 h-[calc(100svh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-none translate-x-0 translate-y-0 rounded-2xl sm:max-w-none",
      )}
      ref={contentRef}
      showCloseButton={false}
    >
      <DialogHeader className="flex-row items-center justify-between px-6 pt-5">
        <div className="flex min-w-0 items-center gap-2">
          {context}
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          <DialogTitle className="truncate text-base font-medium">{title}</DialogTitle>
          <DialogDescription className="sr-only">{description}</DialogDescription>
        </div>
        <div className="flex items-center gap-1">
          <Button aria-label={expanded ? "Exit expanded view" : "Expand dialog"} size="icon-sm" type="button" variant="ghost" onClick={() => setExpanded((value) => !value)}>
            {expanded ? <Minimize2 /> : <Maximize2 />}
          </Button>
          <DialogClose asChild><Button aria-label="Close" size="icon-sm" variant="ghost"><X /></Button></DialogClose>
        </div>
      </DialogHeader>
      {children}
    </DialogContent>
  );
}
