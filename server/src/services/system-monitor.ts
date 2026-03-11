import { EventEmitter } from 'events';
import si from 'systeminformation';
import type { SystemMetrics } from '@shared/types/copilot.js';

const POLL_INTERVAL = 5_000;

class SystemMonitor extends EventEmitter {
  private timer: ReturnType<typeof setInterval> | null = null;
  private metrics: SystemMetrics | null = null;

  start() {
    this._poll();
    this.timer = setInterval(() => this._poll(), POLL_INTERVAL);
  }

  getMetrics(): SystemMetrics | null {
    return this.metrics;
  }

  private async _poll() {
    try {
      const [load, mem] = await Promise.all([si.currentLoad(), si.mem()]);

      const metrics: SystemMetrics = {
        cpu: load.currentLoad,
        memory: {
          used: mem.used,
          total: mem.total,
          free: mem.free,
        },
        uptime: process.uptime(),
        timestamp: Date.now(),
      };

      this.metrics = metrics;
      this.emit('metrics', metrics);
    } catch (err) {
      console.error('[system-monitor] Poll error:', err);
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }
}

export const systemMonitor = new SystemMonitor();
