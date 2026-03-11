import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import chokidar from 'chokidar';
import type { CopilotSession } from '@shared/types/copilot.js';
import { getCopilotPaths } from './copilot-paths.js';

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

    // Use forward slashes in glob patterns — required by chokidar on Windows
    const toGlob = (p: string) => p.split(path.sep).join('/');

    const targets: string[] = [toGlob(commandHistoryState)];
    if (fs.existsSync(sessionStateDir)) {
      targets.push(toGlob(sessionStateDir) + '/**/*.json');
    } else {
      console.warn(`[session-watcher] ${sessionStateDir} not found, retrying in 10s`);
      this.retryTimer = setTimeout(() => this._watch(), 10_000);
      return;
    }

    console.log(`[session-watcher] Watching ${sessionStateDir}`);

    this.watcher = chokidar.watch(targets, {
      ignoreInitial: false,
      persistent: true,
      usePolling: process.platform === 'win32',
      interval: 500,
    });

    this.watcher.on('add', (p) => this._parseFile(p));
    this.watcher.on('change', (p) => this._parseFile(p));
    this.watcher.on('error', (err) => console.error('[session-watcher] Error:', err));
  }

  private _parseFile(filePath: string) {
    let raw: string;
    try {
      raw = fs.readFileSync(filePath, 'utf8');
    } catch {
      return;
    }

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      // File may be mid-write
      return;
    }

    const session = this._coerce(filePath, data);
    if (!session) return;

    this.sessions.set(session.id, session);
    this.emit('sessions', this.getSessions());
  }

  private _coerce(filePath: string, data: unknown): CopilotSession | null {
    if (typeof data !== 'object' || data === null) return null;
    const d = data as Record<string, unknown>;
    return {
      id: (d['id'] as string) ?? path.basename(filePath, '.json'),
      startTime: typeof d['startTime'] === 'number' ? d['startTime'] : Date.now(),
      endTime: typeof d['endTime'] === 'number' ? d['endTime'] : undefined,
      interactions: typeof d['interactions'] === 'number' ? d['interactions'] : 0,
      model: typeof d['model'] === 'string' ? d['model'] : 'unknown',
      status: (['active', 'idle', 'ended'] as const).includes(d['status'] as CopilotSession['status'])
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
