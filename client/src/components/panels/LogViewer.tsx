import { useRef, useEffect, useState, useCallback } from 'react';
import { useDashboardStore } from '../../stores/dashboard-store';
import type { LogEntry } from '@shared/types/copilot';

const LEVEL_COLOR: Record<LogEntry['level'], string> = {
  debug: 'oklch(0.55 0.02 220)',
  info: 'oklch(0.65 0.20 195)',
  warn: 'oklch(0.80 0.15 80)',
  error: 'oklch(0.65 0.25 25)',
};

const LEVEL_BG: Record<LogEntry['level'], string> = {
  debug: 'oklch(0.25 0.01 220)',
  info: 'oklch(0.20 0.05 195)',
  warn: 'oklch(0.22 0.05 80)',
  error: 'oklch(0.22 0.08 25)',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
}

export function LogViewer() {
  const logs = useDashboardStore((s) => s.logs);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);
  const [search, setSearch] = useState('');
  const [levels, setLevels] = useState<Set<LogEntry['level']>>(
    new Set(['debug', 'info', 'warn', 'error'])
  );

  // Auto-scroll
  useEffect(() => {
    if (pinned) bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [logs, pinned]);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
    setPinned(atBottom);
  }, []);

  const toggleLevel = (level: LogEntry['level']) => {
    setLevels((prev) => {
      const next = new Set(prev);
      next.has(level) ? next.delete(level) : next.add(level);
      return next;
    });
  };

  const filtered = logs.filter(
    (l) => levels.has(l.level) && (!search || l.line.toLowerCase().includes(search.toLowerCase()))
  );

  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-4 text-center">
        <div>
          <div className="text-[oklch(0.45_0.05_220)] text-[0.75rem] mb-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            Waiting for Copilot CLI logs...
          </div>
          <div className="text-[oklch(0.35_0.03_220)] text-[0.7rem]">
            Start copilot with{' '}
            <code className="text-[oklch(0.65_0.20_195)]">--log-level debug</code>
            {' '}to see activity here
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-[oklch(0.22_0.03_220)] text-[0.65rem]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        {(['debug', 'info', 'warn', 'error'] as LogEntry['level'][]).map((lvl) => (
          <button
            key={lvl}
            onClick={() => toggleLevel(lvl)}
            className="px-1.5 py-0.5 rounded uppercase tracking-wider transition-opacity"
            style={{
              color: LEVEL_COLOR[lvl],
              backgroundColor: levels.has(lvl) ? LEVEL_BG[lvl] : 'transparent',
              opacity: levels.has(lvl) ? 1 : 0.4,
              border: `1px solid ${LEVEL_COLOR[lvl]}44`,
            }}
          >
            {lvl}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="filter..."
          className="flex-1 bg-transparent border border-[oklch(0.25_0.03_220)] rounded px-2 py-0.5 text-[oklch(0.70_0.05_220)] placeholder-[oklch(0.35_0.03_220)] outline-none focus:border-[oklch(0.65_0.20_195)]"
        />
        <button
          onClick={() => setPinned((p) => !p)}
          className="px-1.5 py-0.5 rounded uppercase tracking-wider"
          style={{
            color: pinned ? 'oklch(0.70 0.15 145)' : 'oklch(0.45 0.05 220)',
            backgroundColor: pinned ? 'oklch(0.20 0.05 145)' : 'transparent',
            border: `1px solid ${pinned ? 'oklch(0.70 0.15 145)' : 'oklch(0.30 0.05 220)'}44`,
          }}
        >
          {pinned ? '⬇ pinned' : 'scroll'}
        </button>
      </div>

      {/* Log lines */}
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-2 py-1"
        style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem' }}
      >
        {filtered.map((entry) => (
          <div key={entry.id} className="flex items-start gap-2 py-0.5 hover:bg-[oklch(0.18_0.02_260)]">
            <span className="text-[oklch(0.40_0.05_220)] shrink-0 tabular-nums">
              {formatTime(entry.timestamp)}
            </span>
            <span
              className="shrink-0 px-1 rounded uppercase text-[0.6rem]"
              style={{ color: LEVEL_COLOR[entry.level], backgroundColor: LEVEL_BG[entry.level] }}
            >
              {entry.level}
            </span>
            <span className="text-[oklch(0.55_0.05_220)] shrink-0 max-w-[100px] truncate">
              {entry.source}
            </span>
            <span className="text-[oklch(0.80_0.03_200)] break-all">{entry.line}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
