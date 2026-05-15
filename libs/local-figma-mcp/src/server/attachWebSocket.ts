import type { Server } from 'node:http';
import { WebSocketServer } from 'ws';
import type { PluginBridge } from '../bridge/PluginBridge.js';

export function attachPluginWebSocket(
  httpServer: Server,
  path: string,
  bridge: PluginBridge
): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    const urlPath = req.url?.split('?')[0] ?? '';
    if (urlPath !== path) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws) => {
    bridge.attach(ws);
    const interval = setInterval(() => {
      if (ws.readyState === 1) {
        try {
          ws.send(JSON.stringify({ type: 'ping' }));
        } catch {
          /* ignore */
        }
      }
    }, 30_000);
    ws.on('close', () => clearInterval(interval));
  });

  return wss;
}
