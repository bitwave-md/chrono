import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { issuePriorityMetadata } from "@/modules/workspace-ui/components/issue-property-metadata";
import type { IssuePriority } from "@/modules/workspace-ui/domain/workspace-types";

export function PriorityBadge({ priority }: { priority: IssuePriority }) {
  const metadata = issuePriorityMetadata[priority];
  const Icon = metadata.icon;

  return (
    <Badge
      className={cn("gap-1.5 px-0", metadata.iconClassName)}
      title={metadata.label}
      variant="ghost"
    >
      <Icon size={14} />
      <span>{metadata.label}</span>
    </Badge>
  );
}
