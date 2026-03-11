import { useCallback, useEffect, useState } from 'react';
import ReactGridLayout, { type Layout } from 'react-grid-layout';
// @ts-ignore — CSS handled by bundler
import 'react-grid-layout/css/styles.css';
import { useDashboardStore } from '../../stores/dashboard-store';
import { PanelWrapper } from './PanelWrapper';
import { LogViewer } from '../panels/LogViewer';
import { ProcessTree } from '../panels/ProcessTree';
import { TerminalPanel } from '../panels/TerminalPanel';
import { MetricsPanel } from '../panels/MetricsPanel';
import { SessionTimeline } from '../panels/SessionTimeline';
import { NetworkInspector } from '../panels/NetworkInspector';
import type { PanelType } from '@shared/types/dashboard';

const STORAGE_KEY = 'cockpit-layout';
const COLS = 12;
const ROW_HEIGHT = 60;

function panelTitle(type: PanelType): string {
  const titles: Record<PanelType, string> = {
    terminal: 'Terminal Output',
    processes: 'Process Tree',
    logs: 'Log Viewer',
    metrics: 'System Metrics',
    sessions: 'Session Timeline',
    network: 'Network Inspector',
  };
  return titles[type];
}

function PanelContent({ type }: { type: PanelType }) {
  switch (type) {
    case 'terminal': return <TerminalPanel />;
    case 'processes': return <ProcessTree />;
    case 'logs': return <LogViewer />;
    case 'metrics': return <MetricsPanel />;
    case 'sessions': return <SessionTimeline />;
    case 'network': return <NetworkInspector />;
  }
}

export function DashboardGrid() {
  const panels = useDashboardStore((s) => s.layout);
  const updateLayout = useDashboardStore((s) => s.updateLayout);
  const [containerWidth, setContainerWidth] = useState(window.innerWidth);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    const el = document.getElementById('dashboard-container');
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Load saved layout from localStorage
  const savedLayout: Layout[] | null = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Layout[]) : null;
    } catch {
      return null;
    }
  })();

  const gridLayout: Layout[] = panels.map((p) => {
    const saved = savedLayout?.find((l) => l.i === p.id);
    return {
      i: p.id,
      x: saved?.x ?? p.position.x,
      y: saved?.y ?? p.position.y,
      w: saved?.w ?? p.size.w,
      h: saved?.h ?? p.size.h,
      minW: 3,
      minH: 2,
    };
  });

  const onLayoutChange = useCallback(
    (newLayout: Layout[]) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout));
      updateLayout(
        panels.map((p) => {
          const l = newLayout.find((x) => x.i === p.id);
          if (!l) return p;
          return { ...p, position: { x: l.x, y: l.y }, size: { w: l.w, h: l.h } };
        })
      );
    },
    [panels, updateLayout]
  );

  return (
    <div id="dashboard-container" className="flex-1 overflow-auto">
      <ReactGridLayout
        layout={gridLayout}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        width={containerWidth}
        draggableHandle=".drag-handle"
        onLayoutChange={onLayoutChange}
        margin={[6, 6]}
        containerPadding={[6, 6]}
        resizeHandles={['se']}
      >
        {panels.map((panel) => (
          <div key={panel.id}>
            <PanelWrapper title={panelTitle(panel.type)} className="h-full">
              <PanelContent type={panel.type} />
            </PanelWrapper>
          </div>
        ))}
      </ReactGridLayout>
    </div>
  );
}
