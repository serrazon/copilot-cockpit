# Copilot Cockpit — Implementation Plan

> **Purpose**: This file is the master build plan for the Copilot Cockpit dashboard.
> Feed it to Claude Code or GitHub Copilot CLI as context, then execute prompts sequentially.
> Each prompt builds on the previous step's output. Git commit after each successful step.

---

## Overview

A local real-time monitoring dashboard for GitHub Copilot CLI sessions, styled as a space Cockpit center. The dashboard watches `~/.copilot/` for logs, session state, config changes, and process activity, streaming everything to a React SPA via WebSocket and SSE.

---

## Architecture

```
┌──────────────── BROWSER (React 19 + Vite 6) ────────────────┐
│  react-grid-layout (draggable panels)                        │
│  ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  xterm.js │ │ Recharts │ │ Process  │ │ Session      │  │
│  │  Terminal  │ │ Metrics  │ │ Table    │ │ Timeline     │  │
│  └───────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│  ┌──────────────────────┐  ┌──────────────────────────┐     │
│  │  Log Viewer (ANSI)   │  │  Network Inspector       │     │
│  └──────────────────────┘  └──────────────────────────┘     │
│  UI: shadcn/ui + Tailwind v4 + ARWES sci-fi accents         │
│  State: Zustand          Theme: Deep-space dark palette      │
└───────┬──── WebSocket (ws) ────┬──── SSE (EventSource) ─────┘
        │    bidirectional       │    server → client only
┌───────┴────────────────────────┴─────────────────────────────┐
│                    Node.js BACKEND (Express)                  │
│  chokidar v5 ──→ watches ~/.copilot/logs/, session-state/    │
│  fs.createReadStream ──→ tails log files from last position  │
│  systeminformation ──→ CPU, memory, disk, network metrics    │
│  ps-list + pidtree ──→ copilot process tree monitoring       │
│  http-mitm-proxy ──→ intercepts Copilot API traffic (opt.)   │
│  execa ──→ cross-platform shell command execution            │
└──────────────────────────────────────────────────────────────┘
```

---

## Dependency Manifest

```json
{
  "frontend": {
    "react": "^19.0.0", "react-dom": "^19.0.0", "vite": "^6.0.0",
    "typescript": "^5.5.0", "tailwindcss": "^4.0.0", "zustand": "^5.0.0",
    "react-grid-layout": "^2.0.0", "@xterm/xterm": "^5.5.0",
    "react-xtermjs": "^1.0.0", "@xterm/addon-fit": "^0.10.0",
    "recharts": "^3.0.0", "@tremor/react": "^3.18.0",
    "lucide-react": "latest", "framer-motion": "^11.0.0",
    "class-variance-authority": "^0.7.0", "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0"
  },
  "backend": {
    "express": "^4.21.0", "ws": "^8.18.0", "chokidar": "^5.0.0",
    "systeminformation": "^5.23.0", "ps-list": "^8.1.1",
    "pidtree": "^0.6.0", "find-process": "^2.1.0", "cors": "^2.8.5",
    "execa": "^9.0.0", "cross-spawn": "^7.0.0", "http-mitm-proxy": "latest"
  },
  "shared": {
    "cross-env": "^7.0.3", "rimraf": "^5.0.0", "concurrently": "^8.0.0"
  }
}
```

---

## Space Theme CSS Variables

```css
.dark {
  --background: oklch(0.13 0.02 260);    /* deep space navy */
  --foreground: oklch(0.85 0.03 200);    /* cool cyan-white */
  --primary: oklch(0.65 0.20 195);       /* teal/cyan accent */
  --accent: oklch(0.70 0.15 145);        /* status green */
  --destructive: oklch(0.65 0.25 25);    /* alert red */
  --muted: oklch(0.25 0.01 260);         /* panel backgrounds */
  --border: oklch(0.30 0.05 220);        /* glowing borders */
}
```

