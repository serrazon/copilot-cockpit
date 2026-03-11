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
  const match = line.match(/^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})/);
  if (match) {
    const ts = Date.parse(match[1]);
    if (!isNaN(ts)) return ts;
  }
  return Date.now();
}

function toGlob(dir: string): string {
  return dir.split(path.sep).join('/') + '/**/*';
}

// On startup, tail the last N bytes of existing files
const INITIAL_TAIL_BYTES = 32 * 1024;

// Accept .log, .txt, and no-extension files
function isLogFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.log' || ext === '.txt' || ext === '';
}

const MAX_BUFFERED_LOGS = 1000;

class LogWatcher extends EventEmitter {
  private watcher: ReturnType<typeof chokidar.watch> | null = null;
  private fileSizes: Map<string, number> = new Map();
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private _logs: LogEntry[] = [];

  start() {
    this._watch();
  }

  /** Returns buffered log entries (up to MAX_BUFFERED_LOGS) for the init payload. */
  getLogs(): LogEntry[] {
    return this._logs.slice();
  }

  private _watch() {
    const { logsDir } = getCopilotPaths();

    if (!fs.existsSync(logsDir)) {
      console.warn(`[log-watcher] ${logsDir} not found, retrying in 10s`);
      this.retryTimer = setTimeout(() => this._watch(), 10_000);
      return;
    }

    console.log(`[log-watcher] Watching ${logsDir}`);

    // ── Step 1: eagerly read all existing files right now ─────────────────────
    // Don't trust chokidar 'add' events for pre-existing files on Windows polling
    const before = this._logs.length;
    this._scanDir(logsDir);
    console.log(`[log-watcher] Scheduled initial read for files in ${logsDir}`);

    // ── Step 2: watch for new files and changes ────────────────────────────────
    this.watcher = chokidar.watch(toGlob(logsDir), {
      ignoreInitial: true,   // we already read everything above
      persistent: true,
      usePolling: process.platform === 'win32',
      interval: 500,
      binaryInterval: 1000,
      ignored: /(^|[/\\])\../,
    });

    this.watcher.on('add', (filePath) => {
      if (!isLogFile(filePath)) return;
      this._readInitial(filePath);
    });

    this.watcher.on('change', (filePath) => {
      if (!isLogFile(filePath)) return;
      this._readNewBytes(filePath);
    });

    this.watcher.on('error', (err) => console.error('[log-watcher] Error:', err));
  }

  // Eagerly scan a directory and read the tail of every matching file
  private _scanDir(dir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        this._scanDir(full);
      } else if (entry.isFile() && isLogFile(full)) {
        this._readInitial(full);
      }
    }
  }

  private _readInitial(filePath: string) {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch {
      return;
    }

    if (stat.size === 0) {
      this.fileSizes.set(filePath, 0);
      return;
    }

    const start = Math.max(0, stat.size - INITIAL_TAIL_BYTES);
    this.fileSizes.set(filePath, stat.size);
    this._readRange(filePath, start, stat.size - 1);
  }

  private _readNewBytes(filePath: string) {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch {
      return;
    }

    const lastSize = this.fileSizes.get(filePath) ?? 0;

    if (stat.size < lastSize) {
      // File was rotated — reset
      this.fileSizes.set(filePath, 0);
    }

    const start = this.fileSizes.get(filePath) ?? 0;
    if (stat.size <= start) return;

    this.fileSizes.set(filePath, stat.size);
    this._readRange(filePath, start, stat.size - 1);
  }

  private _readRange(filePath: string, start: number, end: number) {
    const stream = fs.createReadStream(filePath, { start, end });
    const chunks: Buffer[] = [];

    stream.on('data', (chunk) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    );
    stream.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8').replace(/\r\n/g, '\n');
      const source = path.basename(filePath).replace(/\.[^.]+$/, '') || path.basename(filePath);

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
        this._logs.push(entry);
        if (this._logs.length > MAX_BUFFERED_LOGS) this._logs.shift();
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
