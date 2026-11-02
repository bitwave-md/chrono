"use client";

import { useEffect, useRef, useState } from "react";

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

/** Eases a number from its previous value to `target`; snaps when reduced motion is requested. */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const show = (next: number) => {
      latest.current = next;
      setValue(next);
    };
    if (window.matchMedia(reducedMotionQuery).matches) {
      const frame = requestAnimationFrame(() => show(target));
      return () => cancelAnimationFrame(frame);
    }
    const from = latest.current;
    let startedAt: number | null = null;
    let frame = 0;
    const tick = (now: number) => {
      startedAt ??= now;
      const progress = Math.min((now - startedAt) / durationMs, 1);
      show(from + (target - from) * (1 - (1 - progress) ** 4));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

/** Flips to true one frame after mount so CSS transitions can run from their initial state. */
export function useEntered(): boolean {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return entered;
}
