"use client";

import { Hash } from "lucide-react";
import { DynamicIcon, iconNames, type IconName } from "lucide-react/dynamic";

import { cn } from "@/lib/utils";
import type { ClientRecord } from "@/modules/workspace-ui/domain/workspace-types";

export const clientIconNames = iconNames;
const clientIconNameSet = new Set<string>(iconNames);

export function ClientIcon({
  client,
  className,
  iconClassName,
}: {
  client: Pick<ClientRecord, "iconType" | "iconKey" | "iconColor" | "name">;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-md", className)}
      style={{
        color: client.iconColor,
        backgroundColor: `${client.iconColor}20`,
      }}
    >
      {client.iconType === "emoji" ? (
        <span className={cn("leading-none", iconClassName)}>{client.iconKey}</span>
      ) : clientIconNameSet.has(client.iconKey) ? (
        <DynamicIcon
          className={iconClassName}
          fallback={() => <Hash className={iconClassName} />}
          name={client.iconKey as IconName}
        />
      ) : (
        <Hash className={iconClassName} />
      )}
    </span>
  );
}
