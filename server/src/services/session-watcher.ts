import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import chokidar from 'chokidar';
import type { CopilotSession } from '@shared/types/copilot.js';
import { getCopilotPaths } from './copilot-paths.js';

function toGlob(p: string) {
  return p.split(path.sep).join('/');
}

/** Parse a flat key: value YAML file (no nesting, no arrays needed). */
function parseSimpleYaml(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.replace(/\r$/, '').trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const val = trimmed.slice(colonIdx + 1).trim();
    result[key] = val;
  }
  return result;
}

/** Parse an ISO date string or unix-ms number to a timestamp. */
function toTs(v: string | undefined): number {
  if (!v) return Date.now();
  const n = Number(v);
  if (!isNaN(n)) return n;
  const d = Date.parse(v);
  return isNaN(d) ? Date.now() : d;
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
        this._scanDir(full);
      } else if (entry.isFile()) {
        this._parseFile(full);
      }
    }
  }

  private _parseFile(filePath: string) {
    const ext = path.extname(filePath).toLowerCase();
    const base = path.basename(filePath);

    // workspace.yaml — primary session file
    if (base === 'workspace.yaml' || ext === '.yaml' || ext === '.yml') {
      this._parseYaml(filePath);
      return;
    }

    // Legacy JSON fallback (no extension or .json)
    if (ext && ext !== '.json') return;
    this._parseJson(filePath);
  }

  private _parseYaml(filePath: string) {
    let raw: string;
    try {
      raw = fs.readFileSync(filePath, 'utf8');
    } catch {
      return;
    }

    const d = parseSimpleYaml(raw);
    const id = d['id'];
    if (!id) return; // not a session file

    // Determine status from updated_at recency
    const updatedTs = toTs(d['updated_at']);
    const ageMs = Date.now() - updatedTs;
    const status: CopilotSession['status'] =
      ageMs < 5 * 60 * 1000 ? 'active' : ageMs < 30 * 60 * 1000 ? 'idle' : 'ended';

    const session: CopilotSession = {
      id,
      startTime: toTs(d['created_at']),
      endTime: updatedTs !== toTs(d['created_at']) ? updatedTs : undefined,
      interactions: d['summary_count'] ? parseInt(d['summary_count'], 10) || 0 : 0,
      model: d['model'] ?? 'unknown',
      status,
      cwd: d['cwd'],
      summary: d['summary'],
    };

    this.sessions.set(id, session);
    this.emit('sessions', this.getSessions());
  }

  private _parseJson(filePath: string) {
    let raw: string;
    try {
      raw = fs.readFileSync(filePath, 'utf8');
    } catch {
      return;
    }

    if (!raw.trim().startsWith('{')) return;

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    if (typeof data !== 'object' || data === null) return;
    const d = data as Record<string, unknown>;
    if (!d['id'] && !d['startTime'] && !d['model']) return;

    const session: CopilotSession = {
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

    this.sessions.set(session.id, session);
    this.emit('sessions', this.getSessions());
  }

  stop() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.watcher?.close();
  }
}

export const sessionWatcher = new SessionWatcher();
