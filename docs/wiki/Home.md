# Copilot Cockpit Wiki

Welcome to the Copilot Cockpit documentation. Use the sidebar to navigate.

## Pages

| Page | Description |
|---|---|
| [Getting Started](Getting-Started) | Install and run for the first time |
| [Windows Setup](Windows-Setup) | Step-by-step guide for Windows users |
| [Architecture](Architecture) | How the data pipeline works |
| [Configuration](Configuration) | All environment variables and options |
| [Troubleshooting](Troubleshooting) | Common problems and how to fix them |

## What is Copilot Cockpit?

Copilot Cockpit is a local, real-time monitoring dashboard for the GitHub Copilot CLI. It runs entirely on your own machine — no accounts, no cloud, no telemetry.

When you start Copilot CLI with debug logging enabled, the dashboard populates in real time with:

- **Logs** — every debug, info, warn, and error line streamed live
- **Processes** — the Copilot CLI process and all MCP server child processes it spawns
- **Sessions** — a timeline of your Copilot conversations with model names and interaction counts
- **Metrics** — CPU, memory, and system uptime from your local machine
- **Network** — intercepted API calls to `api.githubcopilot.com` (requires optional proxy)

## Supported Platforms

- **macOS** — full support, all panels
- **Linux** — full support, all panels
- **Windows 10/11** — full support, see [Windows Setup](Windows-Setup) for extra steps

## Quick links

- [GitHub Repository](https://github.com/serrazon/copilot-cockpit)
- [Report an issue](https://github.com/serrazon/copilot-cockpit/issues)
- [Implementation Plan](../implementation-plan.md)
