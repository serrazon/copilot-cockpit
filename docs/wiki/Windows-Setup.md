# Windows Setup Guide

This guide covers everything you need to run Copilot Cockpit on Windows 10 or Windows 11.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Install Node.js](#2-install-nodejs)
3. [Enable pnpm](#3-enable-pnpm)
4. [Clone and Install](#4-clone-and-install)
5. [Start the Dashboard](#5-start-the-dashboard)
6. [Enable Copilot Debug Logging](#6-enable-copilot-debug-logging)
7. [Where Windows Differs from macOS/Linux](#7-where-windows-differs)
8. [Optional: Network Monitoring](#8-optional-network-monitoring)
9. [Running Automatically at Startup](#9-running-automatically-at-startup)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

| Requirement | Version | Download |
|---|---|---|
| Windows | 10 or 11 | — |
| Node.js | 22 or later | [nodejs.org](https://nodejs.org) |
| Git | any recent | [git-scm.com](https://git-scm.com) |
| GitHub Copilot CLI | any | [GitHub Docs](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-in-the-command-line) |

Copilot CLI is **optional** — the dashboard will run without it, but you won't have real Copilot data. CPU, memory, and process metrics still work.

---

## 2. Install Node.js

1. Go to [nodejs.org](https://nodejs.org) and download the **LTS** installer (22.x or later).
2. Run the installer. Accept all defaults.
3. When prompted about "Tools for Native Modules", you can skip it unless you hit build errors later.
4. Open a **new** PowerShell window and verify:

```powershell
node --version   # should print v22.x.x or higher
npm --version    # should print 10.x.x or higher
```

---

## 3. Enable pnpm

Copilot Cockpit uses `pnpm` as its package manager. Node.js ships with `corepack`, which manages pnpm for you.

Open **PowerShell as Administrator** and run:

```powershell
corepack enable pnpm
```

Then verify in a **normal** PowerShell window:

```powershell
pnpm --version   # should print 9.x.x or later
```

> **Why PowerShell as Administrator?** Corepack needs to create a symlink in a system directory (`C:\Program Files\nodejs\`). That requires elevation. You only need to do this once.

---

## 4. Clone and Install

Open PowerShell (no admin needed for this step):

```powershell
git clone https://github.com/serrazon/copilot-cockpit
cd copilot-cockpit
pnpm install
```

`pnpm install` will download all dependencies for the backend, frontend, and shared packages. It should complete in under 30 seconds on a normal connection.

---

## 5. Start the Dashboard

```powershell
pnpm dev
```

This starts:
- **Backend** on `http://localhost:3001`
- **Frontend** on `http://localhost:5173`

Open **http://localhost:5173** in your browser.

You should see the Copilot Cockpit dashboard. The status bar will show:
- **CONNECTING** (yellow) briefly, then
- **CONNECTED** (green) once the frontend finds the backend

The panels will show empty states until Copilot CLI is running with debug logging.

---

## 6. Enable Copilot Debug Logging

This is the step that makes all the panels light up with real data.

### Option A — Direct flag (recommended)

Open a **second** PowerShell window alongside your dashboard and run:

```powershell
copilot --log-level debug
```

Copilot will write logs to `C:\Users\<YourName>\.copilot\logs\` and the dashboard will pick them up automatically.

### Option B — Persistent environment variable

If you always want debug logging, set it permanently:

```powershell
# PowerShell (current user, persists across reboots)
[System.Environment]::SetEnvironmentVariable("COPILOT_LOG_LEVEL", "debug", "User")
```

Then just run `copilot` normally and it will log at debug level.

### What you'll see

Once Copilot CLI is running with debug logging:

| Panel | What appears |
|---|---|
| **Terminal Output** | Raw log stream in real-time |
| **Log Viewer** | Filterable log lines by level (debug/info/warn/error) |
| **Process Tree** | `copilot.exe` and any MCP server child processes |
| **Session Timeline** | A bar for each conversation session |
| **System Metrics** | Your machine's CPU, memory (already works without Copilot) |

---

## 7. Where Windows Differs from macOS/Linux

### Data directory path

On Windows, `~/.copilot` resolves to:
```
C:\Users\<YourName>\.copilot\
```

The dashboard uses `os.homedir()` internally, so this is automatic — no configuration needed.

If your Copilot data is somewhere else (e.g., on a different drive), override it:

```powershell
# PowerShell — set for this session only
$env:COPILOT_HOME = "D:\MyData\.copilot"
pnpm dev:server

# Or add to your PowerShell profile for persistence
```

### Process monitoring

On macOS/Linux, the dashboard uses `ps-list` + `pidtree` to build the process tree with CPU and memory data.

On Windows, `ps-list` returns processes but **without** CPU% and memory data (OS limitation). The dashboard automatically falls back to `systeminformation`, which queries WMI for that data. This means:

- Process names and PIDs: same as macOS
- CPU% and memory per process: available, but may show `0` for a few seconds on first load while WMI warms up

No action needed — the fallback is automatic.

### Line endings

Windows uses `CRLF` (`\r\n`) line endings. Log files written by Copilot CLI on Windows may use CRLF. The dashboard normalizes all line endings to LF (`\n`) before display, so you'll never see `^M` characters in the Log Viewer.

### File watching

The dashboard uses a single `chokidar` watcher instance per directory. On Windows, file change events can be delayed or batched by the OS. If you notice a slight lag (1–2 seconds) between Copilot writing a log and it appearing in the dashboard, that's normal Windows behavior.

---

## 8. Optional: Network Monitoring

The Network Inspector panel can show real HTTP requests that Copilot CLI makes to `api.githubcopilot.com`. This requires running a local HTTPS proxy.

### Step 1 — Enable the proxy

In PowerShell:

```powershell
$env:ENABLE_PROXY = "true"
pnpm dev:server
```

The server will start a proxy on port `8888` and print instructions for trusting the certificate.

### Step 2 — Trust the generated certificate

The proxy generates a self-signed CA certificate on first run, stored at:
```
C:\Users\<YourName>\.copilot-monitor\certs\ca.crt
```

To trust it on Windows:

1. Open **Run** (`Win + R`), type `certmgr.msc`, press Enter
2. Navigate to **Trusted Root Certification Authorities → Certificates**
3. Right-click → **All Tasks → Import...**
4. Browse to the `ca.crt` file above
5. Click through the wizard, accept the security warning

### Step 3 — Route Copilot traffic through the proxy

```powershell
$env:HTTPS_PROXY = "http://localhost:8888"
copilot --log-level debug
```

The Network Inspector panel will now populate with real API calls.

> **Note:** The proxy is read-only. It does not modify, block, or store any requests. It only reads the metadata (URL, method, status code, duration, size) for display.

---

## 9. Running Automatically at Startup

If you want the dashboard to start automatically when you log in:

### Option A — PowerShell startup script

Create a file at:
```
C:\Users\<YourName>\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\copilot-cockpit.ps1
```

With content:
```powershell
Set-Location "C:\path\to\copilot-cockpit"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "pnpm dev"
```

### Option B — Windows Task Scheduler

1. Open **Task Scheduler**
2. Create Basic Task → name it "Copilot Cockpit"
3. Trigger: **When I log on**
4. Action: **Start a program**
   - Program: `powershell`
   - Arguments: `-Command "cd C:\path\to\copilot-cockpit; pnpm dev"`
5. Finish

---

## 10. Troubleshooting

### `pnpm` is not recognized

```
pnpm : The term 'pnpm' is not recognized...
```

**Fix:** Run `corepack enable pnpm` in an Administrator PowerShell, then close and reopen your shell.

### Port already in use

```
Error: listen EADDRINUSE :::3001
```

**Fix:** Another process is using port 3001. Either kill it or run on a different port:

```powershell
$env:PORT = "3002"
pnpm dev:server
```

And update the frontend proxy: edit `client/vite.config.ts`, change `http://localhost:3001` to `http://localhost:3002`.

### Dashboard shows "DISCONNECTED" indefinitely

The frontend can't reach the backend. Check:

1. Is `pnpm dev:server` running? Look for `[server] Listening on http://localhost:3001`
2. Is your firewall blocking `localhost:3001`? Unlikely for localhost, but check Windows Defender Firewall.
3. Is the port different? See above.

### No logs appearing — panels show empty state

1. Confirm `~/.copilot/logs/` exists: open File Explorer and navigate to `C:\Users\<YourName>\.copilot\logs\`
2. Confirm Copilot CLI is running with `--log-level debug`
3. The server retries watching every 10 seconds — wait a moment after starting Copilot

### Logs directory exists but nothing appears

Check the backend console output for errors from `[log-watcher]`. If you see a path error, try overriding:

```powershell
$env:COPILOT_HOME = "C:\Users\<YourName>\.copilot"
pnpm dev:server
```

### `EACCES` or permission errors

Make sure you're not running the dashboard from a protected directory (like `C:\Program Files\`). Clone the repo into your user folder, e.g. `C:\Users\<YourName>\Projects\copilot-cockpit`.

---

> Still stuck? [Open an issue](https://github.com/serrazon/copilot-cockpit/issues) with your Node.js version (`node --version`), Windows version, and the full error output.
