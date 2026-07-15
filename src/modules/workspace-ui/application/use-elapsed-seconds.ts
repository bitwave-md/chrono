"use client";

import { useEffect, useState } from "react";

export function useElapsedSeconds(
  startedAt: string | null,
  serverNow: string | null,
): number {
  const [clock, setClock] = useState(() => {
    const now = Date.now();
    return {
      now,
      serverOffset: serverNow ? Date.parse(serverNow) - now : 0,
    };
  });

  useEffect(() => {
    if (!startedAt || !serverNow) {
      return;
    }

    const synchronize = window.setTimeout(() => {
      const now = Date.now();
      setClock({ now, serverOffset: Date.parse(serverNow) - now });
    }, 0);
    const interval = window.setInterval(
      () => setClock((current) => ({ ...current, now: Date.now() })),
      1_000,
    );
    return () => {
      window.clearTimeout(synchronize);
      window.clearInterval(interval);
    };
  }, [serverNow, startedAt]);

  if (!startedAt || !serverNow) {
    return 0;
  }

  const startedEpoch = Date.parse(startedAt);
  return Math.max(
    0,
    Math.floor((clock.now + clock.serverOffset - startedEpoch) / 1_000),
  );
}

export function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
}
