import os from 'os';
import path from 'path';

export interface CopilotPaths {
  base: string;
  logsDir: string;
  sessionStateDir: string;
  configJson: string;
  mcpConfigJson: string;
  commandHistoryState: string;
  agentsDir: string;
}

export function getCopilotPaths(): CopilotPaths {
  const base = process.env['COPILOT_HOME'] ?? path.join(os.homedir(), '.copilot');
  return {
    base,
    logsDir: path.join(base, 'logs'),
    sessionStateDir: path.join(base, 'session-state'),
    configJson: path.join(base, 'config.json'),
    mcpConfigJson: path.join(base, 'mcp-config.json'),
    commandHistoryState: path.join(base, 'command-history-state.json'),
    agentsDir: path.join(base, 'agents'),
  };
}
