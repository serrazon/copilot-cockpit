# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
Local real-time monitoring dashboard for GitHub Copilot CLI sessions.
"Space Mission Control Cockpit" aesthetic. Single-user, localhost only.

## Stack
- Frontend: React 19 + Vite 6 + TypeScript strict
- UI: shadcn/ui + Tailwind v4 + Tremor charts
- Fonts: JetBrains Mono (terminal/code), Space Grotesk (headings), Inter (body)
- State: Zustand
- Backend: Express.js + ws (WebSocket) + SSE
- File watching: chokidar v5
- Process monitoring: systeminformation + ps-list + pidtree
- Cross-platform: execa, cross-spawn, cross-env

## Architecture
- /client — React SPA (Vite)
- /server — Express backend
- /shared — TypeScript types shared between client/server

Data flow: chokidar/systeminformation watchers → service EventEmitters → WebSocket broadcast → Zustand store → panel components

## Key Paths Monitored
- `~/.copilot/logs/` — debug logs, tailed in real-time
- `~/.copilot/session-state/` — session JSON files
- `~/.copilot/command-history-state.json`
- `~/.copilot/config.json`, `mcp-config.json`
- `~/.copilot/agents/*.md` — agent definitions

Override base path with `COPILOT_HOME` env var.

## Conventions
- Named exports only, never default exports
- All WebSocket messages typed via shared/types/ws-messages.ts
- Use path.join() for ALL file paths — never string concatenation
- Platform detection via process.platform, never hardcoded paths
- Express routes in server/routes/, one file per resource
- React components in client/components/, one dir per panel widget
- Use os.homedir() for ~ resolution on all platforms

## State Limits
- Zustand logs slice: capped at 1000 entries (ring buffer)
- Zustand networkEvents slice: capped at 500 entries

## Panel Types
Dashboard grid supports: `terminal`, `processes`, `logs`, `metrics`, `sessions`, `network`

## Commands
- `pnpm dev` — starts both backend (3001) and frontend (5173) via concurrently
- `pnpm dev:server` — backend only
- `pnpm dev:client` — frontend only
- `pnpm build` — production build
- `pnpm lint` — ESLint + Prettier
- `pnpm typecheck` — tsc --noEmit
- `pnpm test` — runs backend (node --test) and frontend (vitest) tests
- `pnpm test:server` — backend tests only
- `pnpm test:client` — frontend tests only (Vitest)

## Environment Variables
- `COPILOT_HOME` — override `~/.copilot` base path
- `PORT` — backend port (default 3001)
- `ENABLE_PROXY` — set to `true` to start the optional HTTP MITM proxy on port 8888

## Critical Rules
- All file paths must work on macOS AND Windows
- Normalize line endings: .replace(/\r\n/g, '\n') when parsing logs
- WebSocket reconnection with exponential backoff on client (1s, 2s, 4s, 8s, max 30s)
- Never block the event loop — use streaming reads, not readFileSync
- Log tail implementation: track file size, read only new bytes on change; if size decreases, treat as file rotation and reset position
- Single chokidar instance per directory (avoid missed events on Windows)
- If ~/.copilot doesn't exist, log warning and retry watching every 10 seconds
- ps-list lacks cmd/cpu/memory on Windows — fall back to systeminformation.processes()
