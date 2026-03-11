import { useState } from 'react';
import { useDashboardStore } from '../../stores/dashboard-store';

function statusColor(status: number): string {
  if (status >= 500) return 'oklch(0.65 0.25 25)';
  if (status >= 400) return 'oklch(0.80 0.15 80)';
  if (status >= 200) return 'oklch(0.70 0.15 145)';
  return 'oklch(0.55 0.05 220)';
}

function methodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: 'oklch(0.65 0.20 195)',
    POST: 'oklch(0.70 0.15 145)',
    PUT: 'oklch(0.75 0.15 80)',
    DELETE: 'oklch(0.65 0.25 25)',
    PATCH: 'oklch(0.70 0.15 290)',
  };
  return colors[method] ?? 'oklch(0.55 0.05 220)';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / 1024 / 1024).toFixed(1)}M`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

export function NetworkInspector() {
  const networkEvents = useDashboardStore((s) => s.networkEvents);
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = [...networkEvents].reverse();

  return (
    <div className="h-full flex flex-col">
      {/* Proxy notice */}
      <div className="px-3 py-1.5 text-[0.65rem] text-[oklch(0.50_0.08_80)] border-b border-[oklch(0.22_0.03_220)]"
        style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        Enable monitoring:{' '}
        <code className="text-[oklch(0.70_0.15_80)]">HTTPS_PROXY=http://localhost:8888</code>
        {' '}before starting copilot
      </div>

      {networkEvents.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[0.75rem] text-[oklch(0.40_0.05_220)]"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          No network events captured
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="grid text-[0.6rem] uppercase tracking-wider text-[oklch(0.40_0.05_220)] px-3 py-1 border-b border-[oklch(0.22_0.03_220)]"
            style={{ gridTemplateColumns: '60px 45px 1fr 40px 50px 40px', fontFamily: 'JetBrains Mono, monospace' }}>
            <span>Time</span>
            <span>Method</span>
            <span>URL</span>
            <span>Status</span>
            <span>Duration</span>
            <span>Size</span>
          </div>

          {sorted.map((event) => (
            <div key={event.id}>
              <div
                className="grid items-center px-3 py-1 hover:bg-[oklch(0.18_0.02_260)] cursor-pointer text-[0.7rem]"
                style={{ gridTemplateColumns: '60px 45px 1fr 40px 50px 40px', fontFamily: 'JetBrains Mono, monospace' }}
                onClick={() => setExpanded(expanded === event.id ? null : event.id)}
              >
                <span className="text-[oklch(0.40_0.05_220)]">{formatTime(event.timestamp)}</span>
                <span style={{ color: methodColor(event.method) }}>{event.method}</span>
                <span className="text-[oklch(0.65_0.10_195)] truncate" title={event.url}>
                  {event.url.replace(/^https?:\/\/[^/]+/, '')}
                </span>
                <span style={{ color: statusColor(event.status) }}>{event.status}</span>
                <span className="text-[oklch(0.55_0.05_220)]">{event.duration}ms</span>
                <span className="text-[oklch(0.45_0.05_220)]">{formatSize(event.size)}</span>
              </div>

              {expanded === event.id && (
                <div className="px-3 py-2 bg-[oklch(0.15_0.02_260)] border-t border-b border-[oklch(0.22_0.03_220)] text-[0.65rem]"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  <div className="text-[oklch(0.65_0.20_195)] mb-1 break-all">{event.url}</div>
                  {event.requestHeaders && (
                    <div className="text-[oklch(0.40_0.05_220)]">
                      {Object.entries(event.requestHeaders).map(([k, v]) => (
                        <div key={k}><span className="text-[oklch(0.55_0.10_195)]">{k}:</span> {v}</div>
                      ))}
                    </div>
                  )}
                  {event.responsePreview && (
                    <div className="mt-1 text-[oklch(0.55_0.05_220)] break-all">{event.responsePreview.slice(0, 200)}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
