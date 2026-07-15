import { LoaderCircle } from "lucide-react";

export function WorkspaceLoading({ label = "Loading workspace" }: { label?: string }) {
  return (
    <div className="workspace-loading" role="status">
      <LoaderCircle className="spinner" size={18} />
      <span>{label}</span>
    </div>
  );
}
