import { URL } from 'node:url';

export interface NetworkPolicy {
  enabled: boolean;
  allowedHosts: Set<string>;
}

export function loadNetworkPolicyFromEnv(): NetworkPolicy {
  const enabled = process.env.HFC_ALLOW_NETWORK === '1';
  const raw = process.env.HFC_NETWORK_ALLOWLIST?.trim() ?? '';
  const allowedHosts = new Set<string>();
  if (raw) {
    for (const part of raw.split(',')) {
      const h = part.trim().toLowerCase();
      if (h) allowedHosts.add(h);
    }
  }
  return { enabled, allowedHosts };
}

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
  if (h.startsWith('10.')) return true;
  if (h.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return true;
  if (h.endsWith('.local')) return true;
  return false;
}

export function assertUrlAllowed(policy: NetworkPolicy, src: string): URL {
  if (!policy.enabled) {
    throw new Error('Network requests are disabled (set HFC_ALLOW_NETWORK=1 to enable)');
  }
  let parsed: URL;
  try {
    parsed = new URL(src);
  } catch {
    throw new Error('Invalid URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed');
  }
  if (isPrivateHost(parsed.hostname)) {
    throw new Error('SSRF: private/loopback hosts are blocked');
  }
  if (policy.allowedHosts.size > 0 && !policy.allowedHosts.has(parsed.hostname.toLowerCase())) {
    throw new Error(`Host not in allowlist: ${parsed.hostname}`);
  }
  return parsed;
}

export async function fetchBytes(policy: NetworkPolicy, src: string): Promise<Uint8Array> {
  const url = assertUrlAllowed(policy, src);
  const res = await fetch(url.toString(), { redirect: 'error' });
  if (!res.ok) {
    throw new Error(`HTTP ${String(res.status)} for ${src}`);
  }
  const buf = await res.arrayBuffer();
  if (buf.byteLength > 8 * 1024 * 1024) {
    throw new Error('Response too large (max 8MB)');
  }
  return new Uint8Array(buf);
}
