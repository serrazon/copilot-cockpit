import { useRef } from 'react';
import { useDashboardStore } from '../../stores/dashboard-store';
import type { SystemMetrics } from '@shared/types/copilot';

const CPU_HISTORY_MAX = 60;
const cpuHistory: number[] = [];

function useCpuHistory(current: number): number[] {
  if (cpuHistory.length === 0 || cpuHistory[cpuHistory.length - 1] !== current) {
    cpuHistory.push(current);
    if (cpuHistory.length > CPU_HISTORY_MAX) cpuHistory.shift();
  }
  return [...cpuHistory];
}

function SparkLine({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  const w = 100;
  const h = 40;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * h}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace(/[^a-z]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {values.length > 1 && (
        <>
          <polyline
            points={pts}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          <polygon
            points={`0,${h} ${pts} ${w},${h}`}
            fill={`url(#grad-${color.replace(/[^a-z]/gi, '')})`}
          />
        </>
      )}
    </svg>
  );
}

function KpiCard({
  label,
  value,
  unit,
  warn,
}: {
  label: string;
  value: string | number;
  unit?: string;
  warn?: boolean;
}) {
  return (
    <div
      className="rounded-sm p-3 flex flex-col gap-1 border transition-shadow duration-500"
      style={{
        backgroundColor: 'oklch(0.16 0.02 260)',
        borderColor: warn ? 'oklch(0.65 0.25 25 / 0.5)' : 'oklch(0.30 0.05 220)',
        boxShadow: warn
          ? '0 0 16px oklch(0.65 0.25 25 / 0.25)'
          : '0 0 6px oklch(0.65 0.20 195 / 0.06)',
      }}
    >
      <div
        className="text-[0.6rem] uppercase tracking-widest text-[oklch(0.45_0.05_220)]"
        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
      >
        {label}
      </div>
      <div className="flex items-end gap-1">
        <span
          className="text-[1.8rem] font-bold leading-none tabular-nums"
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            color: warn ? 'oklch(0.65 0.25 25)' : 'oklch(0.65 0.20 195)',
          }}
        >
          {value}
        </span>
        {unit && <span className="text-[0.7rem] text-[oklch(0.45_0.05_220)] mb-0.5">{unit}</span>}
      </div>
    </div>
  );
}

export function MetricsPanel() {
  const metrics = useDashboardStore((s) => s.metrics);
  const processes = useDashboardStore((s) => s.processes);
  const sessions = useDashboardStore((s) => s.sessions);
  const prevMetrics = useRef<SystemMetrics | null>(null);

  const cpuPct = metrics ? Math.round(metrics.cpu) : 0;
  const memPct = metrics ? Math.round((metrics.memory.used / metrics.memory.total) * 100) : 0;
  const activeSessions = sessions.filter((s) => s.status === 'active' || s.status === 'idle').length;

  const cpuHistory = useCpuHistory(cpuPct);
  prevMetrics.current = metrics;

  if (!metrics) {
    return (
      <div
        className="flex items-center justify-center h-full text-[0.75rem] text-[oklch(0.40_0.05_220)]"
        style={{ fontFamily: 'JetBrains Mono, monospace' }}
      >
        Waiting for system metrics...
      </div>
    );
  }

  const memUsedGB = (metrics.memory.used / 1024 / 1024 / 1024).toFixed(1);
  const memTotalGB = (metrics.memory.total / 1024 / 1024 / 1024).toFixed(1);

  return (
    <div className="h-full overflow-y-auto p-2 flex flex-col gap-2">
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-2">
        <KpiCard label="CPU" value={cpuPct} unit="%" warn={cpuPct > 80} />
        <KpiCard label="Memory" value={memPct} unit="%" warn={memPct > 85} />
        <KpiCard label="Processes" value={processes.length} />
        <KpiCard label="Sessions" value={sessions.length} unit={activeSessions > 0 ? `${activeSessions} active` : undefined} />
      </div>

      {/* CPU sparkline */}
      <div
        className="rounded-sm p-2 border border-[oklch(0.30_0.05_220)]"
        style={{ backgroundColor: 'oklch(0.16 0.02 260)' }}
      >
        <div
          className="text-[0.6rem] uppercase tracking-widest text-[oklch(0.45_0.05_220)] mb-1"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          CPU — 60s
        </div>
        <SparkLine values={cpuHistory} color="oklch(0.65 0.20 195)" />
      </div>

      {/* Memory bar */}
      <div
        className="rounded-sm p-2 border border-[oklch(0.30_0.05_220)]"
        style={{ backgroundColor: 'oklch(0.16 0.02 260)' }}
      >
        <div
          className="text-[0.6rem] uppercase tracking-widest text-[oklch(0.45_0.05_220)] mb-1.5"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          Memory — {memUsedGB}G / {memTotalGB}G
        </div>
        <div className="w-full h-2 rounded-full bg-[oklch(0.22_0.02_260)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${memPct}%`,
              background: `linear-gradient(90deg, oklch(0.65 0.20 195), oklch(0.70 0.15 145))`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
