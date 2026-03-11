# Configuration

Copilot Cockpit is configured via environment variables. There are no config files to edit.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `COPILOT_HOME` | `~/.copilot` | Path to the Copilot data directory |
| `PORT` | `3001` | Port for the backend HTTP/WebSocket server |
| `ENABLE_PROXY` | *(unset)* | Set to `true` to start the HTTP MITM proxy on port 8888 |

## Setting variables

### macOS / Linux

```bash
# For a single session
COPILOT_HOME=/custom/path PORT=4000 pnpm dev:server

# Or export for the whole shell session
export COPILOT_HOME=/custom/path
export PORT=4000
pnpm dev
```

### Windows (PowerShell)

```powershell
# For a single session
$env:COPILOT_HOME = "D:\Users\me\.copilot"
$env:PORT = "4000"
pnpm dev:server

# Persist across reboots (current user)
[System.Environment]::SetEnvironmentVariable("COPILOT_HOME", "D:\Users\me\.copilot", "User")
[System.Environment]::SetEnvironmentVariable("PORT", "4000", "User")
```

### Windows (Command Prompt)

```cmd
set COPILOT_HOME=D:\Users\me\.copilot
set PORT=4000
pnpm dev:server
```

---

## COPILOT_HOME

By default the server looks for Copilot data in:

| Platform | Default path |
|---|---|
| macOS | `/Users/<you>/.copilot` |
| Linux | `/home/<you>/.copilot` |
| Windows | `C:\Users\<you>\.copilot` |

If your Copilot CLI is configured to store data elsewhere, set `COPILOT_HOME` to that directory.

The server watches these sub-paths inside `COPILOT_HOME`:

```
COPILOT_HOME/
├── logs/                        ← log files tailed in real time
├── session-state/               ← JSON session artifacts
├── command-history-state.json   ← command history
├── config.json                  ← main config
├── mcp-config.json              ← MCP server config
└── agents/*.md                  ← agent definitions
```

If the directory doesn't exist when the server starts, the watchers will retry every 10 seconds automatically. No restart needed.

---

## PORT

Changes the port the Express/WebSocket server listens on. Useful if port 3001 is already taken.

If you change `PORT`, you also need to update the frontend's proxy target. Edit `client/vite.config.ts`:

```typescript
server: {
  proxy: {
    '/api': 'http://localhost:4000',  // ← change this to match PORT
  },
},
```

Then restart `pnpm dev:client`.

---

## ENABLE_PROXY

When set to `true`, the backend starts an HTTP MITM proxy on port **8888** that can intercept HTTPS traffic from the Copilot CLI.

```bash
ENABLE_PROXY=true pnpm dev:server
```

### What the proxy does

- Generates a self-signed CA certificate on first run (stored in `~/.copilot-monitor/certs/`)
- Intercepts HTTPS requests matching:
  - `*.githubcopilot.com`
  - `*copilot*.githubusercontent.com`
  - `api.github.com/copilot_internal/*`
- For each request, emits a `NetworkEvent` with: method, URL, status code, duration, response size
- **Passes all traffic through unmodified** — it is read-only

### Route Copilot CLI through the proxy

After starting the server with `ENABLE_PROXY=true`:

```bash
# macOS / Linux
HTTPS_PROXY=http://localhost:8888 copilot --log-level debug

# Windows (PowerShell)
$env:HTTPS_PROXY = "http://localhost:8888"
copilot --log-level debug
```

### Trust the CA certificate

The proxy uses a local self-signed certificate. You need to trust it once so Copilot CLI accepts it.

**macOS:**
```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  ~/.copilot-monitor/certs/ca.crt
```

**Windows:** See the [Windows Setup Guide — Network Monitoring](Windows-Setup#8-optional-network-monitoring) section for step-by-step instructions with screenshots.

**Linux:**
```bash
sudo cp ~/.copilot-monitor/certs/ca.crt /usr/local/share/ca-certificates/copilot-cockpit.crt
sudo update-ca-certificates
```

---

## Frontend port

The Vite dev server runs on port **5173** by default. To change it, edit `client/vite.config.ts`:

```typescript
server: {
  port: 5173,  // ← change this
```

---

## Complete example

```bash
# macOS — custom Copilot path, custom port, network proxy enabled
COPILOT_HOME=/Volumes/Data/.copilot \
PORT=4000 \
ENABLE_PROXY=true \
pnpm dev:server
```

```powershell
# Windows PowerShell — same setup
$env:COPILOT_HOME = "D:\.copilot"
$env:PORT = "4000"
$env:ENABLE_PROXY = "true"
pnpm dev:server
```