Fonts: JetBrains Mono (terminal/code), Space Grotesk (headings), Inter (body).

---

## Copilot CLI Data Sources

The new standalone `copilot` CLI stores everything under `~/.copilot/`:

1. **Debug logs** (`~/.copilot/logs/`) — Launch with `copilot --log-level debug --log-dir ~/.copilot/logs/`
2. **Session state** (`~/.copilot/session-state/`) — JSON session artifacts, `command-history-state.json`
3. **Network traffic** — API requests to `api.githubcopilot.com`, interceptable via `HTTPS_PROXY`
4. **Process tree** — CLI spawns MCP servers as child processes; monitorable via `pidtree`
5. **Config** — `~/.copilot/config.json`, `mcp-config.json`, `~/.copilot/agents/*.md`

---

## Cross-Platform Rules

1. **Paths**: Always `path.join(os.homedir(), '.copilot', ...)` — never string concatenation with `/`
2. **Process monitoring**: `ps-list` lacks `cmd`/`cpu`/`memory` on Windows — fall back to `systeminformation.processes()` via WMI
3. **Shell execution**: Use `execa` (wraps `cross-spawn`) — never raw string shell commands
4. **Line endings**: Always `.replace(/\r\n/g, '\n')` when parsing logs
5. **File watchers**: Single chokidar instance per directory to avoid missed events on Windows

---

## Build Sequence — 8 Prompts

Execute these sequentially in Claude Code. After each, verify the output works before proceeding.

---

### PROMPT 0 — Project Scaffolding and Tooling

```
Create a new monorepo project called "copilot-mission-control" with this structure:

/client — React 19 + Vite 6 + TypeScript SPA
/server — Node.js + Express + TypeScript backend
/shared — shared TypeScript types

Set up:
1. Root package.json with workspaces for client, server, shared
2. pnpm as package manager
3. Root tsconfig.json with strict mode, path aliases for @shared/*
4. ESLint flat config + Prettier
5. Root scripts: "dev" runs both client (port 5173) and server (port 3001) via concurrently
6. Install ALL these exact dependencies:

Client: react, react-dom, vite, typescript, tailwindcss v4, zustand,
react-grid-layout, @xterm/xterm, react-xtermjs, @xterm/addon-fit,
recharts, @tremor/react, lucide-react, framer-motion, clsx,
tailwind-merge, class-variance-authority

Server: express, ws, chokidar, systeminformation, ps-list, pidtree,
find-process, cors, execa, cross-spawn

Shared: (no runtime deps, just TypeScript types)

Root dev: cross-env, rimraf, concurrently, @types/node, @types/express,
@types/ws, @types/react, @types/react-dom, @types/react-grid-layout

7. Create a minimal working app: Express serves health check at GET /api/health,
   React app renders "Cockpit Online" centered on screen.
8. Verify both `pnpm dev` and `pnpm build` work without errors.

Do NOT use Next.js, do NOT use SSR. This is a pure client-side SPA with a
separate backend. Read CLAUDE.md for full conventions.
```

---

### PROMPT 1 — Shared Types and WebSocket Protocol

