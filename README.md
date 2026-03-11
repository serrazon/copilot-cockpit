
<div align="center">

```
 ██████╗ ██████╗ ██████╗ ██╗██╗      ██████╗ ████████╗
██╔════╝██╔═══██╗██╔══██╗██║██║     ██╔═══██╗╚══██╔══╝
██║     ██║   ██║██████╔╝██║██║     ██║   ██║   ██║
██║     ██║   ██║██╔═══╝ ██║██║     ██║   ██║   ██║
╚██████╗╚██████╔╝██║     ██║███████╗╚██████╔╝   ██║
 ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝ ╚═════╝    ╚═╝
              ██████╗ ██████╗  ██████╗██╗  ██╗██████╗██████╗ ████████╗
             ██╔════╝██╔═══██╗██╔════╝██║ ██╔╝██╔══██╗██║   ╚══██╔══╝
             ██║     ██║   ██║██║     █████╔╝ ██████╔╝██║      ██║
             ██║     ██║   ██║██║     ██╔═██╗ ██╔═══╝ ██║      ██║
             ╚██████╗╚██████╔╝╚██████╗██║  ██╗██║     ██████╗  ██║
              ╚═════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚═╝     ╚═════╝  ╚═╝
```

**◆ Mission Control for GitHub Copilot CLI ◆**

*Real-time dashboard. Deep-space aesthetic. Zero cloud. Runs on your machine.*

