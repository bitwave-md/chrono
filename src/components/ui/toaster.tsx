"use client";

import { CircleAlert, CircleCheck, Info, LoaderCircle, X } from "lucide-react";
import { resolveValue, toast, Toaster as HotToaster, type Toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { ToastSurface } from "@/components/ui/toast-surface";

function ToastIndicator({ item }: { item: Toast }) {
  if (item.type === "success") return <CircleCheck className="size-5 text-emerald-400" />;
  if (item.type === "error") return <CircleAlert className="size-5 text-red-400" />;
  if (item.type === "loading") return <LoaderCircle className="size-5 animate-spin text-muted-foreground" />;
  return <Info className="size-5 text-muted-foreground" />;
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
              className="rounded-full text-muted-foreground hover:text-foreground"
              size="icon-sm"
              variant="ghost"
              onClick={() => toast.dismiss(item.id)}
            >
              <X className="size-4" />
            </Button>
          )}
          indicator={<ToastIndicator item={item} />}
        >
          <div className="text-sm font-medium leading-5">{resolveValue(item.message, item)}</div>
        </ToastSurface>
      )}
    </HotToaster>
  );
}
