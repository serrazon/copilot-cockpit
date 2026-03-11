import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Filter logic extracted for unit testing
function matchesCopilot(name: string, cmd: string): boolean {
  const patterns = ['copilot', 'gh copilot'];
  const haystack = `${name} ${cmd}`.toLowerCase();
  return patterns.some((p) => haystack.includes(p));
}

const mockProcessList = [
  { pid: 1, name: 'copilot', cmd: '/usr/local/bin/copilot --log-level debug', cpu: 5, memory: 100 },
  { pid: 2, name: 'node', cmd: 'node /path/to/copilot/server.js', cpu: 2, memory: 50 },
  { pid: 3, name: 'bash', cmd: 'bash -c gh copilot suggest', cpu: 0, memory: 10 },
  { pid: 4, name: 'chrome', cmd: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', cpu: 30, memory: 500 },
  { pid: 5, name: 'code', cmd: '/usr/share/code/code --no-sandbox', cpu: 1, memory: 200 },
];

describe('process-monitor filter logic', () => {
  test('matches process named "copilot"', () => {
    const p = mockProcessList[0];
    assert.ok(matchesCopilot(p.name, p.cmd));
  });

  test('matches node process with copilot in cmd', () => {
    const p = mockProcessList[1];
    assert.ok(matchesCopilot(p.name, p.cmd));
  });

  test('matches gh copilot in cmd', () => {
    const p = mockProcessList[2];
    assert.ok(matchesCopilot(p.name, p.cmd));
  });

  test('does NOT match Chrome', () => {
    const p = mockProcessList[3];
    assert.ok(!matchesCopilot(p.name, p.cmd));
  });

  test('does NOT match VS Code', () => {
    const p = mockProcessList[4];
    assert.ok(!matchesCopilot(p.name, p.cmd));
  });

  test('filters correctly across the full mock list', () => {
    const matched = mockProcessList.filter((p) => matchesCopilot(p.name, p.cmd));
    assert.equal(matched.length, 3);
    assert.deepEqual(
      matched.map((p) => p.pid),
      [1, 2, 3]
    );
  });
});