[![Node.js 22+](https://img.shields.io/badge/Node.js-22%2B-339933?style=flat-square&logo=nodedotjs)](https://nodejs.org)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![License MIT](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![macOS](https://img.shields.io/badge/macOS-supported-000?style=flat-square&logo=apple)](docs/wiki/Windows-Setup.md)
[![Windows](https://img.shields.io/badge/Windows-supported-0078D4?style=flat-square&logo=windows)](docs/wiki/Windows-Setup.md)

</div>

---

> You wouldn't pilot a spacecraft without a heads-up display.
> Why run Copilot CLI without one?

**Copilot Cockpit** is a local, real-time monitoring dashboard for the [GitHub Copilot CLI](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-in-the-command-line). It watches your machine's `~/.copilot/` directory and streams logs, session data, process trees, and system metrics straight to a drag-and-drop browser dashboard — styled like NASA JPL met a Bloomberg Terminal.

No telemetry. No cloud. No accounts. Just you and your machine.

---

## What's on the screen

```
┌─── ◆ COPILOT COCKPIT ─────────────────── 2026-03-11 23:51:16Z ─── 3 PROCESSES | 1 ACTIVE SESSION ───┐
│ ● CONNECTED   CPU 12%   MEM 58%   PROCS 3   SESSIONS 1/2   UP 4h 22m                                 │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ╔══ TERMINAL OUTPUT ═══════════════╗  ╔══ PROCESS TREE ══════════════════════════════════════════╗  │
│ ║ [INFO] copilot: session started  ║  ║ ▼ copilot  pid:4821  CPU 5.2%  MEM 142M  3m 12s         ║  │
│ ║ [DEBUG] mcp: connected to server ║  ║   ▼ node   pid:4830  CPU 1.1%  MEM  48M  3m 10s         ║  │
│ ║ [INFO] model: claude-3.5-sonnet  ║  ║     node   pid:4831  CPU 0.0%  MEM  31M  3m 10s         ║  │
│ ╚══════════════════════════════════╝  ╚══════════════════════════════════════════════════════════╝  │
│ ╔══ SESSION TIMELINE ══════════════╗  ╔══ NETWORK INSPECTOR ═════════════════════════════════════╗  │
│ ║ ████████░░░░ active  claude-3.5  ║  ║ 23:51 POST /completions  200  342ms  2.1K               ║  │
│ ║ ████████████ ended   gpt-4o      ║  ║ 23:49 GET  /auth/token   200   88ms  0.5K               ║  │
│ ╚══════════════════════════════════╝  ╚══════════════════════════════════════════════════════════╝  │
│ ╔══ LOG VIEWER ════════════════════════════════╗  ╔══ SYSTEM METRICS ══════════════════════════╗   │
│ ║ [debug][info][warn][error]  filter...  ⬇pin  ║  ║  CPU  12%  ▁▂▃▂▁▃▄▂▁▂   MEM  58%  ██░░░  ║   │
│ ║ 23:51:16 INFO  session  Session started      ║  ║  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ║   │
│ ║ 23:51:17 DEBUG mcp      Stdio connected      ║  ║  │  12% │  │  58% │  │   3  │  │   1  │  ║   │
│ ║ 23:51:18 INFO  model    Using claude-3.5     ║  ║  │ CPU  │  │  MEM │  │PROCS │  │ SESS │  ║   │
│ ╚══════════════════════════════════════════════╝  ╚═══════════════════════════════════════════╝   │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Panels

| Panel | What it shows |
|---|---|
| **Terminal Output** | Live xterm.js feed of Copilot CLI log output with ANSI colors |
| **Log Viewer** | Filterable, searchable log stream — filter by level, search by text, pin to bottom |
| **Process Tree** | Copilot CLI + all spawned MCP server child processes with CPU/mem |
| **Session Timeline** | Horizontal timeline of Copilot sessions with model, duration, interaction count |
| **Network Inspector** | Intercepted API calls to `api.githubcopilot.com` — method, status, latency, size |
| **System Metrics** | 60-second rolling CPU sparkline, memory bar, KPI cards with alert glow |

All panels are **draggable, resizable**, and layout is **persisted to localStorage**.

---

## Quick Start

### Prerequisites

- **Node.js 22+** — [nodejs.org](https://nodejs.org)
- **pnpm** — `sudo corepack enable pnpm` (comes with Node.js)
- **GitHub Copilot CLI** — for real data (not required to run the dashboard)

### Install & Run

```bash
git clone https://github.com/serrazon/copilot-cockpit
cd copilot-cockpit
pnpm install
pnpm dev
```

Open **http://localhost:5173**

The dashboard runs entirely on `localhost`. Nothing leaves your machine.

### Get data flowing

Start Copilot CLI with debug logging enabled:

```bash
# macOS / Linux
copilot --log-level debug

# Windows (PowerShell)
copilot --log-level debug
```

Logs, sessions, and process data will appear in the panels within seconds.

---

## Platform Support

| Platform | Status | Notes |
|---|---|---|
| macOS | **Full support** | All panels live |
| Linux | **Full support** | All panels live |
| Windows | **Full support** | See [Windows Setup Guide](docs/wiki/Windows-Setup.md) |

> **Windows users:** there are a few extra setup steps. Read the [Windows Setup Guide](docs/wiki/Windows-Setup.md) before you start.

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `COPILOT_HOME` | `~/.copilot` | Override the Copilot data directory |
| `PORT` | `3001` | Backend server port |
| `ENABLE_PROXY` | _(unset)_ | Set to `true` to start the HTTP proxy on port 8888 |

```bash
# Example: custom Copilot path, custom port
COPILOT_HOME=D:\Users\me\.copilot PORT=4000 pnpm dev:server
```

---

## Commands

```bash
pnpm dev           # Start backend + frontend together
pnpm dev:server    # Backend only  (http://localhost:3001)
pnpm dev:client    # Frontend only (http://localhost:5173)
pnpm build         # Production build
pnpm typecheck     # TypeScript strict check across all packages
pnpm test          # All tests (node:test + vitest) — 24 tests
pnpm test:server   # Backend unit tests (node:test)
pnpm test:client   # Frontend unit tests (vitest + jsdom)
```

---

## How it works

```
~/.copilot/
├── logs/                        ← chokidar watches, reads only new bytes
├── session-state/*.json         ← parsed on every change
├── command-history-state.json   ← tracked for session data
├── config.json                  ← reloaded on change
├── mcp-config.json              ← reloaded on change
└── agents/*.md                  ← agent definitions listed

          Every event ──→ EventEmitter ──→ WebSocket broadcast ──→ Zustand store ──→ React panels
                                     ↘──→ SSE stream ──→ xterm.js terminal
```

- **Log tailing** reads only new bytes from each file (`createReadStream({ start: lastSize })`), handles file rotation, normalizes CRLF
- **Process monitoring** uses `ps-list` + `pidtree` on macOS/Linux; falls back to `systeminformation` WMI on Windows
- **WebSocket client** reconnects with exponential backoff (1s → 2s → 4s → 8s → max 30s)
- **Zustand store** caps logs at 1,000 entries and network events at 500 (ring buffer)

---

## Project Structure

```
copilot-cockpit/
├── client/                    # React 19 SPA (Vite 6)
│   └── src/
│       ├── components/
│       │   ├── layout/        # DashboardGrid (react-grid-layout), PanelWrapper
│       │   └── panels/        # LogViewer, ProcessTree, TerminalPanel,
│       │                      # MetricsPanel, SessionTimeline, NetworkInspector
│       ├── lib/               # ws-client — typed WebSocket with reconnection
│       └── stores/            # Zustand dashboard store
├── server/                    # Express + WebSocket backend
│   └── src/
│       ├── services/          # log-watcher, session-watcher, process-monitor,
│       │                      # system-monitor, config-watcher, copilot-paths
│       └── index.ts           # HTTP + WebSocket + SSE server
├── shared/                    # TypeScript types shared between client & server
│   └── src/types/
│       ├── ws-messages.ts     # Discriminated union of all WebSocket messages
│       ├── copilot.ts         # CopilotProcess, CopilotSession, LogEntry, ...
│       └── dashboard.ts       # PanelConfig, DashboardLayout, DEFAULT_LAYOUT
└── docs/
    ├── wiki/                  # Full documentation
    │   ├── Home.md
    │   ├── Windows-Setup.md
    │   ├── Getting-Started.md
    │   ├── Architecture.md
    │   ├── Configuration.md
    │   └── Troubleshooting.md
    └── implementation-plan.md
```

---

## Stack

| | |
|---|---|
| **Frontend** | React 19, Vite 6, TypeScript strict mode |
| **Styling** | Tailwind v4, deep-space dark theme, JetBrains Mono + Space Grotesk |
| **State** | Zustand with ring-buffered log/network slices |
| **Layout** | react-grid-layout — draggable, resizable, localStorage-persisted |
| **Terminal** | xterm.js with FitAddon, connected to SSE log stream |
| **Backend** | Express 4, ws (WebSocket), SSE |
| **Watchers** | chokidar v4 — single instance per directory |
| **Processes** | ps-list + pidtree (Unix) / systeminformation WMI (Windows) |
| **Types** | Fully shared TypeScript discriminated unions |
| **Tests** | node:test (server) + vitest + jsdom (client) |

---

## Contributing

PRs welcome. Read [CLAUDE.md](CLAUDE.md) for architecture conventions before submitting.

---

<div align="center">

Made with ☕ and too many terminal windows open.

*Not affiliated with GitHub or Microsoft.*

</div>
