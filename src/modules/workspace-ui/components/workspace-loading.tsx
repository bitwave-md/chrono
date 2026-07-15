import { LoaderCircle } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

export function WorkspaceLoading({ label = "Loading workspace" }: { label?: string }) {
  return (
    <div className="flex min-h-56 items-center justify-center gap-2.5 text-muted-foreground" role="status">
      <LoaderCircle className="animate-spin" size={18} />
      <span>{label}</span>
      <Skeleton className="h-1.5 w-24" />
    </div>
  );
}
