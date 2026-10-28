import type { ClientMessage, ServerMessage } from '../shared/protocol';

type Handler = (msg: ServerMessage) => void;

export class NetClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<Handler>();
  onClose: (() => void) | null = null;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(`${proto}://${location.host}/ws`);
      const timer = setTimeout(() => {
        ws.close();
        reject(new Error('Timed out connecting to the game server.'));
      }, 6000);
      ws.onopen = () => {
        clearTimeout(timer);
        this.ws = ws;
        resolve();
      };
      ws.onerror = () => {
        clearTimeout(timer);
        reject(new Error('Could not reach the game server. Is `npm run dev` running?'));
      };
      ws.onclose = () => {
        if (this.ws === ws) {
          this.ws = null;
          this.onClose?.();
        }
      };
      ws.onmessage = (ev) => {
        let msg: ServerMessage;
        try {
          msg = JSON.parse(ev.data as string);
        } catch {
          return;
        }
        for (const h of this.handlers) h(msg);
      };
    });
  }

  get connected(): boolean {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  on(h: Handler): () => void {
    this.handlers.add(h);
    return () => this.handlers.delete(h);
  }

  send(msg: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  close() {
    const ws = this.ws;
    this.ws = null;
    ws?.close();
  }
}
