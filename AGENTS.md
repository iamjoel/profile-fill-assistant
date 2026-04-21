# AGENTS.md

Guidance for coding agents working in this repository.

## Working Agreements

- Use `pnpm` for dependency installation and workspace scripts.
- Ask for confirmation before adding new production dependencies.
- Prefer targeted changes that fit the current local-first desktop architecture.
- When designing or implementing pages/UI, follow the guidance in `design.md` at the repo root.

## Project Overview

- This repo is a local-first desktop app built with `Tauri v2`.
- The frontend lives in `apps/web` and uses `React 19`, `Vite`, and `TanStack Router`.
- The native backend lives in `apps/web/src-tauri` and uses Rust with SQLite.
- Shared UI primitives live in `packages/ui`.
- Shared TypeScript config lives in `packages/config`.

## Architecture Guardrails

- Do not reintroduce Cloudflare Workers, D1, or other cloud persistence paths.
- Persistence-related changes should go through the Tauri Rust layer, typically in `apps/web/src-tauri/src/lib.rs`.
- The browser-only preview may fall back to `localStorage`, but desktop persistence should remain SQLite-backed.

## Common Commands

```bash
pnpm install
pnpm dev
pnpm dev:web
pnpm check-types
pnpm build
pnpm build:web
pnpm serve:web
```

## Repo Layout

- `apps/web`: React frontend and package scripts
- `apps/web/src-tauri`: Tauri config, capabilities, and Rust backend
- `packages/ui`: shared UI components and styles
- `packages/config`: shared TypeScript config
