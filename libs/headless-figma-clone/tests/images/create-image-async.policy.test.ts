import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { assertUrlAllowed, loadNetworkPolicyFromEnv } from '../../src/images/networkPolicy.js';

describe('createImageAsync network policy', () => {
  const prevAllow = process.env.HFC_ALLOW_NETWORK;
  const prevList = process.env.HFC_NETWORK_ALLOWLIST;

  beforeEach(() => {
    delete process.env.HFC_ALLOW_NETWORK;
    delete process.env.HFC_NETWORK_ALLOWLIST;
  });

  afterEach(() => {
    if (prevAllow === undefined) delete process.env.HFC_ALLOW_NETWORK;
    else process.env.HFC_ALLOW_NETWORK = prevAllow;
    if (prevList === undefined) delete process.env.HFC_NETWORK_ALLOWLIST;
    else process.env.HFC_NETWORK_ALLOWLIST = prevList;
  });

  it('denies by default when network disabled', () => {
    const policy = loadNetworkPolicyFromEnv();
    expect(policy.enabled).toBe(false);
    expect(() => assertUrlAllowed(policy, 'https://example.com/img.png')).toThrow(/disabled/i);
  });

  it('allows public host when enabled and allowlisted', () => {
    process.env.HFC_ALLOW_NETWORK = '1';
    process.env.HFC_NETWORK_ALLOWLIST = 'cdn.example.com';
    const policy = loadNetworkPolicyFromEnv();
    const url = assertUrlAllowed(policy, 'https://cdn.example.com/a.png');
    expect(url.hostname).toBe('cdn.example.com');
  });

  it('blocks loopback SSRF even when enabled', () => {
    process.env.HFC_ALLOW_NETWORK = '1';
    const policy = loadNetworkPolicyFromEnv();
    expect(() => assertUrlAllowed(policy, 'http://127.0.0.1/secret')).toThrow(/SSRF/i);
  });
});
