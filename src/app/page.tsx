import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="grid min-h-svh place-items-center p-6 max-sm:p-3">
      <Card className="w-full max-w-3xl gap-7 p-10 shadow-xl max-sm:p-7">
        <CardHeader className="gap-5 p-0">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">Bitwave Chrono</p>
          <CardTitle asChild><h1 className="max-w-2xl text-5xl leading-[0.98] tracking-[-0.055em] max-sm:text-4xl">Client work, issues, and time in one focused workspace.</h1></CardTitle>
          <CardDescription className="max-w-xl text-base leading-7">
            A lightweight, keyboard-first operating system for agency projects.
            Navigate Client work, move Issues, and track authoritative time from
            one focused, self-hosted surface.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Button asChild size="lg"><Link href="/app">Open Chrono</Link></Button>
        </CardContent>
      </Card>
    </main>
  );
}
