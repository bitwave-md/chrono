import type { CSSProperties } from "react";

export function groupHeaderGradient(color: string | null): CSSProperties | undefined {
  const match = color?.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  if (!match) return undefined;
  const red = Number.parseInt(match[1], 16);
  const green = Number.parseInt(match[2], 16);
  const blue = Number.parseInt(match[3], 16);
  return {
    backgroundImage: `linear-gradient(90deg, rgba(${red}, ${green}, ${blue}, 0.11), rgba(${red}, ${green}, ${blue}, 0.035) 46%, transparent 100%)`,
  };
}
