import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { ServerMessage } from '@shared/types/ws-messages.js';

const app = express();
const PORT = process.env['PORT'] ? parseInt(process.env['PORT']) : 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function broadcast(message: ServerMessage) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

wss.on('connection', (ws) => {
  console.log('[ws] Client connected');

  const initMsg: ServerMessage = {
    type: 'init',
    payload: {
      logs: [],
      processes: [],
      sessions: [],
      metrics: null,
      config: null,
      networkEvents: [],
    },
  };
  ws.send(JSON.stringify(initMsg));

  ws.on('close', () => console.log('[ws] Client disconnected'));
  ws.on('error', (err) => console.error('[ws] Error:', err));
});

// SSE endpoint for log streaming
app.get('/api/logs/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 30000);
  req.on('close', () => clearInterval(heartbeat));
});

server.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});

export { broadcast };
