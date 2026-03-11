import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { EventEmitter } from 'events';

// Minimal log tailing logic extracted for unit testing
function parseLevel(line: string): 'debug' | 'info' | 'warn' | 'error' {
  const l = line.toLowerCase();
  if (l.includes('[error]') || l.includes(' error ')) return 'error';
  if (l.includes('[warn]') || l.includes(' warn ')) return 'warn';
  if (l.includes('[info]') || l.includes(' info ')) return 'info';
  return 'debug';
}

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

describe('log-watcher utilities', () => {
  test('parseLevel — error', () => {
    assert.equal(parseLevel('[ERROR] something went wrong'), 'error');
    assert.equal(parseLevel('some error occurred'), 'error');
  });

  test('parseLevel — warn', () => {
    assert.equal(parseLevel('[WARN] watch out'), 'warn');
  });

  test('parseLevel — info', () => {
    assert.equal(parseLevel('[INFO] started'), 'info');
  });

  test('parseLevel — debug (default)', () => {
    assert.equal(parseLevel('verbose trace output'), 'debug');
  });

  test('normalizeLineEndings strips CRLF', () => {
    assert.equal(normalizeLineEndings('line1\r\nline2\r\n'), 'line1\nline2\n');
  });

  test('normalizeLineEndings leaves LF unchanged', () => {
    assert.equal(normalizeLineEndings('line1\nline2\n'), 'line1\nline2\n');
  });
});

describe('log file reading', () => {
  let tmpDir: string;
  let logFile: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-test-'));
    logFile = path.join(tmpDir, 'test.log');
    fs.writeFileSync(logFile, '[INFO] first line\n');
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('reads new bytes appended to a file', () => {
    const initialSize = fs.statSync(logFile).size;
    const newContent = '[WARN] second line\n';
    fs.appendFileSync(logFile, newContent);

    const newSize = fs.statSync(logFile).size;
    assert.ok(newSize > initialSize);

    // Read only the new bytes
    const buf = Buffer.alloc(newSize - initialSize);
    const fd = fs.openSync(logFile, 'r');
    fs.readSync(fd, buf, 0, buf.length, initialSize);
    fs.closeSync(fd);

    const text = buf.toString('utf8').replace(/\r\n/g, '\n');
    assert.equal(text, newContent);
  });

  test('detects file rotation when size decreases', () => {
    const size1 = fs.statSync(logFile).size;
    fs.writeFileSync(logFile, '[INFO] after rotation\n'); // truncate + rewrite
    const size2 = fs.statSync(logFile).size;

    const isRotation = size2 < size1;
    assert.ok(isRotation, 'Should detect rotation when new size < old size');
  });
});
