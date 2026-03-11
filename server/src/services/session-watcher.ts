import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import chokidar from 'chokidar';
import type { CopilotSession } from '@shared/types/copilot.js';
import { getCopilotPaths } from './copilot-paths.js';

function toGlob(p: string) {
  return p.split(path.sep).join('/');
}

class SessionWatcher extends EventEmitter {
  private watcher: ReturnType<typeof chokidar.watch> | null = null;
  private sessions: Map<string, CopilotSession> = new Map();
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  start() {
    this._watch();
  }

  getSessions(): CopilotSession[] {
    return Array.from(this.sessions.values());
  }

  private _watch() {
    const { sessionStateDir, commandHistoryState } = getCopilotPaths();

    if (!fs.existsSync(sessionStateDir)) {
      console.warn(`[session-watcher] ${sessionStateDir} not found, retrying in 10s`);
      this.retryTimer = setTimeout(() => this._watch(), 10_000);
      return;
    }

    console.log(`[session-watcher] Watching ${sessionStateDir}`);

    // ── Step 1: eagerly load all existing sessions ─────────────────────────────
    this._scanDir(sessionStateDir);
    if (fs.existsSync(commandHistoryState)) {
      this._parseFile(commandHistoryState);
    }
    console.log(`[session-watcher] Initial scan complete — ${this.sessions.size} sessions loaded`);

    // ── Step 2: watch for new/changed files ────────────────────────────────────
    const targets = [
      toGlob(sessionStateDir) + '/**/*',
      toGlob(commandHistoryState),
    ];

    this.watcher = chokidar.watch(targets, {
      ignoreInitial: true,   // already loaded above
      persistent: true,
      usePolling: process.platform === 'win32',
      interval: 500,
    });

    this.watcher.on('add', (p) => this._parseFile(p));
    this.watcher.on('change', (p) => this._parseFile(p));
    this.watcher.on('error', (err) => console.error('[session-watcher] Error:', err));
  }

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
        // Sessions may be stored as a directory — look for JSON files inside
        this._scanDir(full);
      } else if (entry.isFile()) {
        this._parseFile(full);
      }
    }
  }

  private _parseFile(filePath: string) {
    // Skip clearly non-JSON files
    const ext = path.extname(filePath).toLowerCase();
    if (ext && ext !== '.json') return;

    let raw: string;
    try {
      raw = fs.readFileSync(filePath, 'utf8');
    } catch {
      return;
    }

    if (!raw.trim().startsWith('{')) return; // not a JSON object

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return; // mid-write or not JSON
    }

    const session = this._coerce(filePath, data);
    if (!session) return;

    this.sessions.set(session.id, session);
    this.emit('sessions', this.getSessions());
  }

  private _coerce(filePath: string, data: unknown): CopilotSession | null {
    if (typeof data !== 'object' || data === null) return null;
    const d = data as Record<string, unknown>;

    // Must have at least a recognisable session shape
    if (!d['id'] && !d['startTime'] && !d['model']) return null;

    return {
      id: typeof d['id'] === 'string' ? d['id'] : path.basename(filePath, '.json'),
      startTime: typeof d['startTime'] === 'number' ? d['startTime'] : Date.now(),
      endTime: typeof d['endTime'] === 'number' ? d['endTime'] : undefined,
      interactions: typeof d['interactions'] === 'number' ? d['interactions'] : 0,
      model: typeof d['model'] === 'string' ? d['model'] : 'unknown',
      status: (['active', 'idle', 'ended'] as const).includes(
        d['status'] as CopilotSession['status']
      )
        ? (d['status'] as CopilotSession['status'])
        : 'idle',
    };
  }

  stop() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.watcher?.close();
  }
}

export const sessionWatcher = new SessionWatcher();
