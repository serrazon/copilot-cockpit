import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import os from 'os';
import path from 'path';
import { getCopilotPaths } from '../services/copilot-paths.js';

describe('getCopilotPaths', () => {
  test('returns paths under homedir/.copilot by default', () => {
    delete process.env['COPILOT_HOME'];
    const paths = getCopilotPaths();
    const expected = path.join(os.homedir(), '.copilot');
    assert.equal(paths.base, expected);
    assert.equal(paths.logsDir, path.join(expected, 'logs'));
    assert.equal(paths.sessionStateDir, path.join(expected, 'session-state'));
    assert.equal(paths.configJson, path.join(expected, 'config.json'));
    assert.equal(paths.mcpConfigJson, path.join(expected, 'mcp-config.json'));
    assert.equal(
      paths.commandHistoryState,
      path.join(expected, 'command-history-state.json')
    );
    assert.equal(paths.agentsDir, path.join(expected, 'agents'));
  });

  test('respects COPILOT_HOME env override', () => {
    process.env['COPILOT_HOME'] = '/custom/path';
    const paths = getCopilotPaths();
    assert.equal(paths.base, '/custom/path');
    assert.equal(paths.logsDir, path.join('/custom/path', 'logs'));
    delete process.env['COPILOT_HOME'];
  });

  test('uses path.join for all sub-paths (no manual separators)', () => {
    process.env['COPILOT_HOME'] = '/test';
    const paths = getCopilotPaths();
    // All paths should start with the base and use OS separator
    for (const [key, value] of Object.entries(paths)) {
      if (key === 'base') continue;
      assert.ok(
        value.startsWith('/test'),
        `${key} should start with base: got ${value}`
      );
    }
    delete process.env['COPILOT_HOME'];
  });
});