```
In the /shared directory, create a comprehensive TypeScript type system for the
entire dashboard. Read the existing project structure first.

Create shared/types/ws-messages.ts with a discriminated union of all WebSocket
message types:

- ServerMessage (server → client):
  - { type: 'log-line', payload: { source: string, line: string, timestamp: number, level: 'debug'|'info'|'warn'|'error' } }
  - { type: 'process-update', payload: { processes: CopilotProcess[] } }
  - { type: 'session-update', payload: { sessions: CopilotSession[] } }
  - { type: 'system-metrics', payload: { cpu: number, memory: { used: number, total: number }, uptime: number } }
  - { type: 'network-event', payload: { method: string, url: string, status: number, duration: number, size: number, timestamp: number } }
  - { type: 'config-update', payload: { config: CopilotConfig } }
  - { type: 'init', payload: { ... all current state ... } }

- ClientMessage (client → server):
  - { type: 'subscribe', payload: { channels: string[] } }
  - { type: 'command', payload: { action: string, args: Record<string, unknown> } }

Create shared/types/copilot.ts with:
  - CopilotProcess: { pid, name, cmd, cpu, memory, children: CopilotProcess[], startTime }
  - CopilotSession: { id, startTime, interactions: number, model: string, status: 'active'|'idle'|'ended' }
  - CopilotConfig: { trustedFolders, defaultModel, mcpServers: McpServerConfig[], agents: AgentDef[] }
  - McpServerConfig: { name, type: 'stdio'|'http'|'sse', command?, url?, args? }
  - NetworkEvent, LogEntry, SystemMetrics types

Create shared/types/dashboard.ts with:
  - PanelConfig: { id, type, title, position: GridPosition, size: GridSize }
  - DashboardLayout: PanelConfig[]
  - Default layout constant with 6 panels

Export everything from shared/index.ts. Ensure the types compile cleanly with
pnpm typecheck.
```

---

### PROMPT 2 — Backend Core: File Watchers, Log Tailing, Process Monitoring

```
Build the backend monitoring engine. Read all existing code first, especially the
shared types.

Create these server modules:

1. server/services/copilot-paths.ts
   - Cross-platform path resolver using os.homedir() and process.platform
   - Resolves: COPILOT_HOME (~/.copilot or COPILOT_HOME env), logs dir,
     session-state dir, config.json, mcp-config.json, command-history-state.json
   - Returns all paths as a typed object
   - Respects COPILOT_HOME env override

2. server/services/log-watcher.ts
   - Uses chokidar to watch the copilot logs directory
   - Implements efficient log tailing: tracks file size per file, on 'change'
     event reads only new bytes using fs.createReadStream({ start: lastSize })
   - Parses log lines to extract level (debug/info/warn/error) and timestamp
   - Emits typed LogEntry events via EventEmitter
   - Normalizes line endings (.replace(/\r\n/g, '\n'))
   - Handles file rotation (size decreases = new file, reset position)

3. server/services/session-watcher.ts
   - Watches ~/.copilot/session-state/ and command-history-state.json
   - Parses JSON session files on change
   - Emits CopilotSession[] updates
   - Handles JSON parse errors gracefully (files may be mid-write)

4. server/services/process-monitor.ts
   - Polls every 3 seconds using ps-list
   - Filters for processes matching: 'copilot', 'gh', node processes with
     'copilot' in command line
   - Uses pidtree to build process tree from copilot parent PID
   - Uses systeminformation for CPU and memory per-process
   - Emits CopilotProcess[] updates (only when data changes to avoid noise)

5. server/services/system-monitor.ts
   - Polls every 5 seconds using systeminformation
   - Collects: currentLoad, mem, fsSize, networkStats
   - Emits SystemMetrics updates

6. server/services/config-watcher.ts
   - Watches config.json and mcp-config.json with chokidar
   - Parses and emits CopilotConfig on change
   - Also reads ~/.copilot/agents/*.md and lists available agents

7. server/index.ts — Main Express server
   - CORS enabled for localhost:5173
   - REST endpoints: GET /api/health, GET /api/config, GET /api/processes
   - WebSocket server on same port (upgrade handler)
   - SSE endpoint: GET /api/logs/stream
   - On WS connection: send 'init' message with current state from all services
   - Forward all service events to connected WS clients as typed ServerMessage
   - Graceful shutdown: close watchers, kill intervals, close connections

Test by running `pnpm dev:server` and verifying the health endpoint and that
watchers start without errors (even if ~/.copilot doesn't exist yet — handle
gracefully).
```

---

### PROMPT 3 — Frontend Foundation: Layout Engine and Panel System

