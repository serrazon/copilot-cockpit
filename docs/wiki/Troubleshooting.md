# Troubleshooting

## Quick Checklist

Before diving into specific issues, run through this:

- [ ] Node.js 22+? → `node --version`
- [ ] pnpm installed? → `pnpm --version`
- [ ] Dependencies installed? → `pnpm install` from repo root
- [ ] Backend running? → look for `[server] Listening on http://localhost:3001`
- [ ] Frontend running? → look for `VITE ready on http://localhost:5173`
- [ ] Copilot CLI running with `--log-level debug`?

---

## Installation Problems

### `pnpm: command not found` / `pnpm is not recognized`

pnpm isn't on your PATH. Fix it with corepack (ships with Node.js):

```bash
# macOS / Linux
sudo corepack enable pnpm

# Windows (Administrator PowerShell)
corepack enable pnpm
```

Close and reopen your terminal, then try again.

---

### `corepack enable` fails with permission denied

You need to run it with elevated permissions:

```bash
# macOS / Linux
sudo corepack enable pnpm

# Windows — open PowerShell as Administrator, then:
corepack enable pnpm
```

---

### `pnpm install` fails with network errors

Try with a different npm registry mirror or check your corporate proxy:

```bash
pnpm install --registry https://registry.npmjs.org
```

On corporate networks, you may need to set `NODE_EXTRA_CA_CERTS` to your company's CA certificate.

---

### `ERR_MODULE_NOT_FOUND` when starting the server

Usually means dependencies aren't installed or there's a broken symlink in `node_modules`. Fix:

```bash
rm -rf node_modules client/node_modules server/node_modules shared/node_modules
pnpm install
```

---

## Dashboard Won't Load

### Browser shows "This site can't be reached" at localhost:5173

The Vite dev server isn't running. Make sure you ran `pnpm dev` (not just `pnpm dev:server`).

Check for output like:
```
VITE v6.x.x  ready in 300ms
➜  Local:   http://localhost:5173/
```

If the port is in use:
```bash
# Find what's using it
lsof -i :5173          # macOS / Linux
netstat -ano | findstr :5173   # Windows
```

---

### Status bar shows "DISCONNECTED" and stays red

The frontend can't reach the backend WebSocket. Diagnose:

1. **Is the backend running?**
   ```bash
   curl http://localhost:3001/api/health
   # Should return: {"status":"ok",...}
   ```

2. **Is the port different?** If you set `PORT=4000`, the frontend still tries port 3001. Update `client/vite.config.ts`:
   ```typescript
   proxy: { '/api': 'http://localhost:4000' }
   ```

3. **Firewall?** On Windows, check if Windows Defender Firewall is blocking `localhost:3001`. It shouldn't block localhost traffic, but corporate security software sometimes does.

---

### Page loads but all panels show empty state

That's expected if Copilot CLI isn't running. Start it:

```bash
copilot --log-level debug
```

The **System Metrics** panel should show data immediately (CPU, memory) — it doesn't require Copilot CLI. If that panel is also empty, wait up to 10 seconds for the first metrics poll to complete.

---

## No Logs Appearing

### Log Viewer and Terminal Output are empty

**Check 1 — Is the logs directory being watched?**

Look at the server console output when it starts. You should see:
```
[log-watcher] Watching /home/you/.copilot/logs
```

If you see:
```
[log-watcher] /home/you/.copilot/logs not found, retrying in 10s
```
...then the directory doesn't exist yet. Start Copilot CLI and the watcher will connect automatically within 10 seconds.

**Check 2 — Is Copilot CLI writing logs?**

Confirm the directory exists and has `.log` files:

```bash
# macOS / Linux
ls ~/.copilot/logs/

# Windows PowerShell
ls $HOME\.copilot\logs\
```

If the directory is empty, Copilot CLI isn't logging. Make sure you started it with `--log-level debug`.

**Check 3 — Custom Copilot data path?**

