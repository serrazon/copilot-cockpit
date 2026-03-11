# Getting Started

## 1. Install prerequisites

| Tool | Minimum version | How to get it |
|---|---|---|
| Node.js | 22.x | [nodejs.org](https://nodejs.org) |
| pnpm | 9.x | `sudo corepack enable pnpm` |
| Git | any | [git-scm.com](https://git-scm.com) |
| GitHub Copilot CLI | any | [GitHub Docs](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-in-the-command-line) *(optional)* |

> **Windows?** See the [Windows Setup Guide](Windows-Setup) — there are a few extra steps.

## 2. Clone and install

```bash
git clone https://github.com/serrazon/copilot-cockpit
cd copilot-cockpit
pnpm install
```

## 3. Start the dashboard

```bash
pnpm dev
```

Open **http://localhost:5173**.

The status indicator in the top-left corner should turn green (CONNECTED) within a second.

## 4. Get data flowing

Start Copilot CLI with debug logging:

```bash
copilot --log-level debug
```

Within seconds you'll see:
- **Terminal Output** and **Log Viewer** — live log lines
- **Process Tree** — `copilot` process and any MCP server children
- **Session Timeline** — a bar appears for each session

**System Metrics** (CPU, memory) appear immediately — they don't require Copilot CLI.

## 5. What if ~/.copilot doesn't exist yet?

That's fine. The backend checks every 10 seconds and starts watching as soon as the directory appears. You'll see messages like this in the server console:

```
[log-watcher] /home/you/.copilot/logs not found, retrying in 10s
```

Just start Copilot CLI and everything will connect automatically.

## 6. Customize the layout

Every panel is **draggable** (grab the grip icon in the header) and **resizable** (drag the bottom-right corner). Your layout is saved to `localStorage` and restored the next time you open the dashboard.

## Next steps

- [Configuration](Configuration) — environment variables, custom data paths
- [Architecture](Architecture) — how the data pipeline works
- [Troubleshooting](Troubleshooting) — if something isn't working
