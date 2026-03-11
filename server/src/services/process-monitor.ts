import { EventEmitter } from 'events';
import psList from 'ps-list';
import pidtree from 'pidtree';
import si from 'systeminformation';
import type { CopilotProcess } from '@shared/types/copilot.js';

const POLL_INTERVAL = 3_000;
const COPILOT_PATTERNS = ['copilot', 'gh copilot'];

function matchesCopilot(name: string, cmd: string): boolean {
  const haystack = `${name} ${cmd}`.toLowerCase();
  return COPILOT_PATTERNS.some((p) => haystack.includes(p));
}

function serialize(ps: CopilotProcess[]): string {
  return JSON.stringify(ps.map((p) => ({ pid: p.pid, cpu: p.cpu, memory: p.memory })));
}

class ProcessMonitor extends EventEmitter {
  private timer: ReturnType<typeof setInterval> | null = null;
  private last: string = '';
  private processes: CopilotProcess[] = [];

  start() {
    this._poll();
    this.timer = setInterval(() => this._poll(), POLL_INTERVAL);
  }

  getProcesses(): CopilotProcess[] {
    return this.processes;
  }

  private async _poll() {
    try {
      let procs: CopilotProcess[];

      if (process.platform === 'win32') {
        procs = await this._pollWindows();
      } else {
        procs = await this._pollUnix();
      }

      const serialized = serialize(procs);
      if (serialized !== this.last) {
        this.last = serialized;
        this.processes = procs;
        this.emit('processes', procs);
      }
    } catch (err) {
      console.error('[process-monitor] Poll error:', err);
    }
  }

  private async _pollUnix(): Promise<CopilotProcess[]> {
    const list = await psList();
    const matching = list.filter((p) =>
      matchesCopilot(p.name ?? '', (p as { cmd?: string }).cmd ?? '')
    );

    if (matching.length === 0) return [];

    // Build process tree from top-level copilot processes
    const result: CopilotProcess[] = [];

    for (const parent of matching) {
      let childPids: number[] = [];
      try {
        childPids = await pidtree(parent.pid);
      } catch {
        childPids = [];
      }

      const children: CopilotProcess[] = childPids
        .flatMap((pid) => {
          const child = list.find((p) => p.pid === pid);
          if (!child) return [];
          const cp: CopilotProcess = {
            pid: child.pid,
            name: child.name ?? 'unknown',
            cmd: (child as { cmd?: string }).cmd ?? '',
            cpu: child.cpu ?? 0,
            memory: child.memory ?? 0,
            children: [],
            startTime: Date.now(),
          };
          return [cp];
        });

      result.push({
        pid: parent.pid,
        name: parent.name ?? 'copilot',
        cmd: (parent as { cmd?: string }).cmd ?? '',
        cpu: parent.cpu ?? 0,
        memory: parent.memory ?? 0,
        children,
        startTime: Date.now(),
      });
    }

    return result;
  }

  private async _pollWindows(): Promise<CopilotProcess[]> {
    const data = await si.processes();
    const matching = data.list.filter((p) =>
      matchesCopilot(p.name, p.command ?? '')
    );

    return matching.map((p) => ({
      pid: p.pid,
      name: p.name,
      cmd: p.command ?? '',
      cpu: p.cpu ?? 0,
      memory: (p.memRss ?? 0) * 1024, // KB → bytes
      children: [],
      startTime: Date.now(),
    }));
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }
}

export const processMonitor = new ProcessMonitor();
