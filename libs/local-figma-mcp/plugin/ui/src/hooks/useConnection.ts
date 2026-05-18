import { useCallback, useEffect, useRef, useState } from 'react';
import { WS_URL } from '../lib/constants';
import { postToPlugin, type PluginReply } from '../lib/plugin-bridge';

export function useConnection(onLog: (line: string, isErr?: boolean) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(1000);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposedRef = useRef(false);
  const onLogRef = useRef(onLog);
  onLogRef.current = onLog;

  const [connected, setConnected] = useState(false);
  const [meta, setMeta] = useState('Connecting…');
  const [fileName, setFileName] = useState('Untitled');

  const log = useCallback((line: string, isErr?: boolean) => {
    onLogRef.current(line, isErr);
  }, []);

  const sendHello = useCallback(() => {
    postToPlugin({ type: 'request_hello' });
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (disposedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const delay = backoffRef.current;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (disposedRef.current) return;
      backoffRef.current = Math.min(backoffRef.current * 2, 30_000);
      connectRef.current();
    }, delay);
  }, []);

  const connectRef = useRef<() => void>(() => {});

  connectRef.current = () => {
    if (disposedRef.current) return;

    const existing = wsRef.current;
    if (existing) {
      const state = existing.readyState;
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
        return;
      }
      existing.onclose = null;
      existing.onerror = null;
      existing.close();
      wsRef.current = null;
    }

    setConnected(false);
    setMeta(`Connecting to ${WS_URL}…`);

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      backoffRef.current = 1000;
      log('WebSocket open');
      sendHello();
    };

    ws.onmessage = (ev) => {
      let msg: { type: string; tool?: string; id?: string; args?: Record<string, unknown> };
      try {
        msg = JSON.parse(ev.data as string);
      } catch {
        return;
      }
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }
      if (msg.type === 'tool_request' && msg.id && msg.tool && msg.args) {
        log(`← ${msg.tool} ${msg.id.slice(0, 8)}`);
        postToPlugin({
          type: 'tool_request',
          id: msg.id,
          tool: msg.tool,
          args: msg.args,
        });
      }
    };

    ws.onclose = () => {
      if (wsRef.current === ws) wsRef.current = null;
      setConnected(false);
      setMeta('Disconnected — retrying…');
      log('WebSocket closed', true);
      scheduleReconnect();
    };

    ws.onerror = () => log('WebSocket error', true);
  };

  const connect = useCallback(() => {
    connectRef.current();
  }, []);

  useEffect(() => {
    disposedRef.current = false;

    const handler = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage as PluginReply | undefined;
      if (!msg) return;

      if (msg.type === 'hello_data') {
        const ws = wsRef.current;
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'plugin_hello',
              pluginVersion: msg.pluginVersion,
              fileKey: msg.fileKey,
              fileName: msg.fileName,
            })
          );
          const fileLabel = msg.fileKey ? `${msg.fileName} (${msg.fileKey})` : msg.fileName;
          setFileName(msg.fileName || 'Untitled');
          setConnected(true);
          setMeta(`File: ${fileLabel} · TB :3856`);
          log('plugin_hello sent');
        }
        return;
      }

      if (msg.type === 'log') {
        log(msg.line, msg.line.startsWith('✗'));
        return;
      }

      if (msg.type === 'tool_response' && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(msg));
      }
    };

    window.addEventListener('message', handler);
    connect();
    sendHello();

    return () => {
      disposedRef.current = true;
      window.removeEventListener('message', handler);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const ws = wsRef.current;
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
        wsRef.current = null;
      }
    };
  }, [connect, log, scheduleReconnect, sendHello]);

  const reconnect = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    backoffRef.current = 1000;
    connect();
    sendHello();
  }, [connect, sendHello]);

  return { connected, meta, reconnect, fileName };
}
