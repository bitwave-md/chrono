import type { ReactNode } from "react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function SettingsPageFrame({ children, description, title }: { children: ReactNode; description: string; title: string }) {
  return (
    <main className="min-h-svh px-4 pb-20 sm:px-8">
      <div className="mx-auto w-full max-w-[46rem]">
        <header className="flex min-h-28 items-start gap-3 pt-7 sm:pt-10">
          <SidebarTrigger className="mt-0.5 md:hidden" />
          <div><h1 className="text-xl font-semibold tracking-tight">{title}</h1><p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p></div>
        </header>
        <div className="grid gap-8">{children}</div>
      </div>
    </main>
  );
}

export function SettingsSection({ children, description, title }: { children: ReactNode; description?: string; title: string }) {
  return (
    <section>
      <div className="mb-3"><h2 className="text-sm font-medium">{title}</h2>{description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p> : null}</div>
      <div className="overflow-hidden rounded-xl border bg-card/55 shadow-sm">{children}</div>
    </section>
  );
}

export function SettingsRow({ children, className, description, label }: { children: ReactNode; className?: string; description?: string; label: string }) {
  return (
    <div className={cn("grid min-h-16 gap-3 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,18rem)] sm:items-center", className)}>
      <div><div className="text-sm font-medium">{label}</div>{description ? <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p> : null}</div>
      <div className="flex justify-start sm:justify-end">{children}</div>
    </div>
  );
}

export function SettingsToggle({ checked, disabled, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange: (value: boolean) => void }) {
  return (
    <button aria-checked={checked} aria-label={label} className={cn("relative h-5 w-9 rounded-full border transition-colors disabled:opacity-50", checked ? "border-primary bg-primary" : "border-input bg-muted")} disabled={disabled} role="switch" type="button" onClick={() => onChange(!checked)}>
      <span className={cn("absolute top-0.5 size-3.5 rounded-full bg-background shadow-sm transition-transform", checked ? "translate-x-[1.05rem]" : "translate-x-0.5")} />
    </button>
  );
}

export function SettingsLoading() { return <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">Loading settings…</div>; }
export function SettingsError({ message }: { message: string }) { return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{message}</div>; }
