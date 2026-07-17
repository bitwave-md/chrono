"use client";

import { Hash } from "lucide-react";
import { DynamicIcon, iconNames, type IconName } from "lucide-react/dynamic";

import { cn } from "@/lib/utils";

export interface EntityIconIdentity {
  name: string;
  iconType: "icon" | "emoji";
  iconKey: string;
  iconColor: string;
}

export const entityIconNames = iconNames;
const entityIconNameSet = new Set<string>(iconNames);

export function EntityIcon({
  entity,
  className,
  iconClassName,
}: {
  entity: EntityIconIdentity;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      aria-label={`${entity.name} icon`}
      className={cn("grid shrink-0 place-items-center rounded-md", className)}
      style={{
        color: entity.iconColor,
        backgroundColor: `${entity.iconColor}20`,
      }}
    >
      {entity.iconType === "emoji" ? (
        <span className={cn("leading-none", iconClassName)}>{entity.iconKey}</span>
      ) : entityIconNameSet.has(entity.iconKey) ? (
        <DynamicIcon
          className={iconClassName}
          fallback={() => <Hash className={iconClassName} />}
          name={entity.iconKey as IconName}
        />
      ) : (
        <Hash className={iconClassName} />
      )}
    </span>
  );
}
