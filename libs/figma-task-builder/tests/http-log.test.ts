import { describe, expect, it, vi } from 'vitest';
import { normalizeHttpPath } from '../src/http-log.js';

describe('normalizeHttpPath', () => {
  it('collapses stream export ids', () => {
    expect(
      normalizeHttpPath(
        '/export/stream/550e8400-e29b-41d4-a716-446655440000/part'
      )
    ).toBe('/export/stream/:exportId/part');
    expect(
      normalizeHttpPath(
        '/export/stream/550e8400-e29b-41d4-a716-446655440000/finish'
      )
    ).toBe('/export/stream/:exportId/finish');
  });

  it('collapses task ids', () => {
    expect(normalizeHttpPath('/tasks/my-task-id')).toBe('/tasks/:taskId');
    expect(normalizeHttpPath('/tasks/my-task-id/complete')).toBe(
      '/tasks/:taskId/complete'
    );
  });

  it('leaves static paths unchanged', () => {
    expect(normalizeHttpPath('/health')).toBe('/health');
    expect(normalizeHttpPath('/export/stream/session')).toBe('/export/stream/session');
  });
});

describe('attachHttpRequestLogging', () => {
  it('logs on response finish', async () => {
    const { attachHttpRequestLogging } = await import('../src/http-log.js');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { EventEmitter } = await import('node:events');
    const req = new EventEmitter() as import('node:http').IncomingMessage;
    req.method = 'POST';
    req.headers = { 'content-length': '1200' };

    const res = new EventEmitter() as import('node:http').ServerResponse;
    res.statusCode = 200;

    attachHttpRequestLogging(
      req,
      res,
      '/export/stream/550e8400-e29b-41d4-a716-446655440000/part'
    );
    res.emit('finish');

    expect(logSpy).toHaveBeenCalledOnce();
    const line = String(logSpy.mock.calls[0]![0]);
    expect(line).toContain('[http]');
    expect(line).toContain('POST');
    expect(line).toContain('/export/stream/:exportId/part');
    expect(line).toContain('200');
    expect(line).toMatch(/\d+ms/);
    expect(line).toContain('1.2KB');

    logSpy.mockRestore();
  });
});
