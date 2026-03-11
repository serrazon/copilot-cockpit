import { useState } from 'react';
import { ChevronRight, ChevronDown, Circle } from 'lucide-react';
import { useDashboardStore } from '../../stores/dashboard-store';
import type { CopilotProcess } from '@shared/types/copilot';

function formatMemMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}M`;
}

function formatDuration(startTime: number): string {
  const secs = Math.floor((Date.now() - startTime) / 1000);
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}

function ProcessRow({ proc, depth = 0 }: { proc: CopilotProcess; depth?: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = proc.children.length > 0;

  return (
    <>
      <div
        className="flex items-center gap-1.5 py-0.5 px-2 hover:bg-[oklch(0.18_0.02_260)] text-[0.72rem] group"
        style={{ paddingLeft: `${8 + depth * 16}px`, fontFamily: 'JetBrains Mono, monospace' }}
      >
        <button
          onClick={() => hasChildren && setExpanded((e) => !e)}
          className="w-3 h-3 flex items-center justify-center shrink-0"
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
        >
          {expanded ? (
            <ChevronDown size={10} className="text-[oklch(0.45_0.05_220)]" />
          ) : (
            <ChevronRight size={10} className="text-[oklch(0.45_0.05_220)]" />
          )}
        </button>

        <Circle size={6} fill="oklch(0.70 0.15 145)" stroke="none" className="shrink-0" />

        <span className="text-[oklch(0.70_0.15_195)] font-medium">{proc.name}</span>
        <span className="text-[oklch(0.40_0.05_220)]">pid:{proc.pid}</span>

        <span className="ml-auto flex items-center gap-3 text-[0.65rem]">
          <span>
            CPU <span className="text-[oklch(0.65_0.20_195)]">{proc.cpu.toFixed(1)}%</span>
          </span>
          <span>
            MEM <span className="text-[oklch(0.65_0.20_195)]">{formatMemMB(proc.memory)}</span>
          </span>
          <span className="text-[oklch(0.40_0.05_220)]">{formatDuration(proc.startTime)}</span>
        </span>
      </div>

      {expanded &&
        proc.children.map((child) => (
          <ProcessRow key={child.pid} proc={child} depth={depth + 1} />
        ))}
    </>
  );
}

export function ProcessTree() {
  const processes = useDashboardStore((s) => s.processes);

  if (processes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[0.75rem] text-[oklch(0.40_0.05_220)]"
        style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        No Copilot processes detected
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full py-1">
      {processes.map((proc) => (
        <ProcessRow key={proc.pid} proc={proc} />
      ))}
    </div>
  );
}
