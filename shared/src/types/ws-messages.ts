import type {
  CopilotProcess,
  CopilotSession,
  CopilotConfig,
  NetworkEvent,
  LogEntry,
  SystemMetrics,
} from './copilot.js';

// Server → Client messages
export type ServerMessage =
  | { type: 'log-line'; payload: LogEntry }
  | { type: 'process-update'; payload: { processes: CopilotProcess[] } }
  | { type: 'session-update'; payload: { sessions: CopilotSession[] } }
  | { type: 'system-metrics'; payload: SystemMetrics }
  | { type: 'network-event'; payload: NetworkEvent }
  | { type: 'config-update'; payload: { config: CopilotConfig } }
  | {
      type: 'init';
      payload: {
        logs: LogEntry[];
        processes: CopilotProcess[];
        sessions: CopilotSession[];
        metrics: SystemMetrics | null;
        config: CopilotConfig | null;
        networkEvents: NetworkEvent[];
      };
    }
  | { type: 'proxy-status'; payload: { running: boolean; port: number } };

// Client → Server messages
export type ClientMessage =
  | { type: 'subscribe'; payload: { channels: string[] } }
  | { type: 'command'; payload: { action: string; args: Record<string, unknown> } }
  | { type: 'ping' };
