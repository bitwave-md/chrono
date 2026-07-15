import { Waves } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthCardProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <main className="grid min-h-svh place-items-center p-6 max-sm:p-3">
      <Card className="w-full max-w-md border-border/90 bg-card/95 shadow-2xl backdrop-blur-xl">
        <CardHeader className="gap-4 border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-lg border bg-primary/10 text-primary"><Waves className="size-4" /></span>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">Bitwave Chrono</p>
              <span className="text-xs text-muted-foreground">Self-hosted workspace</span>
            </div>
          </div>
          <div className="grid gap-2">
            <CardTitle asChild><h1 className="text-2xl tracking-tight">{title}</h1></CardTitle>
            <CardDescription className="leading-6">{description}</CardDescription>
          </div>
        </CardHeader>
        {children ? <CardContent className="pt-6">{children}</CardContent> : null}
      </Card>
    </main>
  );
}
