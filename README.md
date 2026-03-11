# Copilot Cockpit

> **Space Mission Control** dashboard for GitHub Copilot CLI sessions.

Real-time local monitoring dashboard that watches `~/.copilot/` for logs, session state, process activity, and config changes — streaming everything to a React SPA via WebSocket.

```
┌──────────────── BROWSER (React 19 + Vite 6) ────────────────┐
│  react-grid-layout (draggable, resizable panels)             │
│  ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  xterm.js │ │ Metrics  │ │ Process  │ │ Session      │  │
│  │  Terminal  │ │ Sparkline│ │ Tree     │ │ Timeline     │  │
│  └───────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│  ┌──────────────────────┐  ┌──────────────────────────┐     │
│  │  Log Viewer (filter) │  │  Network Inspector       │     │
│  └──────────────────────┘  └──────────────────────────┘     │
└───────┬──── WebSocket (ws) ────┬──── SSE (EventSource) ─────┘
        │                       │
┌───────┴───────────────────────┴──────────────────────────────┐
│                    Node.js BACKEND (Express)                  │
│  chokidar ──→ watches ~/.copilot/logs/, session-state/       │
│  createReadStream ──→ tails log files from last position     │
│  systeminformation ──→ CPU, memory metrics                   │
│  ps-list + pidtree ──→ copilot process tree                  │
└──────────────────────────────────────────────────────────────┘
```

## Prerequisites

- **Node.js 22+**
- **pnpm** — `npm install -g pnpm` or via [corepack](https://nodejs.org/api/corepack.html)
- **GitHub Copilot CLI** — optional but required for real data

## Quick Start

```bash
git clone https://github.com/serrazon/copilot-cockpit
cd copilot-cockpit
pnpm install
pnpm dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api/health

## Enable Debug Logging in Copilot CLI

```bash
copilot --log-level debug --log-dir ~/.copilot/logs/
```

The Log Viewer and Terminal panels will start populating immediately.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `COPILOT_HOME` | `~/.copilot` | Override the Copilot data directory |
| `PORT` | `3001` | Backend server port |
| `ENABLE_PROXY` | `false` | Start HTTP MITM proxy on port 8888 for network monitoring |

```bash
# Example: custom data dir + proxy
COPILOT_HOME=/tmp/my-copilot PORT=4000 pnpm dev:server
```

## Network Monitoring

To capture API traffic to `api.githubcopilot.com`:

```bash
HTTPS_PROXY=http://localhost:8888 copilot --log-level debug
```

Start the proxy from the Network Inspector panel (requires `ENABLE_PROXY=true`).

## Commands

```bash
pnpm dev           # Start both backend (3001) and frontend (5173)
pnpm dev:server    # Backend only
pnpm dev:client    # Frontend only
pnpm build         # Production build
pnpm typecheck     # TypeScript check all packages
pnpm test          # Run all tests (node:test + vitest)
pnpm test:server   # Backend tests only
pnpm test:client   # Frontend tests only
```

## Cross-Platform Notes

- All file paths use `path.join()` — never string concatenation
- On Windows: process monitoring falls back to `systeminformation.processes()` (WMI)
- Log parsing normalizes CRLF → LF
- Single chokidar instance per directory (avoids missed events on Windows)
- `~` resolution uses `os.homedir()` on all platforms

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 6, TypeScript strict |
| UI | Tailwind v4, shadcn-style components |
| Charts | Custom SVG sparklines |
| Terminal | xterm.js + FitAddon |
| State | Zustand (ring-buffered slices) |
| Grid | react-grid-layout (draggable, resizable, localStorage) |
| Backend | Express, ws (WebSocket), SSE |
| Watchers | chokidar v4 |
| Processes | ps-list + pidtree + systeminformation |
| Types | Shared TypeScript discriminated unions |

## Project Structure

```
copilot-cockpit/
├── client/               # React SPA (Vite)
│   └── src/
│       ├── components/
│       │   ├── layout/   # DashboardGrid, PanelWrapper
│       │   └── panels/   # LogViewer, ProcessTree, TerminalPanel, MetricsPanel, ...
│       ├── lib/          # ws-client (reconnecting WebSocket)
│       └── stores/       # Zustand dashboard store
├── server/               # Express backend
│   └── src/
│       └── services/     # log-watcher, session-watcher, process-monitor, ...
├── shared/               # TypeScript types (ws-messages, copilot, dashboard)
└── docs/                 # Implementation plan
```
