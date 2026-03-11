import { useDashboardStore } from '../../stores/dashboard-store';

function KpiCard({ label, value, unit, warn }: { label: string; value: string | number; unit?: string; warn?: boolean }) {
  return (
    <div
      className="panel-glow rounded-sm p-3 flex flex-col gap-1"
      style={{
        backgroundColor: 'oklch(0.16 0.02 260)',
        boxShadow: warn
          ? '0 0 12px oklch(0.65 0.25 25 / 0.3)'
          : '0 0 6px oklch(0.65 0.20 195 / 0.08)',
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
          className="text-[1.8rem] font-bold leading-none"
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            color: warn ? 'oklch(0.65 0.25 25)' : 'oklch(0.65 0.20 195)',
          }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-[0.7rem] text-[oklch(0.45_0.05_220)] mb-0.5">{unit}</span>
        )}
      </div>
    </div>
  );
}

function BarChart({ values, color = 'oklch(0.65 0.20 195)' }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-px h-12">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all duration-300"
          style={{
            height: `${(v / max) * 100}%`,
            backgroundColor: color,
            opacity: 0.3 + (i / values.length) * 0.7,
          }}
        />
      ))}
    </div>
  );
}

export function MetricsPanel() {
  const metrics = useDashboardStore((s) => s.metrics);
  const processes = useDashboardStore((s) => s.processes);
  const sessions = useDashboardStore((s) => s.sessions);

  // Keep rolling window of CPU values in module-level ref (simple approach)
  // We use a local trick: just show current value as bar chart placeholder
  const cpuPct = metrics ? Math.round(metrics.cpu) : 0;
  const memPct = metrics
    ? Math.round((metrics.memory.used / metrics.memory.total) * 100)
    : 0;
  const activeSessions = sessions.filter((s) => s.status === 'active').length;

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-full text-[0.75rem] text-[oklch(0.40_0.05_220)]"
        style={{ fontFamily: 'JetBrains Mono, monospace' }}>
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
        <KpiCard label="Sessions" value={activeSessions} />
      </div>

      {/* Memory bar */}
      <div className="panel-glow rounded-sm p-2" style={{ backgroundColor: 'oklch(0.16 0.02 260)' }}>
        <div className="text-[0.6rem] uppercase tracking-widest text-[oklch(0.45_0.05_220)] mb-1.5"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Memory Usage — {memUsedGB}G / {memTotalGB}G
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

      {/* CPU sparkline */}
      <div className="panel-glow rounded-sm p-2 flex-1" style={{ backgroundColor: 'oklch(0.16 0.02 260)' }}>
        <div className="text-[0.6rem] uppercase tracking-widest text-[oklch(0.45_0.05_220)] mb-1.5"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          CPU — {cpuPct}%
        </div>
        <BarChart values={[cpuPct]} />
      </div>
    </div>
  );
}
