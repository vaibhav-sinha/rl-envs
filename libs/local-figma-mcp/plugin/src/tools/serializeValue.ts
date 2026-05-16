const MAX_DEPTH = 32;

export function serializeValue(value: unknown, visited: WeakSet<object>, depth = 0): unknown {
  if (depth > MAX_DEPTH) return undefined;
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'symbol' || typeof value === 'function') return undefined;

  if (Array.isArray(value)) {
    return value.map((v) => serializeValue(v, visited, depth + 1)).filter((v) => v !== undefined);
  }

  if (typeof value !== 'object') return String(value);

  if (visited.has(value)) return { __ref: 'cycle' };
  visited.add(value);

  const obj = value as Record<string, unknown>;

  if ('type' in obj && obj.type === 'VARIABLE_ALIAS' && typeof obj.id === 'string') {
    return { type: 'VARIABLE_ALIAS', id: obj.id };
  }

  if ('r' in obj && 'g' in obj && 'b' in obj && typeof obj.r === 'number') {
    const out: Record<string, unknown> = { r: obj.r, g: obj.g, b: obj.b };
    if (typeof obj.a === 'number') out.a = obj.a;
    return out;
  }

  if ('x' in obj && 'y' in obj && typeof obj.x === 'number' && typeof obj.y === 'number') {
    const out: Record<string, unknown> = { x: obj.x, y: obj.y };
    if (typeof obj.width === 'number') out.width = obj.width;
    if (typeof obj.height === 'number') out.height = obj.height;
    return out;
  }

  if ('family' in obj && 'style' in obj && typeof obj.family === 'string') {
    return { family: obj.family, style: obj.style };
  }

  if ('id' in obj && typeof obj.id === 'string' && Object.keys(obj).length <= 4) {
    return { id: obj.id, ...(obj.name ? { name: obj.name } : {}) };
  }

  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    try {
      const v = obj[key];
      if (typeof v === 'function' || typeof v === 'symbol') continue;
      const serialized = serializeValue(v, visited, depth + 1);
      if (serialized !== undefined) out[key] = serialized;
    } catch {
      /* skip unreadable */
    }
  }
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...sub);
  }
  return btoa(binary);
}
