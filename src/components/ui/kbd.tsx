import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex min-h-5 min-w-5 items-center justify-center rounded border border-border bg-muted/50 px-1 font-mono text-[0.68rem] text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd };
