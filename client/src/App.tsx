import { useEffect } from 'react';
import { wsClient } from './lib/ws-client';
import { useDashboardStore } from './stores/dashboard-store';
import { StatusBar } from './components/StatusBar';
import { DashboardGrid } from './components/layout/DashboardGrid';

const WS_URL = `ws://${window.location.hostname}:3001`;

export function App() {
  const setConnectionStatus = useDashboardStore((s) => s.setConnectionStatus);
  const handleServerMessage = useDashboardStore((s) => s.handleServerMessage);

  useEffect(() => {
    wsClient.connect(WS_URL);

    const unsubMsg = wsClient.onMessage(handleServerMessage);
    const unsubStatus = wsClient.onStatus(setConnectionStatus);

    return () => {
      unsubMsg();
      unsubStatus();
      wsClient.destroy();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[oklch(0.30_0.05_220)] bg-[oklch(0.12_0.02_260)] flex-shrink-0">
        <div
          className="text-[0.85rem] uppercase tracking-[0.2em] text-[oklch(0.65_0.20_195)]"
          style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700 }}
        >
          ◆ COPILOT COCKPIT
        </div>
        <div
          className="text-[0.65rem] text-[oklch(0.40_0.05_220)]"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          MISSION CONTROL DASHBOARD
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Main grid */}
      <DashboardGrid />
    </div>
  );
}
