"use client";

import { Check, Palette } from "lucide-react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { clientIconNames } from "@/modules/workspace-ui/components/client-icon";
import { EntityIcon, type EntityIconIdentity } from "@/modules/workspace-ui/components/entity-icon";
import type { ClientRecord } from "@/modules/workspace-ui/domain/workspace-types";

const colors = [
  "#cbd5e1",
  "#94a3b8",
  "#6366f1",
  "#22b8cf",
  "#43b581",
  "#f5c400",
  "#fb923c",
  "#f7c6c2",
  "#ef5350",
];

const emojis = [
  "😀", "😎", "🤓", "🥳", "🚀", "💡", "⚡", "🔥", "✨", "🎯",
  "🧭", "🛰️", "🛠️", "⚙️", "🧩", "🧪", "🔬", "📱", "💻", "🖥️",
  "⌨️", "🗄️", "📊", "📈", "📦", "🧰", "🔐", "🌐", "☁️", "🏢",
  "🏦", "🛒", "💳", "💰", "📣", "🎨", "✏️", "📐", "🧱", "🌊",
  "🌙", "☀️", "⭐", "🌱", "🌲", "🍀", "🦊", "🐙", "🐳", "🦄",
];

export function ClientIconPicker({
  client,
  disabled,
  onChange,
}: {
  client: ClientRecord;
  disabled?: boolean;
  onChange: (appearance: Pick<ClientRecord, "iconType" | "iconKey" | "iconColor">) => void;
}) {
  return <EntityIconPicker disabled={disabled} entity={client} label="Client" onChange={onChange} />;
}

export function EntityIconPicker({
  entity,
  label,
  disabled,
  onChange,
}: {
  entity: EntityIconIdentity;
  label: string;
  disabled?: boolean;
  onChange: (appearance: Pick<EntityIconIdentity, "iconType" | "iconKey" | "iconColor">) => void;
}) {
  const [tab, setTab] = useState<EntityIconIdentity["iconType"]>(entity.iconType);
  const [search, setSearch] = useState("");
  const visibleIcons = useMemo(() => {
    const query = search.trim().toLowerCase();
    return clientIconNames
      .filter((name) => !query || name.includes(query))
      .slice(0, 180);
  }, [search]);
  const update = (values: Partial<Pick<EntityIconIdentity, "iconType" | "iconKey" | "iconColor">>) =>
    onChange({
      iconType: values.iconType ?? entity.iconType,
      iconKey: values.iconKey ?? entity.iconKey,
      iconColor: values.iconColor ?? entity.iconColor,
    });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label={`Change ${label} icon`}
          className="size-12 rounded-xl p-0"
          disabled={disabled}
          type="button"
          variant="ghost"
        >
          <EntityIcon className="size-12 rounded-xl" entity={entity} iconClassName={entity.iconType === "emoji" ? "text-2xl" : "size-7"} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[560px] max-w-[calc(100vw-2rem)] overflow-hidden p-0">
        <div className="flex h-12 items-end gap-2 border-b px-4">
          {(["icon", "emoji"] as const).map((item) => (
            <button
              className={cn(
                "h-12 border-b-2 px-2 text-sm text-muted-foreground",
                tab === item && "border-primary text-foreground",
              )}
              key={item}
              type="button"
              onClick={() => setTab(item)}
            >
              {item === "icon" ? "Icons" : "Emojis"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          {colors.map((color) => (
            <button
              aria-label={`Use ${color}`}
              className="grid size-9 place-items-center rounded-full"
              key={color}
              style={{ backgroundColor: color }}
              type="button"
              onClick={() => update({ iconColor: color })}
            >
              {entity.iconColor.toLowerCase() === color.toLowerCase() ? <Check className="size-4 text-black/70" /> : null}
            </button>
          ))}
          <span className="mx-1 h-9 w-px bg-border" />
          <label className="relative grid size-9 cursor-pointer place-items-center overflow-hidden rounded-full bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]">
            <Palette className="size-4 text-white drop-shadow" />
            <input
              aria-label="Custom icon color"
              className="absolute inset-0 cursor-pointer opacity-0"
              type="color"
              value={entity.iconColor}
              onChange={(event) => update({ iconColor: event.target.value })}
            />
          </label>
        </div>
        {tab === "icon" ? (
          <>
            <div className="border-b p-3">
              <Input placeholder="Search icons..." value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <div className="grid max-h-80 grid-cols-10 gap-1 overflow-y-auto p-3 max-sm:grid-cols-6">
              {visibleIcons.map((name) => (
                <button
                  aria-label={name}
                  className={cn(
                    "relative grid aspect-square place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground",
                    entity.iconType === "icon" && entity.iconKey === name && "bg-accent text-foreground",
                  )}
                  key={name}
                  title={name}
                  type="button"
                  onClick={() => update({ iconType: "icon", iconKey: name })}
                >
                  <DynamicIcon color={entity.iconColor} name={name as IconName} size={20} />
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="grid max-h-80 grid-cols-10 gap-1 overflow-y-auto p-3 max-sm:grid-cols-6">
            {emojis.map((emoji) => (
              <button
                aria-label={`Use ${emoji}`}
                className={cn(
                  "grid aspect-square place-items-center rounded-md text-xl hover:bg-accent",
                  entity.iconType === "emoji" && entity.iconKey === emoji && "bg-accent",
                )}
                key={emoji}
                type="button"
                onClick={() => update({ iconType: "emoji", iconKey: emoji })}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
