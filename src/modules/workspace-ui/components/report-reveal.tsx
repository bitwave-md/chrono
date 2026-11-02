import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Staggered entrance for report sections; disabled for reduced-motion users. */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const style: CSSProperties = { animationDelay: `${delay}ms` };
  return (
    <div
      className={cn("motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both motion-safe:duration-700", className)}
      style={style}
    >
      {children}
    </div>
  );
}
