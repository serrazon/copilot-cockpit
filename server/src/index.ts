import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { ServerMessage } from '@shared/types/ws-messages.js';
import { logWatcher } from './services/log-watcher.js';
import { sessionWatcher } from './services/session-watcher.js';
import { processMonitor } from './services/process-monitor.js';
import { systemMonitor } from './services/system-monitor.js';
import { configWatcher } from './services/config-watcher.js';

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
  console.log('[ws] Client connected');

  // Send current state as init
  const init: ServerMessage = {
    type: 'init',
    payload: {
      logs: [],
      processes: processMonitor.getProcesses(),
      sessions: sessionWatcher.getSessions(),
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
