import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import chokidar from 'chokidar';
import type { LogEntry } from '@shared/types/copilot.js';
import { getCopilotPaths } from './copilot-paths.js';

let _idCounter = 0;
function nextId() {
  return `log-${Date.now()}-${_idCounter++}`;
}

function parseLevel(line: string): LogEntry['level'] {
  const l = line.toLowerCase();
  if (l.includes('[error]') || l.includes(' error ') || l.startsWith('error')) return 'error';
  if (l.includes('[warn]') || l.includes(' warn ') || l.startsWith('warn')) return 'warn';
  if (l.includes('[info]') || l.includes(' info ') || l.startsWith('info')) return 'info';
  return 'debug';
}

function parseTimestamp(line: string): number {
  // Try ISO-style timestamp at start: 2024-01-01T00:00:00.000Z or similar
  const match = line.match(/^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})/);
  if (match) {
    const ts = Date.parse(match[1]);
    if (!isNaN(ts)) return ts;
  }
  return Date.now();
}

class LogWatcher extends EventEmitter {
  private watcher: ReturnType<typeof chokidar.watch> | null = null;
  private fileSizes: Map<string, number> = new Map();
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  start() {
    this._watch();
  }

  private _watch() {
    const { logsDir } = getCopilotPaths();

    if (!fs.existsSync(logsDir)) {
      console.warn(`[log-watcher] ${logsDir} not found, retrying in 10s`);
      this.retryTimer = setTimeout(() => this._watch(), 10_000);
      return;
    }

    console.log(`[log-watcher] Watching ${logsDir}`);

    this.watcher = chokidar.watch(path.join(logsDir, '**', '*.log'), {
      ignoreInitial: false,
      persistent: true,
      usePolling: process.platform === 'win32',
    });

    this.watcher.on('add', (filePath) => {
      this.fileSizes.set(filePath, fs.statSync(filePath).size);
    });

    this.watcher.on('change', (filePath) => {
      this._readNewBytes(filePath);
    });

    this.watcher.on('error', (err) => console.error('[log-watcher] Error:', err));
  }

  private _readNewBytes(filePath: string) {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch {
      return;
    }

    const lastSize = this.fileSizes.get(filePath) ?? 0;

    // File rotation: size decreased
    if (stat.size < lastSize) {
      this.fileSizes.set(filePath, 0);
    }

    const start = this.fileSizes.get(filePath) ?? 0;
    if (stat.size <= start) return;

    this.fileSizes.set(filePath, stat.size);

    const stream = fs.createReadStream(filePath, { start, end: stat.size - 1 });
    const chunks: Buffer[] = [];

    stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8').replace(/\r\n/g, '\n');
      const source = path.basename(filePath, '.log');

      for (const rawLine of text.split('\n')) {
        const line = rawLine.trim();
        if (!line) continue;

        const entry: LogEntry = {
          id: nextId(),
          source,
          line,
          timestamp: parseTimestamp(line),
          level: parseLevel(line),
        };
        this.emit('log', entry);
      }
    });
    stream.on('error', (err) => console.error('[log-watcher] Read error:', err));
  }

  stop() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.watcher?.close();
  }
}

export const logWatcher = new LogWatcher();