```
Build the frontend dashboard shell. Read all existing code and shared types first.

1. client/lib/ws-client.ts
   - WebSocket client with typed message handling
   - Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s)
   - Connection status tracking: 'connecting' | 'connected' | 'disconnected'
   - Message queue for offline buffering
   - Returns a Zustand-compatible API

2. client/stores/dashboard-store.ts (Zustand)
   - State: logs: LogEntry[], processes: CopilotProcess[], sessions: CopilotSession[],
     metrics: SystemMetrics | null, config: CopilotConfig | null,
     networkEvents: NetworkEvent[], connectionStatus, layout: DashboardLayout
   - Actions: addLog, updateProcesses, updateSessions, updateMetrics,
     updateConfig, addNetworkEvent, updateLayout
   - Logs capped at 1000 entries (ring buffer behavior)
   - Network events capped at 500

3. client/components/layout/DashboardGrid.tsx
   - Uses react-grid-layout with responsive breakpoints
   - Renders panels based on DashboardLayout from store
   - Draggable, resizable panels
   - Saves layout to localStorage on change
   - Default 6-panel layout: Terminal (top-left, 6x4), Processes (top-right, 6x4),
     Logs (bottom-left, 8x3), Metrics (bottom-right, 4x3),
     Sessions (mid-left, 6x3), Network (mid-right, 6x3)

4. client/components/layout/PanelWrapper.tsx
   - Wraps each panel with styled container
   - Header bar with panel title, collapse/expand button, drag handle
   - Styled with shadcn Card + custom space theme border glow

5. client/components/StatusBar.tsx
   - Top bar showing: connection status (green/red dot), system CPU%, memory%,
     copilot process count, uptime
   - Uses Tremor Badge and Metric components

6. client/App.tsx
   - Dark theme provider
   - Initializes WebSocket connection
   - Renders StatusBar + DashboardGrid
   - Full-screen dark background with subtle grid pattern

7. Set up Tailwind v4 with the space theme CSS variables from the plan.
   Use JetBrains Mono font (via Google Fonts) for monospace, Inter for UI text.

Verify the dashboard renders with placeholder content in each panel and that the
grid is draggable. The WebSocket client should show 'connecting' status.
```

---

### PROMPT 4 — Panel Components: Log Viewer, Process Tree, Terminal, Metrics

```
Build the four core panel components. Read all existing code first.

1. client/components/panels/LogViewer.tsx
   - Subscribes to logs from dashboard store
   - Virtualized list (use a simple windowing approach or react-window)
   - Each log line shows: timestamp (HH:MM:SS.ms), level badge (color-coded:
     debug=gray, info=cyan, warn=amber, error=red), source file, message text
   - Auto-scroll to bottom (with "pinned to bottom" toggle)
   - Filter controls: level filter checkboxes, text search input
   - Monospace font (JetBrains Mono), ANSI color support if feasible
   - Empty state: "Waiting for Copilot CLI logs... Start copilot with
     --log-level debug to see activity here"

2. client/components/panels/ProcessTree.tsx
   - Subscribes to processes from dashboard store
   - Renders as a tree view showing parent copilot process and children
   - Each process shows: PID, name, CPU %, memory MB, runtime duration
   - Status indicators: green dot for running, red for stopped
   - CPU and memory as small inline sparklines (Tremor SparkAreaChart)
   - Expand/collapse for child processes
   - Empty state: "No Copilot processes detected"

3. client/components/panels/TerminalPanel.tsx
   - Embeds xterm.js via react-xtermjs
   - Connects to a new SSE stream at /api/logs/stream
   - Renders log output as terminal text with ANSI colors
   - Fit addon for auto-resizing when panel is resized
   - Terminal theme matching the space palette (dark bg, cyan text, green prompt)
   - Scrollback buffer of 5000 lines

4. client/components/panels/MetricsPanel.tsx
   - System metrics display using Tremor components
   - CPU usage: AreaChart with 60-second rolling window
   - Memory: DonutChart showing used/free/cached
   - 4 KPI cards: CPU %, Memory %, Copilot Processes, Active Sessions
   - Pulsing glow effect on cards when values are high (CPU > 80%, etc.)

Wire all panels into the DashboardGrid with proper panel type routing.
Verify everything renders and updates when mock data is pushed through the store.
```

