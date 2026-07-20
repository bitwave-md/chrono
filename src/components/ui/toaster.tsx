"use client";

import { resolveValue, toast, Toaster as HotToaster, type Toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { ToastSurface } from "@/components/ui/toast-surface";

function ToastIndicator({ item }: { item: Toast }) {
  if (item.type === "success") return <span className="size-2 rounded-full bg-emerald-400 ring-4 ring-emerald-400/10" />;
  if (item.type === "error") return <span className="size-2 rounded-full bg-red-400 ring-4 ring-red-400/10" />;
  if (item.type === "loading") return <span className="size-2 animate-pulse rounded-full bg-amber-400 ring-4 ring-amber-400/10" />;
  return <span className="size-2 rounded-full bg-sky-400 ring-4 ring-sky-400/10" />;
}

function toastLabel(item: Toast): string {
  if (item.type === "success") return "Success";
  if (item.type === "error") return "Error";
  if (item.type === "loading") return "Working";
  return "Notice";
}

export function Toaster() {
  return (
    <HotToaster
      gutter={12}
      position="bottom-right"
      reverseOrder={false}
      toastOptions={{
        duration: 8_000,
        style: { background: "transparent", boxShadow: "none", maxWidth: "none", padding: 0 },
      }}
    >
      {(item) => item.type === "custom" ? <>{resolveValue(item.message, item)}</> : (
        <ToastSurface
          action={item.type === "loading" ? null : (
            <Button
              aria-label="Dismiss notification"
              size="sm"
              variant="secondary"
              onClick={() => toast.dismiss(item.id)}
            >
              Dismiss
            </Button>
          )}
          indicator={<ToastIndicator item={item} />}
        >
          <span className="block font-mono text-[0.62rem] text-muted-foreground">{toastLabel(item)}</span>
          <strong className="mt-0.5 block text-xs font-semibold">{resolveValue(item.message, item)}</strong>
        </ToastSurface>
      )}
    </HotToaster>
  );
}
