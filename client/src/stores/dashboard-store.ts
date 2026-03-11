import { create } from 'zustand';
import type { LogEntry, CopilotProcess, CopilotSession, SystemMetrics, CopilotConfig, NetworkEvent } from '@shared/types/copilot';
import type { DashboardLayout } from '@shared/types/dashboard';
import { DEFAULT_LAYOUT } from '@shared/types/dashboard';
import type { ServerMessage } from '@shared/types/ws-messages';

const LOG_CAP = 1000;
const NETWORK_CAP = 500;

interface DashboardState {
  logs: LogEntry[];
  processes: CopilotProcess[];
  sessions: CopilotSession[];
  metrics: SystemMetrics | null;
  config: CopilotConfig | null;
  networkEvents: NetworkEvent[];
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  layout: DashboardLayout;

  addLog: (entry: LogEntry) => void;
  updateProcesses: (processes: CopilotProcess[]) => void;
  updateSessions: (sessions: CopilotSession[]) => void;
  updateMetrics: (metrics: SystemMetrics) => void;
  updateConfig: (config: CopilotConfig) => void;
  addNetworkEvent: (event: NetworkEvent) => void;
  setConnectionStatus: (status: 'connecting' | 'connected' | 'disconnected') => void;
  updateLayout: (layout: DashboardLayout) => void;
  handleServerMessage: (msg: ServerMessage) => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  logs: [],
  processes: [],
  sessions: [],
  metrics: null,
  config: null,
  networkEvents: [],
  connectionStatus: 'disconnected',
  layout: DEFAULT_LAYOUT,

  addLog: (entry) =>
    set((s) => ({
      logs: s.logs.length >= LOG_CAP
        ? [...s.logs.slice(1), entry]
        : [...s.logs, entry],
    })),

  updateProcesses: (processes) => set({ processes }),
  updateSessions: (sessions) => set({ sessions }),
  updateMetrics: (metrics) => set({ metrics }),
  updateConfig: (config) => set({ config }),

  addNetworkEvent: (event) =>
    set((s) => ({
      networkEvents: s.networkEvents.length >= NETWORK_CAP
        ? [...s.networkEvents.slice(1), event]
        : [...s.networkEvents, event],
    })),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  updateLayout: (layout) => set({ layout }),

  handleServerMessage: (msg) => {
    const store = get();
    switch (msg.type) {
      case 'init':
        set({
          logs: msg.payload.logs.slice(-LOG_CAP),
          processes: msg.payload.processes,
          sessions: msg.payload.sessions,
          metrics: msg.payload.metrics ?? null,
          config: msg.payload.config ?? null,
          networkEvents: msg.payload.networkEvents.slice(-NETWORK_CAP),
        });
        break;
      case 'log-line':
        store.addLog(msg.payload);
        break;
      case 'process-update':
        store.updateProcesses(msg.payload.processes);
        break;
      case 'session-update':
        store.updateSessions(msg.payload.sessions);
        break;
      case 'system-metrics':
        store.updateMetrics(msg.payload);
        break;
      case 'network-event':
        store.addNetworkEvent(msg.payload);
        break;
      case 'config-update':
        store.updateConfig(msg.payload.config);
        break;
    }
  },
}));
