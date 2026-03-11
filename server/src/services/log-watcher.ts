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

// Normalise to forward slashes for chokidar glob patterns (required on Windows)
function toGlob(dir: string, pattern: string): string {
  return dir.split(path.sep).join('/') + '/' + pattern;
}

// How many bytes to read back from an existing file on initial attach
const INITIAL_TAIL_BYTES = 32 * 1024; // 32 KB

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

    // Use forward-slash glob — chokidar requires this even on Windows
    const glob = toGlob(logsDir, '**/*');

    this.watcher = chokidar.watch(glob, {
      ignoreInitial: false,
      persistent: true,
      usePolling: process.platform === 'win32',
      interval: 500,         // poll every 500ms on Windows
      binaryInterval: 1000,
      // ignore hidden files and directories, but watch all file extensions
      ignored: /(^|[/\\])\../,
    });

    this.watcher.on('add', (filePath) => {
      if (!this._isLogFile(filePath)) return;
      console.log(`[log-watcher] Tracking: ${path.basename(filePath)}`);
      this._readInitial(filePath);
    });

    this.watcher.on('change', (filePath) => {
      if (!this._isLogFile(filePath)) return;
      this._readNewBytes(filePath);
    });

    this.watcher.on('error', (err) => console.error('[log-watcher] Error:', err));
  }

  // Accept .log, .txt, and files with no extension (Copilot CLI varies across versions)
  private _isLogFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.log' || ext === '.txt' || ext === '';
  }

  // On first attach to an existing file, tail the last INITIAL_TAIL_BYTES
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

    // Read from max(0, size - INITIAL_TAIL_BYTES) so we see recent history
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

    // File rotation: size decreased → reset
    if (stat.size < lastSize) {
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
