import express from 'express';
import cors from 'cors';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import type { ServerMessage } from '@shared/types/ws-messages.js';
import { logWatcher } from './services/log-watcher.js';
import { sessionWatcher } from './services/session-watcher.js';
import { processMonitor } from './services/process-monitor.js';
import { systemMonitor } from './services/system-monitor.js';
import { configWatcher } from './services/config-watcher.js';
import { getCopilotPaths } from './services/copilot-paths.js';

const PORT = process.env['PORT'] ? parseInt(process.env['PORT']) : 3001;

const app = express();
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json());

// ── REST endpoints ─────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

app.get('/api/config', (_req, res) => {
  res.json(configWatcher.getConfig());
});

app.get('/api/processes', (_req, res) => {
  res.json(processMonitor.getProcesses());
});

app.get('/api/sessions', (_req, res) => {
  res.json(sessionWatcher.getSessions());
});

// Debug endpoint — shows what paths are being watched and whether they exist
app.get('/api/debug', (_req, res) => {
  const paths = getCopilotPaths();
  const check = (p: string) => {
    const exists = fs.existsSync(p);
    if (!exists) return { path: p, exists: false };
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      const entries = (() => { try { return fs.readdirSync(p); } catch { return []; } })();
      return {
        path: p, exists: true, type: 'directory',
        files: entries.map((f) => {
          const full = path.join(p, f);
          const s = (() => { try { return fs.statSync(full); } catch { return null; } })();
          return s ? `${f} (${s.isDirectory() ? 'dir' : `file, ${s.size}B`})` : f;
        }),
      };
    }
    return { path: p, exists: true, type: 'file', size: stat.size };
  };
  // Peek inside the first 3 session subdirectories to understand their structure
  const sessionPeek: Record<string, unknown> = {};
  try {
    const sessionDir = paths.sessionStateDir;
    if (fs.existsSync(sessionDir)) {
      const entries = fs.readdirSync(sessionDir, { withFileTypes: true });
      const subdirs = entries.filter((e) => e.isDirectory()).slice(0, 3);
      for (const d of subdirs) {
        const full = path.join(sessionDir, d.name);
        try {
          const children = fs.readdirSync(full, { withFileTypes: true });
          sessionPeek[d.name] = children.map((c) => {
            const cf = path.join(full, c.name);
            const cs = (() => { try { return fs.statSync(cf); } catch { return null; } })();
            let preview = '';
            if (cs && cs.isFile() && cs.size > 0 && cs.size < 4096) {
              try { preview = fs.readFileSync(cf, 'utf8').slice(0, 200); } catch { /* skip */ }
            }
            return { name: c.name, type: c.isDirectory() ? 'dir' : 'file', size: cs?.size ?? 0, preview };
          });
        } catch { sessionPeek[d.name] = 'error reading'; }
      }
    }
  } catch { /* skip */ }

  res.json({
    platform: process.platform,
    copilotHome: paths.base,
    logBufferSize: logWatcher.getLogs().length,
    sessionCount: sessionWatcher.getSessions().length,
    paths: Object.fromEntries(
      Object.entries(paths).map(([k, v]) => [k, check(v)])
    ),
    sessionPeek,
    env: {
      COPILOT_HOME: process.env['COPILOT_HOME'] ?? '(not set)',
      PORT: process.env['PORT'] ?? '(not set)',
    },
  });
});

// ── SSE endpoint ───────────────────────────────────────────────────────────────

const sseClients = new Set<express.Response>();

app.get('/api/logs/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);

  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 30_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

function sendSSE(data: string) {
  for (const client of sseClients) {
    client.write(`data: ${data}\n\n`);
  }
}

// ── WebSocket server ──────────────────────────────────────────────────────────

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function broadcast(msg: ServerMessage) {
  const data = JSON.stringify(msg);
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  });
}

wss.on('connection', (ws) => {
  const sessions = sessionWatcher.getSessions();
  const logs = logWatcher.getLogs();
  console.log(`[ws] Client connected — sending init: ${sessions.length} sessions, ${logs.length} logs`);

  // Send current state as init
  const init: ServerMessage = {
    type: 'init',
    payload: {
      logs,
      processes: processMonitor.getProcesses(),
      sessions,
      metrics: systemMonitor.getMetrics(),
      config: configWatcher.getConfig(),
      networkEvents: [],
    },
  };
  ws.send(JSON.stringify(init));

  ws.on('close', () => console.log('[ws] Client disconnected'));
  ws.on('error', (err) => console.error('[ws] Error:', err));
});

// ── Service event wiring ───────────────────────────────────────────────────────

logWatcher.on('log', (entry) => {
  broadcast({ type: 'log-line', payload: entry });
  sendSSE(`[${entry.level.toUpperCase()}] ${entry.source}: ${entry.line}`);
});

sessionWatcher.on('sessions', (sessions) => {
  broadcast({ type: 'session-update', payload: { sessions } });
});

processMonitor.on('processes', (processes) => {
  broadcast({ type: 'process-update', payload: { processes } });
});

systemMonitor.on('metrics', (metrics) => {
  broadcast({ type: 'system-metrics', payload: metrics });
});

configWatcher.on('config', (config) => {
  broadcast({ type: 'config-update', payload: { config } });
});

// ── Start services & server ────────────────────────────────────────────────────

logWatcher.start();
sessionWatcher.start();
processMonitor.start();
systemMonitor.start();
configWatcher.start();

server.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});

// ── Graceful shutdown ──────────────────────────────────────────────────────────

function shutdown() {
  console.log('\n[server] Shutting down...');
  logWatcher.stop();
  sessionWatcher.stop();
  processMonitor.stop();
  systemMonitor.stop();
  configWatcher.stop();
  wss.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5_000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
