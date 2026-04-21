# profile-fill-assistant

`profile-fill-assistant` is now a local-first desktop app built with Tauri v2. The UI runs as a React + Vite app, while persistence is handled by Rust commands that write directly to a local SQLite database. There is no Cloudflare Workers runtime, no D1, and no cloud deployment path in the current architecture.

## Tech Stack

- `Tauri v2` for the desktop shell and native command bridge
- `React 19` + `TanStack Router` for the frontend
- `Vite` for local frontend development and builds
- `Rust` + `rusqlite` for local SQLite access
- `pnpm` workspaces for package management
- shared UI primitives in `packages/ui`

## Repo Layout

- `apps/web`: the desktop app frontend and package scripts
- `apps/web/src-tauri`: the Tauri Rust backend, config, and capabilities
- `packages/ui`: shared components and global styles
- `packages/config`: shared TypeScript config

## How It Works

1. `pnpm dev` starts the Tauri app.
2. Tauri launches the Vite dev server defined in `apps/web/src-tauri/tauri.conf.json`.
3. The React frontend calls Rust commands through `@tauri-apps/api`.
4. Rust reads and writes the local SQLite database in the app data directory.

If you run the frontend without Tauri, it falls back to `localStorage` so the UI can still be previewed in a browser.

## Prerequisites

Before running the app, install:

1. Node.js
2. `pnpm`
3. Rust toolchain (`rustup`, `cargo`, `rustc`)
4. Tauri OS prerequisites for your platform:
   https://v2.tauri.app/start/prerequisites/

If `cargo` is missing, `pnpm dev` and `pnpm build` will fail because Tauri cannot compile the Rust sidecar.

## Getting Started

Install dependencies:

```bash
pnpm install
```

Start the desktop app in development mode:

```bash
pnpm dev
```

Start only the browser frontend preview:

```bash
pnpm dev:web
```

Run type checks:

```bash
pnpm check-types
```

## Build

Build the desktop application:

```bash
pnpm build
```

Build only the web assets:

```bash
pnpm build:web
```

Preview the built web assets without Tauri:

```bash
pnpm serve:web
```

## Local Data Storage

The desktop runtime creates a SQLite database named `profile-fill-assistant.sqlite3` under the Tauri app data directory for the current OS.

Typical locations look like this:

- macOS: `~/Library/Application Support/app.profile-fill-assistant/profile-fill-assistant.sqlite3`
- Windows: `%AppData%/app.profile-fill-assistant/profile-fill-assistant.sqlite3`
- Linux: `~/.local/share/app.profile-fill-assistant/profile-fill-assistant.sqlite3`

The exact path is resolved by Tauri at runtime and is also shown in the app UI.

## Scripts

- `pnpm dev`: start the Tauri desktop app
- `pnpm dev:web`: start the Vite-only frontend preview
- `pnpm build`: build the Tauri desktop app
- `pnpm build:web`: build the Vite frontend only
- `pnpm serve:web`: preview the built web frontend
- `pnpm check-types`: run workspace type checks

## Notes

- The old Cloudflare/Workers/D1/Alchemy stack has been removed.
- There is no server deployment step anymore.
- New persistence-related work should be implemented in `apps/web/src-tauri/src/lib.rs`.
