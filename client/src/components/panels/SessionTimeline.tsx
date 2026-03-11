import { useDashboardStore } from '../../stores/dashboard-store';
import type { CopilotSession } from '@shared/types/copilot';

const STATUS_COLOR: Record<CopilotSession['status'], string> = {
  active: 'oklch(0.65 0.20 195)',
  idle: 'oklch(0.45 0.05 220)',
  ended: 'oklch(0.30 0.03 220)',
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

export function SessionTimeline() {
  const sessions = useDashboardStore((s) => s.sessions);

  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[0.75rem] text-[oklch(0.40_0.05_220)]"
        style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        No sessions recorded yet
      </div>
    );
  }

  const now = Date.now();
  const earliest = Math.min(...sessions.map((s) => s.startTime));
  const range = Math.max(now - earliest, 1);

  return (
    <div className="h-full overflow-y-auto p-3 flex flex-col gap-2">
      {sessions.map((session) => {
        const left = ((session.startTime - earliest) / range) * 100;
        const end = session.endTime ?? now;
        const width = Math.max(((end - session.startTime) / range) * 100, 1);
        const color = STATUS_COLOR[session.status];

        return (
          <div key={session.id} className="group">
            {/* Label */}
            <div className="flex items-center justify-between mb-0.5 text-[0.65rem]"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              <span className="text-[oklch(0.55_0.10_195)] truncate max-w-[50%]">
                {session.id.slice(0, 12)}…
              </span>
              <span className="text-[oklch(0.40_0.05_220)] truncate max-w-[48%]" title={session.cwd}>
                {session.summary ?? session.model} · {session.interactions} interactions
              </span>
            </div>

            {/* Timeline bar */}
            <div className="relative w-full h-5 bg-[oklch(0.18_0.02_260)] rounded-sm overflow-hidden">
              <div
                className="absolute top-0 h-full rounded-sm flex items-center px-1.5 overflow-hidden"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: color,
                  opacity: session.status === 'ended' ? 0.4 : 0.7,
                }}
              >
                <span className="text-[0.6rem] text-white truncate" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {session.status}
                </span>
              </div>

              {/* Current time indicator */}
              {session.status === 'active' && (
                <div
                  className="absolute top-0 h-full w-px bg-[oklch(0.85_0.20_195)]"
                  style={{ left: `${((now - earliest) / range) * 100}%` }}
                />
              )}
            </div>

            {/* Time labels */}
            <div className="flex justify-between text-[0.6rem] text-[oklch(0.35_0.03_220)] mt-0.5"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              <span>{formatTime(session.startTime)}</span>
              {session.endTime && <span>{formatTime(session.endTime)}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
