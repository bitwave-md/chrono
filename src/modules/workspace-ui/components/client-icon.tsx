"use client";

import { EntityIcon, entityIconNames } from "@/modules/workspace-ui/components/entity-icon";
import type { ClientRecord } from "@/modules/workspace-ui/domain/workspace-types";

export const clientIconNames = entityIconNames;

export function ClientIcon({
  client,
  className,
  iconClassName,
}: {
  client: Pick<ClientRecord, "iconType" | "iconKey" | "iconColor" | "name">;
  className?: string;
  iconClassName?: string;
}) {
  return <EntityIcon className={className} entity={client} iconClassName={iconClassName} />;
}
