"use client";

import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40",
  {
    variants: {
      variant: { default: "bg-transparent", outline: "border border-input bg-background/70 shadow-xs" },
      size: { default: "h-9 px-3", sm: "h-8 px-2.5", lg: "h-10 px-3.5" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

const ToggleGroupContext = React.createContext<VariantProps<typeof toggleVariants>>({ variant: "default", size: "default" });

function ToggleGroup({ className, variant, size, children, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <ToggleGroupPrimitive.Root data-slot="toggle-group" className={cn("inline-flex w-fit items-center rounded-md", className)} {...props}>
      <ToggleGroupContext.Provider value={{ variant, size }}>{children}</ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({ className, children, variant, size, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext);
  return (
    <ToggleGroupPrimitive.Item data-slot="toggle-group-item" className={cn(toggleVariants({ variant: context.variant ?? variant, size: context.size ?? size }), className)} {...props}>
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem, toggleVariants };
