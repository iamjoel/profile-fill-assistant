import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";

export default function Header() {
  return (
    <header className="border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="min-w-0">
          <Link className="text-sm font-medium tracking-[0.18em] uppercase" to="/">
            Profile Fill Assistant
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            Local-first desktop workflow backed by Tauri and SQLite
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
