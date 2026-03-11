import { describe, it, expect, beforeEach } from 'vitest';
import { useDashboardStore } from '../stores/dashboard-store';
import type { LogEntry, NetworkEvent } from '@shared/types/copilot';

function makeLog(id: string): LogEntry {
  return { id, source: 'test', line: `line ${id}`, timestamp: Date.now(), level: 'info' };
}

function makeNetworkEvent(id: string): NetworkEvent {
  return {
    id,
    method: 'GET',
    url: 'https://api.githubcopilot.com/completions',
    status: 200,
    duration: 100,
    size: 512,
    timestamp: Date.now(),
  };
}

describe('dashboard-store ring buffer', () => {
  beforeEach(() => {
    useDashboardStore.setState({
      logs: [],
      networkEvents: [],
    });
  });

  it('adds log entries', () => {
    useDashboardStore.getState().addLog(makeLog('a'));
    expect(useDashboardStore.getState().logs).toHaveLength(1);
  });

  it('caps logs at 1000', () => {
    const store = useDashboardStore.getState();
    for (let i = 0; i < 1100; i++) {
      store.addLog(makeLog(String(i)));
    }
    expect(useDashboardStore.getState().logs).toHaveLength(1000);
  });

  it('keeps newest logs when over cap (ring buffer)', () => {
    const store = useDashboardStore.getState();
    for (let i = 0; i < 1005; i++) {
      store.addLog(makeLog(String(i)));
    }
    const logs = useDashboardStore.getState().logs;
    expect(logs[0].id).toBe('5');
    expect(logs[logs.length - 1].id).toBe('1004');
  });

  it('caps network events at 500', () => {
    const store = useDashboardStore.getState();
    for (let i = 0; i < 600; i++) {
      store.addNetworkEvent(makeNetworkEvent(String(i)));
    }
    expect(useDashboardStore.getState().networkEvents).toHaveLength(500);
  });

  it('handles init message and populates all slices', () => {
    useDashboardStore.getState().handleServerMessage({
      type: 'init',
      payload: {
        logs: [makeLog('x')],
        processes: [],
        sessions: [],
        metrics: null,
        config: null,
        networkEvents: [makeNetworkEvent('y')],
      },
    });
    const state = useDashboardStore.getState();
    expect(state.logs).toHaveLength(1);
    expect(state.networkEvents).toHaveLength(1);
  });

  it('handles log-line message', () => {
    const entry = makeLog('z');
    useDashboardStore.getState().handleServerMessage({ type: 'log-line', payload: entry });
    expect(useDashboardStore.getState().logs).toContainEqual(entry);
  });

  it('tracks connection status', () => {
    useDashboardStore.getState().setConnectionStatus('connected');
    expect(useDashboardStore.getState().connectionStatus).toBe('connected');
    useDashboardStore.getState().setConnectionStatus('disconnected');
    expect(useDashboardStore.getState().connectionStatus).toBe('disconnected');
  });
});
