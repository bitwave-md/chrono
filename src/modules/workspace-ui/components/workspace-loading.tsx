import { LoaderCircle } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

export function WorkspaceLoading({ label = "Loading workspace" }: { label?: string }) {
  return (
    <div className="workspace-loading" role="status">
      <LoaderCircle className="spinner" size={18} />
      <span>{label}</span>
      <Skeleton className="h-1.5 w-24" />
    </div>
  );
}
