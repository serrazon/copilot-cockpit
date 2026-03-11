import { useEffect, useState } from 'react';
import { wsClient } from './lib/ws-client';
import { useDashboardStore } from './stores/dashboard-store';
import { StatusBar } from './components/StatusBar';
import { DashboardGrid } from './components/layout/DashboardGrid';

const WS_URL = `ws://${window.location.hostname}:3001`;

function Header() {
  const [utc, setUtc] = useState('');
  const processes = useDashboardStore((s) => s.processes);
  const sessions = useDashboardStore((s) => s.sessions);
  const activeSessions = sessions.filter((s) => s.status === 'active').length;

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setUtc(
        now.toUTCString().replace(' GMT', 'Z').replace(/^.*?, /, '')
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex-shrink-0">
      <div
        className="flex items-center justify-between px-5 py-2.5 bg-[oklch(0.11_0.02_260)]"
        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
      >
        {/* Left */}
        <div className="text-[0.9rem] font-bold uppercase tracking-[0.25em] text-[oklch(0.65_0.20_195)]">
          ◆ COPILOT COCKPIT
        </div>

        {/* Center */}
        <div
          className="text-[0.65rem] text-[oklch(0.55_0.08_195)] tabular-nums"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          {utc}
        </div>

        {/* Right */}
        <div
          className="text-[0.65rem] text-[oklch(0.45_0.05_220)] uppercase tracking-wider"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          <span className="text-[oklch(0.65_0.20_195)]">{processes.length}</span> PROCESSES
          {' | '}
          <span className="text-[oklch(0.65_0.20_195)]">{activeSessions}</span> ACTIVE SESSIONS
        </div>
      </div>

      {/* Gradient line */}
      <div
        className="h-px w-full"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, oklch(0.65 0.20 195) 50%, transparent 100%)',
          opacity: 0.6,
        }}
      />
    </div>
  );
}

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
      <Header />
      <StatusBar />
      <DashboardGrid />
    </div>
  );
}
