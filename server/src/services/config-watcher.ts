import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import chokidar from 'chokidar';
import type { CopilotConfig, AgentDef } from '@shared/types/copilot.js';
import { getCopilotPaths } from './copilot-paths.js';

const DEFAULT_CONFIG: CopilotConfig = {
  trustedFolders: [],
  defaultModel: 'unknown',
  mcpServers: [],
  agents: [],
};

class ConfigWatcher extends EventEmitter {
  private watcher: ReturnType<typeof chokidar.watch> | null = null;
  private config: CopilotConfig = { ...DEFAULT_CONFIG };
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  start() {
    this._watch();
  }

  getConfig(): CopilotConfig {
    return this.config;
  }

  private _watch() {
    const { configJson, mcpConfigJson, agentsDir, base } = getCopilotPaths();

    if (!fs.existsSync(base)) {
      console.warn(`[config-watcher] ${base} not found, retrying in 10s`);
      this.retryTimer = setTimeout(() => this._watch(), 10_000);
      return;
    }

    // Forward slashes required by chokidar on Windows
    const toGlob = (p: string) => p.split(path.sep).join('/');

    const targets = [toGlob(configJson), toGlob(mcpConfigJson)];
    if (fs.existsSync(agentsDir)) {
      targets.push(toGlob(agentsDir) + '/*.md');
    }

    console.log(`[config-watcher] Watching config files in ${base}`);

    this.watcher = chokidar.watch(targets, {
      ignoreInitial: false,
      persistent: true,
      usePolling: process.platform === 'win32',
      interval: 500,
    });

    this.watcher.on('add', () => this._reload());
    this.watcher.on('change', () => this._reload());
    this.watcher.on('error', (err) => console.error('[config-watcher] Error:', err));
  }

  private _reload() {
    const { configJson, mcpConfigJson, agentsDir } = getCopilotPaths();
    const merged: CopilotConfig = { ...DEFAULT_CONFIG };

    // Main config
    if (fs.existsSync(configJson)) {
      try {
        const raw = JSON.parse(fs.readFileSync(configJson, 'utf8')) as Record<string, unknown>;
        if (Array.isArray(raw['trustedFolders'])) merged.trustedFolders = raw['trustedFolders'] as string[];
        if (typeof raw['defaultModel'] === 'string') merged.defaultModel = raw['defaultModel'];
      } catch { /* ignore */ }
    }

    // MCP config
    if (fs.existsSync(mcpConfigJson)) {
      try {
        const raw = JSON.parse(fs.readFileSync(mcpConfigJson, 'utf8')) as Record<string, unknown>;
        if (Array.isArray(raw['mcpServers'])) {
          merged.mcpServers = raw['mcpServers'] as CopilotConfig['mcpServers'];
        }
      } catch { /* ignore */ }
    }

    // Agents
    if (fs.existsSync(agentsDir)) {
      try {
        const agentFiles = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md'));
        merged.agents = agentFiles.map((f): AgentDef => ({
          name: path.basename(f, '.md'),
          path: path.join(agentsDir, f),
        }));
      } catch { /* ignore */ }
    }

    this.config = merged;
    this.emit('config', merged);
  }

  stop() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.watcher?.close();
  }
}

export const configWatcher = new ConfigWatcher();
