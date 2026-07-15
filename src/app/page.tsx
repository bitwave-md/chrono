import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="shell shell-centered">
      <Card className="panel hero-panel">
        <CardHeader className="gap-5 p-0">
          <p className="eyebrow">Bitwave Chrono</p>
          <CardTitle asChild><h1>Client work, issues, and time in one focused workspace.</h1></CardTitle>
          <CardDescription className="muted hero-copy">
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