Some Copilot CLI versions or enterprise configurations store data in a non-default location. Set `COPILOT_HOME` to the correct path:

```bash
COPILOT_HOME=/path/to/copilot/data pnpm dev:server
```

---

### Logs appear in the file but not in the dashboard

This can happen if the file was already large when the server started — the watcher only reads **new bytes** appended after startup.

**Fix:** Stop Copilot CLI, delete or truncate the log file, start Copilot CLI again. Or simply restart the dashboard server.

---

## Process Tree is Empty

### "No Copilot processes detected"

The process monitor filters for processes with `copilot` or `gh copilot` in the process name or command line.

**Check 1 — Is Copilot CLI actually running?**

```bash
# macOS / Linux
ps aux | grep copilot

# Windows PowerShell
Get-Process | Where-Object { $_.Name -like "*copilot*" }
```

**Check 2 — Windows: WMI delay**

On Windows, the first process scan uses WMI which can take 3–5 seconds to return results. Wait a moment and the panel should populate.

**Check 3 — Process name mismatch**

If your Copilot CLI binary has a different name (e.g., `gh-copilot` or a version-suffixed name), the filter won't match it. [Open an issue](https://github.com/serrazon/copilot-cockpit/issues) with the output of `ps aux | grep -i copilot` (or the Windows equivalent) and we'll add support.

---

## Session Timeline is Empty

Sessions are populated from `~/.copilot/session-state/*.json` files. These are written by Copilot CLI during and after a session.

**Check:** After running `copilot --log-level debug` and having at least one conversation, look for JSON files:

```bash
# macOS / Linux
ls ~/.copilot/session-state/

# Windows
ls $HOME\.copilot\session-state\
```

If the directory is empty or missing, your version of Copilot CLI may not write session state files. This feature depends on Copilot CLI's internal behavior.

---

## Network Inspector is Empty

The Network Inspector requires the optional HTTP proxy. See [Configuration — ENABLE_PROXY](Configuration#enable_proxy) for setup instructions.

Without the proxy, the panel will show:
> *Enable monitoring: set `HTTPS_PROXY=http://localhost:8888` before starting copilot*

That's the expected empty state — it's not an error.

---

## Performance Issues

### Dashboard is slow or browser tab uses too much memory

The Zustand store caps logs at **1,000 entries** and network events at **500**. If you're running Copilot CLI with very verbose logging for a long time, the Log Viewer may render many rows.

Tips:
- Use the **level filter** buttons in the Log Viewer to hide `debug` entries (usually the most numerous)
- Use the **search filter** to narrow to specific sources
- Unpin the auto-scroll if you don't need live tailing

---

### Server uses high CPU

The process monitor polls every 3 seconds and the system monitor polls every 5 seconds. If your system is under load, these polls add a small overhead.

You can't configure the poll interval via env vars currently, but it's a one-line change in `server/src/services/process-monitor.ts` and `system-monitor.ts` if you want to tune it.

---

## TypeScript / Build Errors

### `pnpm typecheck` fails

Run with output to see the full error:
```bash
pnpm --filter @copilot-cockpit/client typecheck
pnpm --filter @copilot-cockpit/server typecheck
```

If you've modified the shared types in `shared/src/types/`, make sure changes are consistent across both client and server usage.

### `pnpm build` fails on the client

Common causes:
- **Unused imports** — TypeScript strict mode treats unused imports as errors. Remove them.
- **Missing types** — if you added a new dependency, add its `@types/` package too.

---

## Getting More Help

If none of the above solved your problem:

1. **Check existing issues** — [github.com/serrazon/copilot-cockpit/issues](https://github.com/serrazon/copilot-cockpit/issues)

2. **Open a new issue** and include:
   - Your OS and version (`uname -a` or Windows Settings → About)
   - Node.js version (`node --version`)
   - pnpm version (`pnpm --version`)
   - The full error output from the server console
   - The full error output from the browser DevTools console (F12)
   - What you were doing when the problem occurred
