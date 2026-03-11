import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const TERMINAL_THEME = {
  background: '#0a0e1a',
  foreground: '#c8d8e8',
  cursor: '#00d4ff',
  cursorAccent: '#0a0e1a',
  black: '#0a0e1a',
  red: '#e05a5a',
  green: '#50d890',
  yellow: '#e0c050',
  blue: '#5090d0',
  magenta: '#c060d0',
  cyan: '#00d4ff',
  white: '#c8d8e8',
  brightBlack: '#2a3a5a',
  brightRed: '#ff7070',
  brightGreen: '#70f8a0',
  brightYellow: '#f0d060',
  brightBlue: '#70b0f0',
  brightMagenta: '#d080e0',
  brightCyan: '#40e8ff',
  brightWhite: '#e8f0f8',
};

export function TerminalPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: TERMINAL_THEME,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 12,
      lineHeight: 1.4,
      scrollback: 5000,
      cursorStyle: 'bar',
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();

    termRef.current = term;
    fitRef.current = fit;

    term.writeln('\x1b[36m◆ COPILOT COCKPIT — Terminal Output\x1b[0m');
    term.writeln('\x1b[2mConnecting to log stream...\x1b[0m');

    // Connect to SSE stream
    const es = new EventSource('/api/logs/stream');
    esRef.current = es;

    es.onopen = () => term.writeln('\x1b[32m[stream connected]\x1b[0m');
    es.onerror = () => term.writeln('\x1b[31m[stream disconnected — retrying...]\x1b[0m');
    es.onmessage = (e) => term.writeln(e.data as string);

    const ro = new ResizeObserver(() => fit.fit());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      es.close();
      term.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ padding: '4px' }}
    />
  );
}
