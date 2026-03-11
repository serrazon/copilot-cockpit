import type { ServerMessage, ClientMessage } from '@shared/types/ws-messages';

type MessageHandler = (msg: ServerMessage) => void;
type StatusHandler = (status: 'connecting' | 'connected' | 'disconnected') => void;

const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000];

class WsClient {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private queue: ClientMessage[] = [];
  public status: 'connecting' | 'connected' | 'disconnected' = 'disconnected';

  connect(url: string) {
    this.destroyed = false;
    this._connect(url);
  }

  private _connect(url: string) {
    if (this.destroyed) return;
    this._setStatus('connecting');
    try {
      this.ws = new WebSocket(url);
    } catch {
      this._scheduleReconnect(url);
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      this._setStatus('connected');
      // flush queued messages
      for (const msg of this.queue) this._send(msg);
      this.queue = [];
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as ServerMessage;
        for (const h of this.messageHandlers) h(msg);
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this._setStatus('disconnected');
      this._scheduleReconnect(url);
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror
    };
  }

  private _scheduleReconnect(url: string) {
    if (this.destroyed) return;
    const delay = BACKOFF_MS[Math.min(this.reconnectAttempt, BACKOFF_MS.length - 1)];
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => this._connect(url), delay);
  }

  private _setStatus(status: 'connecting' | 'connected' | 'disconnected') {
    this.status = status;
    for (const h of this.statusHandlers) h(status);
  }

  private _send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this._send(msg);
    } else {
      this.queue.push(msg);
    }
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStatus(handler: StatusHandler) {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  destroy() {
    this.destroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
}

export const wsClient = new WsClient();
