import { useState } from 'react';
import { ChevronDown, ChevronUp, GripHorizontal } from 'lucide-react';

interface PanelWrapperProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function PanelWrapper({ title, children, className = '' }: PanelWrapperProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={`panel-glow flex flex-col h-full rounded-sm bg-[oklch(0.16_0.02_260)] overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[oklch(0.30_0.05_220)] bg-[oklch(0.18_0.02_260)] flex-shrink-0 cursor-grab active:cursor-grabbing drag-handle">
        <div className="flex items-center gap-2">
          <GripHorizontal size={12} className="text-[oklch(0.45_0.05_220)]" />
          <span
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            className="text-[0.65rem] uppercase tracking-[0.15em] text-[oklch(0.65_0.20_195)] font-medium"
          >
            {title}
          </span>
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-[oklch(0.45_0.05_220)] hover:text-[oklch(0.65_0.20_195)] transition-colors"
        >
          {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </button>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="flex-1 overflow-hidden min-h-0">
          {children}
        </div>
      )}
    </div>
  );
}
