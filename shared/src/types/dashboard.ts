export type PanelType = 'terminal' | 'processes' | 'logs' | 'metrics' | 'sessions' | 'network';

export interface GridPosition {
  x: number;
  y: number;
}

export interface GridSize {
  w: number;
  h: number;
}

export interface PanelConfig {
  id: string;
  type: PanelType;
  title: string;
  position: GridPosition;
  size: GridSize;
}

export type DashboardLayout = PanelConfig[];

export const DEFAULT_LAYOUT: DashboardLayout = [
  { id: 'terminal', type: 'terminal', title: 'Terminal', position: { x: 0, y: 0 }, size: { w: 6, h: 4 } },
  { id: 'processes', type: 'processes', title: 'Processes', position: { x: 6, y: 0 }, size: { w: 6, h: 4 } },
  { id: 'sessions', type: 'sessions', title: 'Sessions', position: { x: 0, y: 4 }, size: { w: 6, h: 3 } },
  { id: 'network', type: 'network', title: 'Network', position: { x: 6, y: 4 }, size: { w: 6, h: 3 } },
  { id: 'logs', type: 'logs', title: 'Logs', position: { x: 0, y: 7 }, size: { w: 8, h: 3 } },
  { id: 'metrics', type: 'metrics', title: 'Metrics', position: { x: 8, y: 7 }, size: { w: 4, h: 3 } },
];