---

### PROMPT 5 — Session Timeline, Network Inspector, and Full Data Pipeline

```
Build the remaining two panels and connect the full data pipeline. Read all code.

1. client/components/panels/SessionTimeline.tsx
   - Horizontal timeline showing Copilot sessions
   - Each session as a colored bar: active=cyan, idle=gray, ended=dim
   - Hover tooltip: session ID, model name, interaction count, duration
   - Click to expand: shows list of interactions within that session
   - Time axis at bottom with human-readable labels
   - Current time indicator (moving vertical line)
   - Use Recharts for the timeline rendering or a custom SVG approach
   - Empty state: "No sessions recorded yet"

2. client/components/panels/NetworkInspector.tsx
   - Table of intercepted HTTP requests (from network events in store)
   - Columns: Timestamp, Method (badge), URL (truncated), Status (color-coded),
     Duration (ms), Size (KB)
   - Click row to expand: shows full URL, request headers, response preview
   - Filter by: endpoint type (completions, chat, telemetry, auth)
   - Sort by timestamp descending (newest first)
   - Color coding: 2xx=green, 4xx=amber, 5xx=red
   - Note at top: "Enable network monitoring: set HTTPS_PROXY=http://localhost:8888
     before starting copilot"
   - Empty state with setup instructions

3. Connect the FULL data pipeline end-to-end:
   - server/index.ts initializes all service watchers on startup
   - All service events are forwarded through WebSocket to connected clients
   - client ws-client receives messages and dispatches to Zustand store
   - Each panel component subscribes to its relevant store slice
   - SSE endpoint streams log lines independently for the terminal panel

4. Add graceful error handling:
   - Backend: if ~/.copilot doesn't exist, log warning and retry watching
     every 10 seconds
   - Frontend: show informative messages when data is unavailable
   - WebSocket: reconnection indicator in StatusBar

Test the full pipeline: start backend, start frontend, verify panels show
real data (or appropriate empty states). If copilot is installed, run
`copilot --log-level debug` in another terminal and verify logs appear.
```

---

### PROMPT 6 — Space Control Center Styling and Animations

```
Apply the full space Cockpit visual theme. Read all existing code first.
This prompt is purely visual — do not change any functionality.

1. Global theme enhancements:
   - Background: deep navy (#0a0e1a) with subtle CSS grid overlay
     (faint lines every 50px, opacity 0.05)
   - All panel borders: 1px solid with subtle cyan glow (box-shadow: 0 0 10px
     rgba(0, 200, 255, 0.15))
   - Panel headers: slightly lighter background with a thin bottom border,
     uppercase tracking-wider text
   - Scanline animation: very subtle horizontal scanlines moving slowly upward
     across the entire viewport (CSS animation, opacity 0.02 — almost invisible)

2. Status indicators:
   - All status dots should pulse: CSS animation with opacity and scale
   - Connected = cyan pulse, Disconnected = red pulse, Warning = amber pulse
   - Add a subtle "breathing" glow to the entire StatusBar border

3. Typography refinements:
   - Import JetBrains Mono and Space Grotesk from Google Fonts
   - Panel titles: Space Grotesk, 0.75rem, uppercase, letter-spacing 0.15em
   - Log text: JetBrains Mono, 0.8rem
   - KPI numbers: JetBrains Mono, 2rem, bold

4. Chart styling:
   - All Recharts/Tremor charts: transparent background, cyan/teal color palette
   - Grid lines: very faint (opacity 0.1)
   - Tooltip: dark glass-morphism style (backdrop-filter: blur(12px))
   - Area fills: gradient from cyan at 0.3 opacity to transparent

5. Panel transitions:
   - Panels fade in with a 200ms stagger on initial load (framer-motion)
   - New log lines slide in from the right (subtle, fast)
   - Process status changes flash briefly

6. Add a header component at the very top:
   - Left: "◆ COPILOT Cockpit" in Space Grotesk, tracking-widest
   - Center: current date/time in UTC format, updating every second
   - Right: system status summary (e.g., "5 PROCESSES | 2 ACTIVE SESSIONS")
   - Thin line below with gradient from transparent → cyan → transparent

Verify the dashboard looks cohesive and dramatic but still readable and
functional. The aesthetic should feel like NASA JPL meets Bloomberg Terminal.
```

