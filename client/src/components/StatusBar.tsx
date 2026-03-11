import { useState, useEffect } from 'react';
import { useDashboardStore } from '../stores/dashboard-store';

function formatBytes(bytes: number): string {
  const gb = bytes / 1024 / 1024 / 1024;
  return gb >= 1 ? `${gb.toFixed(1)}G` : `${(bytes / 1024 / 1024).toFixed(0)}M`;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function Clock() {
  const [time, setTime] = useState(() => new Date().toUTCString().slice(17, 25));

  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toUTCString().slice(17, 25)), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="text-[oklch(0.45_0.05_220)]">
      UTC <span className="text-[oklch(0.60_0.10_195)]">{time}</span>
    </span>
  );
}

export function StatusBar() {
  const connectionStatus = useDashboardStore((s) => s.connectionStatus);
  const metrics = useDashboardStore((s) => s.metrics);
  const processes = useDashboardStore((s) => s.processes);
  const sessions = useDashboardStore((s) => s.sessions);

  const cpuPct = metrics ? Math.round(metrics.cpu) : 0;
  const memPct = metrics
    ? Math.round((metrics.memory.used / metrics.memory.total) * 100)
    : 0;

  const statusColor = {
    connected: 'oklch(0.70 0.15 145)',
    connecting: 'oklch(0.75 0.15 80)',
    disconnected: 'oklch(0.65 0.25 25)',
  }[connectionStatus];

  const statusPulse = {
    connected: 'pulse-connected',
    connecting: '',
    disconnected: 'pulse-disconnected',
  }[connectionStatus];

  return (
    <div
      className="flex items-center justify-between px-4 py-1.5 border-b border-[oklch(0.30_0.05_220)] bg-[oklch(0.15_0.02_260)] flex-shrink-0 text-[0.7rem]"
      style={{ fontFamily: 'JetBrains Mono, monospace' }}
    >
      {/* Left: connection */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${statusPulse}`}
            style={{ backgroundColor: statusColor }}
          />
          <span className="uppercase tracking-wider" style={{ color: statusColor }}>
            {connectionStatus}
          </span>
        </div>
      </div>

      {/* Center: metrics */}
      <div className="flex items-center gap-4 text-[oklch(0.60_0.05_220)]">
        <span>
          CPU <span className="text-[oklch(0.65_0.20_195)]">{cpuPct}%</span>
        </span>
        <span>
          MEM <span className="text-[oklch(0.65_0.20_195)]">{memPct}%</span>
          {metrics && (
            <span className="text-[oklch(0.40_0.05_220)] ml-1">
              {formatBytes(metrics.memory.used)}/{formatBytes(metrics.memory.total)}
            </span>
          )}
        </span>
        <span>
          PROCS <span className="text-[oklch(0.65_0.20_195)]">{processes.length}</span>
        </span>
        <span>
          SESSIONS{' '}
          <span className="text-[oklch(0.65_0.20_195)]">
            {sessions.filter((s) => s.status === 'active' || s.status === 'idle').length}
          </span>
          <span className="text-[oklch(0.40_0.05_220)]">/{sessions.length}</span>
        </span>
        {metrics && (
          <span className="text-[oklch(0.40_0.05_220)]">UP {formatUptime(metrics.uptime)}</span>
        )}
      </div>

      {/* Right: clock */}
      <Clock />
    </div>
  );
}
