/**
 * ATIF trajectory parsing helpers.
 * Mirrors logic from scripts/trajectory/lib.py.
 */

/**
 * @param {string} text
 * @returns {Record<string, unknown>}
 */
export function loadTrajectory(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid JSON: ${msg}`);
  }
  if (!data || typeof data !== 'object' || !Array.isArray(data.steps)) {
    throw new Error('Invalid trajectory: missing steps array');
  }
  return /** @type {Record<string, unknown>} */ (data);
}

/**
 * @param {Record<string, unknown>} toolCall
 * @returns {string}
 */
export function getToolDisplayName(toolCall) {
  const args = /** @type {Record<string, unknown>} */ (toolCall.arguments ?? {});
  const toolName = args.toolName;
  if (typeof toolName === 'string' && toolName) return toolName;

  const name = args.name;
  if (typeof name === 'string' && name) {
    const m = /^([^-]+)-(.+)$/.exec(name);
    if (m) return m[2];
    return name;
  }

  const fn = toolCall.function_name;
  if (typeof fn === 'string' && fn) return fn;
  return 'unknown';
}

/**
 * @param {Record<string, unknown>} step
 * @param {string} toolCallId
 * @returns {string | null}
 */
export function findObservationContent(step, toolCallId) {
  const obs = /** @type {Record<string, unknown> | undefined} */ (step.observation);
  if (!obs) return null;
  const results = obs.results;
  if (!Array.isArray(results)) return null;

  for (const res of results) {
    if (!res || typeof res !== 'object') continue;
    const r = /** @type {Record<string, unknown>} */ (res);
    if (String(r.source_call_id ?? '') === toolCallId) {
      const content = r.content;
      return typeof content === 'string' ? content : null;
    }
  }
  return null;
}

/**
 * @typedef {{ data: string, mimeType: string, width?: number, height?: number }} ParsedImage
 */

/**
 * @param {unknown} item
 * @returns {ParsedImage | null}
 */
function imageFromContentItem(item) {
  if (!item || typeof item !== 'object') return null;
  const obj = /** @type {Record<string, unknown>} */ (item);

  if (obj.type === 'image' && typeof obj.data === 'string' && typeof obj.mimeType === 'string') {
    const meta = obj._meta;
    let width;
    let height;
    if (meta && typeof meta === 'object') {
      const m = /** @type {Record<string, unknown>} */ (meta);
      if (typeof m.width === 'number') width = m.width;
      if (typeof m.height === 'number') height = m.height;
    }
    return { data: obj.data, mimeType: obj.mimeType, width, height };
  }

  const image = obj.image;
  if (image && typeof image === 'object') {
    const img = /** @type {Record<string, unknown>} */ (image);
    const data = img.data ?? img.dataBase64 ?? img.base64;
    const mimeType = img.mimeType ?? img.mime ?? 'image/png';
    if (typeof data === 'string') {
      return {
        data,
        mimeType: typeof mimeType === 'string' ? mimeType : 'image/png',
        width: typeof img.width === 'number' ? img.width : undefined,
        height: typeof img.height === 'number' ? img.height : undefined,
      };
    }
  }

  return null;
}

/**
 * @param {unknown} value
 * @param {number} [depth]
 * @returns {unknown}
 */
function tryParseNestedJson(value, depth = 0) {
  if (depth > 2) return value;
  if (typeof value !== 'string') return value;
  try {
    const parsed = JSON.parse(value);
    return tryParseNestedJson(parsed, depth + 1);
  } catch {
    return value;
  }
}

/**
 * @param {unknown[]} contentItems
 * @returns {{ text: unknown | null, images: ParsedImage[] }}
 */
function extractFromContentItems(contentItems) {
  /** @type {ParsedImage[]} */
  const images = [];
  /** @type {unknown[]} */
  const textParts = [];

  for (const item of contentItems) {
    const img = imageFromContentItem(item);
    if (img) {
      images.push(img);
      continue;
    }

    if (!item || typeof item !== 'object') continue;
    const obj = /** @type {Record<string, unknown>} */ (item);

    if (obj.type === 'text' && typeof obj.text === 'string') {
      textParts.push(tryParseNestedJson(obj.text));
      continue;
    }

    const text = obj.text;
    if (text && typeof text === 'object') {
      const t = /** @type {Record<string, unknown>} */ (text);
      if (typeof t.text === 'string') {
        textParts.push(tryParseNestedJson(t.text));
      }
    }
  }

  let text = null;
  if (textParts.length === 1) {
    text = textParts[0];
  } else if (textParts.length > 1) {
    text = textParts;
  }

  return { text, images };
}

/**
 * @param {string | null | undefined} contentStr
 * @returns {{ text: unknown | null, images: ParsedImage[], raw: unknown | null }}
 */
export function parseObservationContent(contentStr) {
  if (!contentStr) {
    return { text: null, images: [], raw: null };
  }

  let outer;
  try {
    outer = JSON.parse(contentStr);
  } catch {
    return { text: contentStr.slice(0, 2000), images: [], raw: contentStr };
  }

  if (outer && typeof outer === 'object') {
    const o = /** @type {Record<string, unknown>} */ (outer);

    if ('success' in o && o.success && typeof o.success === 'object') {
      const success = /** @type {Record<string, unknown>} */ (o.success);
      const content = success.content;
      if (Array.isArray(content)) {
        const { text, images } = extractFromContentItems(content);
        return { text, images, raw: outer };
      }
      return { text: success, images: [], raw: outer };
    }

    if (Array.isArray(o.content)) {
      const { text, images } = extractFromContentItems(o.content);
      return { text, images, raw: outer };
    }
  }

  return { text: outer, images: [], raw: outer };
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function formatJson(value) {
  if (value === null || value === undefined) {
    return '(no result)';
  }
  if (typeof value === 'string') {
    const parsed = tryParseNestedJson(value);
    if (parsed !== value) {
      return formatJson(parsed);
    }
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * @param {Record<string, unknown>} step
 * @returns {boolean}
 */
export function stepHasContent(step) {
  const message = step.message;
  if (typeof message === 'string' && message.trim()) return true;
  if (typeof step.reasoning_content === 'string' && step.reasoning_content.trim()) return true;
  const tools = step.tool_calls;
  return Array.isArray(tools) && tools.length > 0;
}
