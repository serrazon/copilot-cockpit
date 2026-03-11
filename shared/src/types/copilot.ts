export interface CopilotProcess {
  pid: number;
  name: string;
  cmd: string;
  cpu: number;
  memory: number;
  children: CopilotProcess[];
  startTime: number;
}

export interface CopilotSession {
  id: string;
  startTime: number;
  endTime?: number;
  interactions: number;
  model: string;
  status: 'active' | 'idle' | 'ended';
}

export interface McpServerConfig {
  name: string;
  type: 'stdio' | 'http' | 'sse';
  command?: string;
  url?: string;
  args?: string[];
}

export interface AgentDef {
  name: string;
  path: string;
  content?: string;
}

export interface CopilotConfig {
  trustedFolders: string[];
  defaultModel: string;
  mcpServers: McpServerConfig[];
  agents: AgentDef[];
}

export interface NetworkEvent {
  id: string;
  method: string;
  url: string;
  status: number;
  duration: number;
  size: number;
  timestamp: number;
  requestHeaders?: Record<string, string>;
  responsePreview?: string;
}

export interface LogEntry {
  id: string;
  source: string;
  line: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
}

export interface SystemMetrics {
  cpu: number;
  memory: {
    used: number;
    total: number;
    free: number;
  };
  uptime: number;
  timestamp: number;
}
