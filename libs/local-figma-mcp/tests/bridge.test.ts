import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { PluginBridge } from '../src/bridge/PluginBridge.js';

/** Minimal WebSocket mock for PluginBridge.attach */
class MockWebSocket extends EventEmitter {
  readyState = 1;
  static OPEN = 1;
  sent: string[] = [];

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3;
    this.emit('close');
  }

  simulateMessage(data: unknown): void {
    this.emit('message', JSON.stringify(data));
  }
}

describe('PluginBridge', () => {
  let bridge: PluginBridge;
  let ws: MockWebSocket;

  beforeEach(() => {
    bridge = new PluginBridge(5000);
    ws = new MockWebSocket();
    bridge.attach(ws as unknown as import('ws').WebSocket);
    ws.simulateMessage({
      type: 'plugin_hello',
      pluginVersion: '1.0.0',
      fileKey: 'abc',
      fileName: 'Test',
    });
  });

  afterEach(() => {
    ws.close();
  });

  it('reports connected after hello', () => {
    expect(bridge.connected).toBe(true);
    expect(bridge.getSession()?.fileKey).toBe('abc');
  });

  it('correlates tool responses', async () => {
    const p = bridge.call('get_metadata', { fileKey: 'abc' });
    const sent = JSON.parse(ws.sent[0]!) as { type: string; id: string; tool: string };
    expect(sent.type).toBe('tool_request');
    expect(sent.tool).toBe('get_metadata');

    ws.simulateMessage({
      type: 'tool_response',
      id: sent.id,
      ok: true,
      content: [{ type: 'text', text: '<metadata/>' }],
    });

    const content = await p;
    expect(content[0]).toEqual({ type: 'text', text: '<metadata/>' });
  });

  it('rejects when plugin not connected', async () => {
    ws.close();
    await expect(bridge.call('use_figma', {})).rejects.toThrow(/PLUGIN_NOT_CONNECTED/);
  });

  it('times out pending requests', async () => {
    const short = new PluginBridge(50);
    short.attach(ws as unknown as import('ws').WebSocket);
    ws.simulateMessage({
      type: 'plugin_hello',
      pluginVersion: '1',
      fileKey: 'k',
      fileName: 'n',
    });
    await expect(short.call('use_figma', { fileKey: 'k' })).rejects.toThrow(/TOOL_TIMEOUT/);
  });
});
