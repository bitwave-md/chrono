"use client";

import { Copy, Download, Link2, X } from "lucide-react";
import Image from "next/image";
import { type ReactNode, type WheelEvent, useState } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AttachmentRecord } from "@/modules/workspace-ui/domain/workspace-types";

export function ImageAttachmentPreview({
  attachment,
  className,
  workspaceSlug,
}: {
  attachment: AttachmentRecord;
  className?: string;
  workspaceSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const href = `/api/workspaces/${workspaceSlug}/attachments/${attachment.id}/content`;

  const changeOpen = (value: boolean) => {
    setOpen(value);
    if (!value) setZoom(100);
  };
  const changeZoom = (event: WheelEvent) => {
    event.preventDefault();
    setZoom((value) => clampZoom(value + (event.deltaY < 0 ? 10 : -10)));
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <button className={cn("relative block aspect-video w-full cursor-zoom-in overflow-hidden bg-black/20", className)} type="button">
          <Image alt={attachment.filename} className="object-contain" fill sizes="(max-width: 768px) 100vw, 760px" src={href} unoptimized />
        </button>
      </DialogTrigger>
      <DialogContent className="top-0 left-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 bg-black p-0 sm:max-w-none" showCloseButton={false} onWheel={changeZoom}>
        <DialogTitle className="sr-only">Preview {attachment.filename}</DialogTitle>
        <div aria-label="Image preview controls" className="absolute top-3 right-3 z-10 flex h-9 items-center gap-1 rounded-lg border border-white/10 bg-black/65 px-1.5 text-white shadow-lg backdrop-blur-md" role="toolbar">
          <button aria-label="Reset zoom" className="min-w-12 px-1 text-xs font-medium tabular-nums text-white/80 hover:text-white" type="button" onClick={() => setZoom(100)}>{zoom}%</button>
          <Separator className="mx-1 h-5 bg-white/15" orientation="vertical" />
          <PreviewAction label="Download image"><Button aria-label="Download image" asChild className="text-white/75 hover:bg-white/10 hover:text-white" size="icon-xs" variant="ghost"><a download href={href}><Download /></a></Button></PreviewAction>
          <PreviewAction label="Copy image"><Button aria-label="Copy image" className="text-white/75 hover:bg-white/10 hover:text-white" size="icon-xs" variant="ghost" onClick={() => void copyImage(href)}><Copy /></Button></PreviewAction>
          <PreviewAction label="Copy link"><Button aria-label="Copy image link" className="text-white/75 hover:bg-white/10 hover:text-white" size="icon-xs" variant="ghost" onClick={() => void copyLink(href)}><Link2 /></Button></PreviewAction>
          <Separator className="mx-1 h-5 bg-white/15" orientation="vertical" />
          <PreviewAction label="Close preview"><DialogClose asChild><Button aria-label="Close preview" className="text-white/75 hover:bg-white/10 hover:text-white" size="icon-xs" variant="ghost"><X /></Button></DialogClose></PreviewAction>
        </div>
        <div className="relative h-full w-full overflow-hidden" onDoubleClick={() => setZoom((value) => value === 100 ? 200 : 100)}>
          <div className="relative h-full w-full transition-transform duration-150" style={{ transform: `scale(${zoom / 100})` }}>
            <Image alt={attachment.filename} className="object-contain p-8" fill priority sizes="100vw" src={href} unoptimized />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewAction({ children, label }: { children: ReactNode; label: string }) {
  return <Tooltip><TooltipTrigger asChild>{children}</TooltipTrigger><TooltipContent side="bottom">{label}</TooltipContent></Tooltip>;
}

async function copyImage(href: string) {
  try {
    const response = await fetch(href);
    if (!response.ok) throw new Error("The image could not be downloaded.");
    const source = await response.blob();
    const blob = source.type === "image/png" ? source : await convertToPng(source);
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    toast.success("Image copied");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "The image could not be copied.");
  }
}

async function copyLink(href: string) {
  try {
    await navigator.clipboard.writeText(new URL(href, window.location.origin).toString());
    toast.success("Image link copied");
  } catch {
    toast.error("The image link could not be copied.");
  }
}

async function convertToPng(source: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The image could not be converted.")), "image/png"));
}

function clampZoom(value: number) {
  return Math.min(400, Math.max(25, value));
}
