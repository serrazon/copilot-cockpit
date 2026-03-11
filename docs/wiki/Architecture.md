# Architecture

## Overview

Copilot Cockpit is a monorepo with three packages:

```
copilot-cockpit/
├── client/    React 19 SPA (Vite 6)
├── server/    Node.js + Express backend
└── shared/    TypeScript types used by both
```

## Data Pipeline

```
~/.copilot/                         Your machine's filesystem
├── logs/*.log        ──┐
├── session-state/    ──┤ chokidar watchers
├── config.json       ──┤
└── mcp-config.json   ──┘
                         │
              ┌──────────▼──────────┐
              │   Service layer     │
              │  (EventEmitters)    │
              │  log-watcher        │
              │  session-watcher    │
              │  process-monitor    │  ← ps-list + pidtree
              │  system-monitor     │  ← systeminformation
              │  config-watcher     │
              └──────────┬──────────┘
                         │ typed ServerMessage events
              ┌──────────▼──────────┐
              │  Express server     │
              │  WebSocket (ws)     │──── JSON messages ──→ browser
              │  SSE endpoint       │──── text/event-stream ──→ xterm.js
              │  REST /api/*        │──── JSON ──→ browser (on demand)
              └─────────────────────┘
                                            │
                              ┌─────────────▼─────────────┐
                              │  Zustand store (browser)   │
                              │  logs[]       cap: 1,000   │
                              │  processes[]               │
                              │  sessions[]                │
                              │  metrics                   │
                              │  networkEvents[] cap: 500  │
                              └─────────────┬─────────────┘
                                            │ React re-renders
                              ┌─────────────▼─────────────┐
                              │  Panel components          │
                              │  LogViewer                 │
                              │  ProcessTree               │
                              │  TerminalPanel             │
                              │  MetricsPanel              │
                              │  SessionTimeline           │
                              │  NetworkInspector          │
                              └───────────────────────────┘
```

## Server

### Services

Each service is an `EventEmitter` singleton. They start on server boot and retry
every 10 seconds if the watched directory doesn't exist yet.

| Service | What it does |
|---|---|
| `copilot-paths` | Resolves all `~/.copilot` sub-paths. Respects `COPILOT_HOME` env. Uses `os.homedir()` — never hardcodes paths. |
| `log-watcher` | Watches `logs/` with chokidar. On each `change` event, reads only the **new bytes** appended since last read (`createReadStream({ start: lastSize })`). Handles file rotation (size decrease resets position). Normalizes CRLF → LF. |
| `session-watcher` | Watches `session-state/*.json` and `command-history-state.json`. Parses JSON on change. Tolerates mid-write parse errors silently. |
| `process-monitor` | Polls every 3 seconds. On Unix: `ps-list` for process list + `pidtree` for child PIDs. On Windows: `systeminformation.processes()` via WMI. Only emits an event when data changes (deep-equal check). |
| `system-monitor` | Polls every 5 seconds via `systeminformation`. Collects CPU load, memory used/total/free, process uptime. |
| `config-watcher` | Watches `config.json`, `mcp-config.json`, `agents/*.md`. Merges all three into a single `CopilotConfig` on any change. |

### WebSocket protocol

All messages are discriminated unions defined in `shared/src/types/ws-messages.ts`.

**Server → Client:**

```typescript
type ServerMessage =
  | { type: 'init';           payload: { logs, processes, sessions, metrics, config, networkEvents } }
  | { type: 'log-line';       payload: LogEntry }
  | { type: 'process-update'; payload: { processes: CopilotProcess[] } }
  | { type: 'session-update'; payload: { sessions: CopilotSession[] } }
  | { type: 'system-metrics'; payload: SystemMetrics }
  | { type: 'network-event';  payload: NetworkEvent }
  | { type: 'config-update';  payload: { config: CopilotConfig } }
```

On new WebSocket connection, the server immediately sends an `init` message with the current state of all services, so a reconnecting client gets the full picture instantly.

**Client → Server:**

```typescript
type ClientMessage =
  | { type: 'subscribe'; payload: { channels: string[] } }
  | { type: 'command';   payload: { action: string; args: Record<string, unknown> } }
  | { type: 'ping' }
```

### SSE endpoint

`GET /api/logs/stream` — a `text/event-stream` endpoint used exclusively by the **Terminal Output** panel. Each log line is emitted as a plain text `data:` event with ANSI formatting intact, rendered directly in xterm.js.

## Client

### WebSocket client (`lib/ws-client.ts`)

Singleton that manages the WebSocket lifecycle:
- Connects to `ws://localhost:3001`
- On disconnect: reconnects with exponential backoff — 1s, 2s, 4s, 8s, 16s, then cap at 30s
- Messages received before a reconnect are queued and flushed on reconnection
- Exposes `onMessage(handler)` and `onStatus(handler)` subscription methods

### Zustand store (`stores/dashboard-store.ts`)

Single store holding the entire dashboard state. Two slices are ring-buffered:
- `logs[]` — capped at 1,000 entries; oldest entry is dropped when full
- `networkEvents[]` — capped at 500 entries

The `handleServerMessage` action is the single entry point for all WebSocket messages.

### Panel layout

Panels are managed by `react-grid-layout`. The layout is stored in:
1. Zustand store (in memory, for React reactivity)
2. `localStorage` key `cockpit-layout` (persisted across page reloads)

The default layout is defined in `shared/src/types/dashboard.ts` as `DEFAULT_LAYOUT`.

## Shared types

`shared/src/types/` contains TypeScript types imported by both `client` and `server`:

```
copilot.ts      — CopilotProcess, CopilotSession, CopilotConfig, LogEntry, NetworkEvent, SystemMetrics
ws-messages.ts  — ServerMessage (discriminated union), ClientMessage
dashboard.ts    — PanelConfig, DashboardLayout, DEFAULT_LAYOUT
```

Vite resolves `@shared/*` to `../shared/src/*` via path alias. The server does the same in `tsconfig.json`.

## Cross-platform rules

All code follows these rules to ensure macOS/Linux/Windows compatibility:

1. **Paths** — always `path.join(os.homedir(), '.copilot', ...)`, never template strings with `/`
2. **Process monitoring** — `ps-list` on Unix, `systeminformation.processes()` on Windows
3. **Shell execution** — `execa` only (wraps `cross-spawn`), never raw `exec`
4. **Line endings** — `.replace(/\r\n/g, '\n')` before any log parsing
5. **File watchers** — one `chokidar.watch()` call per directory
6. **Home directory** — `os.homedir()`, never `process.env.HOME` (doesn't exist on Windows)
