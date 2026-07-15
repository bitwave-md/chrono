import Link from "next/link";

export default function Home() {
  return (
    <main className="shell shell-centered">
      <section className="panel hero-panel">
        <p className="eyebrow">Bitwave Chrono</p>
        <h1>Client work, issues, and time in one focused workspace.</h1>
        <p className="muted hero-copy">
          A lightweight, keyboard-first operating system for agency projects.
          Navigate Client work, move Issues, and track authoritative time from
          one focused, self-hosted surface.
        </p>
        <Link className="button" href="/app">
          Open Chrono
        </Link>
      </section>
    </main>
  );
}