---

### PROMPT 7 — Optional Network Proxy, Tests, and README

```
Add the optional HTTP proxy interceptor and basic tests. Read all existing code.

1. server/services/network-proxy.ts (OPTIONAL MODULE — disabled by default)
   - Uses http-mitm-proxy to create a local HTTPS proxy on port 8888
   - Only starts if ENABLE_PROXY=true is set in environment
   - Intercepts requests to: *.githubcopilot.com, *copilot*.githubusercontent.com,
     api.github.com/copilot_internal/*
   - For each intercepted request, emits NetworkEvent with:
     method, url, status code, response time, response size
   - Passes through all traffic unmodified (read-only monitoring)
   - Generates self-signed CA cert on first run, stores in ~/.copilot-monitor/certs/
   - Prints instructions to stdout on how to trust the CA cert on macOS vs Windows

2. server/services/proxy-manager.ts
   - Manages proxy lifecycle: start, stop, status
   - Exposes REST endpoints: POST /api/proxy/start, POST /api/proxy/stop,
     GET /api/proxy/status
   - Integrates with WebSocket to broadcast NetworkEvent to dashboard

3. Update client NetworkInspector panel:
   - Add a "Start Proxy" / "Stop Proxy" toggle button
   - Show proxy status in the panel header
   - When proxy is running, show setup instructions:
     "Run: HTTPS_PROXY=http://localhost:8888 copilot"

4. Write tests:
   - server/__tests__/copilot-paths.test.ts — verify path resolution on
     current platform, verify COPILOT_HOME override
   - server/__tests__/log-watcher.test.ts — create temp log file, write lines,
     verify events emitted with correct content
   - server/__tests__/process-monitor.test.ts — verify filter logic with mock
     process list
   - client/__tests__/dashboard-store.test.ts — verify ring buffer behavior,
     message dispatching
   - Use Node.js built-in test runner (node --test) for backend,
     Vitest for frontend

5. Add to package.json: "test" script that runs both backend and frontend tests.

6. Create a README.md with:
   - Project description and screenshot placeholder
   - Prerequisites: Node.js 22+, pnpm, GitHub Copilot CLI
   - Quick start: pnpm install && pnpm dev
   - Architecture diagram (ASCII)
   - Configuration: env vars (COPILOT_HOME, ENABLE_PROXY, PORT)
   - How to enable debug logging in Copilot CLI
   - Cross-platform notes

Verify all tests pass on the current platform.
```

---

## How to Start

1. Place `CLAUDE.md` at the project root
2. Place this file at `docs/implementation-plan.md`
3. Open Claude Code in the project directory
4. First prompt: `Read docs/implementation-plan.md — it contains the full 8-step build plan. Start with Prompt 0 (project scaffolding). Follow the plan exactly.`
5. After each prompt completes successfully, git commit, then say: `Continue with Prompt N from docs/implementation-plan.md`
6. If context gets long, start a fresh Claude Code session and say: `Read docs/implementation-plan.md and CLAUDE.md. Continue from Prompt N.`

---

## Alternative: Using GitHub Copilot CLI on Windows

The same prompts work in Copilot CLI with these adjustments:
- Copy CLAUDE.md content into `.github/copilot-instructions.md`
- Prefix each prompt with "Read the existing codebase first"
- Use Shift+Tab for Plan mode before each implementation step
- Keep prompts focused on one feature at a time (smaller context window)
