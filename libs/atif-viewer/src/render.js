import {
  findObservationContent,
  formatJson,
  getToolDisplayName,
  parseObservationContent,
  stepHasContent,
} from './parse.js';

/**
 * @param {string} text
 * @returns {HTMLParagraphElement}
 */
function createMessageParagraph(text) {
  const p = document.createElement('p');
  p.className = 'bubble-message';
  p.textContent = text;
  return p;
}

/**
 * @param {string} text
 * @returns {HTMLDetailsElement}
 */
function createCollapsibleThought(text) {
  const details = document.createElement('details');
  details.className = 'thought';

  const summary = document.createElement('summary');
  summary.textContent = 'Thought';
  details.appendChild(summary);

  const body = document.createElement('div');
  body.className = 'thought-body';
  body.textContent = text;
  details.appendChild(body);

  return details;
}

/**
 * @param {string} label
 * @param {string} jsonText
 * @param {boolean} [empty]
 * @returns {HTMLElement}
 */
function createJsonScrollBlock(label, jsonText, empty = false) {
  const section = document.createElement('div');
  section.className = 'tool-section';

  const lbl = document.createElement('span');
  lbl.className = 'tool-label';
  lbl.textContent = label;
  section.appendChild(lbl);

  const scroll = document.createElement('div');
  scroll.className = 'json-scroll' + (empty ? ' json-scroll--empty' : '');

  const pre = document.createElement('pre');
  pre.textContent = jsonText;
  scroll.appendChild(pre);
  section.appendChild(scroll);

  return section;
}

/**
 * @param {import('./parse.js').ParsedImage[]} images
 * @returns {HTMLElement | null}
 */
function createImageGallery(images) {
  if (!images.length) return null;

  const wrap = document.createElement('div');
  wrap.className = 'tool-images';

  for (const img of images) {
    const el = document.createElement('img');
    el.src = `data:${img.mimeType};base64,${img.data}`;
    el.alt = 'Tool result image';

    if (img.width && img.height) {
      const meta = document.createElement('span');
      meta.className = 'image-meta';
      meta.textContent = `${String(img.width)}×${String(img.height)}`;
      wrap.appendChild(el);
      wrap.appendChild(meta);
    } else {
      wrap.appendChild(el);
    }
  }

  return wrap;
}

/**
 * @param {Record<string, unknown>} toolCall
 * @param {string | null} observationContent
 * @returns {HTMLElement}
 */
function createToolCard(toolCall, observationContent) {
  const card = document.createElement('article');
  card.className = 'tool-card';

  const header = document.createElement('div');
  header.className = 'tool-header';
  header.textContent = getToolDisplayName(toolCall);
  card.appendChild(header);

  const args = toolCall.arguments ?? {};
  card.appendChild(createJsonScrollBlock('Arguments', formatJson(args)));

  const parsed = parseObservationContent(observationContent);
  const resultText = parsed.text !== null ? formatJson(parsed.text) : '(no result)';
  const isEmpty = parsed.text === null && !parsed.images.length;
  card.appendChild(createJsonScrollBlock('Result', resultText, isEmpty));

  const gallery = createImageGallery(parsed.images);
  if (gallery) {
    const section = document.createElement('div');
    section.className = 'tool-section';
    const lbl = document.createElement('span');
    lbl.className = 'tool-label';
    lbl.textContent = 'Image';
    section.appendChild(lbl);
    section.appendChild(gallery);
    card.appendChild(section);
  }

  return card;
}

/**
 * @param {Record<string, unknown>} step
 * @returns {HTMLElement | null}
 */
function createStepBubble(step) {
  if (!stepHasContent(step)) return null;

  const source = String(step.source ?? 'unknown');
  const isUser = source === 'user';

  const row = document.createElement('div');
  row.className = `step-row step-row--${isUser ? 'user' : 'agent'}`;

  const meta = document.createElement('div');
  meta.className = 'step-meta';
  const parts = [`step ${String(step.step_id ?? '?')}`];
  if (step.timestamp) parts.push(String(step.timestamp));
  meta.textContent = parts.join(' · ');
  row.appendChild(meta);

  const bubble = document.createElement('div');
  bubble.className = `bubble bubble--${isUser ? 'user' : 'agent'}`;

  const message = step.message;
  if (typeof message === 'string' && message.trim()) {
    bubble.appendChild(createMessageParagraph(message));
  }

  const reasoning = step.reasoning_content;
  if (typeof reasoning === 'string' && reasoning.trim()) {
    bubble.appendChild(createCollapsibleThought(reasoning));
  }

  const toolCalls = step.tool_calls;
  if (Array.isArray(toolCalls) && toolCalls.length > 0) {
    const list = document.createElement('div');
    list.className = 'tool-list';

    for (const tc of toolCalls) {
      if (!tc || typeof tc !== 'object') continue;
      const toolCall = /** @type {Record<string, unknown>} */ (tc);
      const callId = String(toolCall.tool_call_id ?? '');
      const obsContent = findObservationContent(step, callId);
      list.appendChild(createToolCard(toolCall, obsContent));
    }

    bubble.appendChild(list);
  }

  row.appendChild(bubble);
  return row;
}

/**
 * @param {Record<string, unknown>} data
 * @param {string} fileName
 * @param {HTMLElement} timelineEl
 * @param {HTMLElement} fileNameEl
 * @param {HTMLElement} sessionMetaEl
 */
export function renderTrajectory(data, fileName, timelineEl, fileNameEl, sessionMetaEl) {
  fileNameEl.textContent = fileName;

  const agent = /** @type {Record<string, unknown> | undefined} */ (data.agent);
  const metrics = /** @type {Record<string, unknown> | undefined} */ (data.final_metrics);
  const metaParts = [];

  if (agent) {
    const name = agent.name;
    const model = agent.model_name;
    if (name) metaParts.push(String(name));
    if (model) metaParts.push(String(model));
  }

  const steps = data.steps;
  if (Array.isArray(steps)) {
    metaParts.push(`${String(steps.length)} steps`);
  }

  if (metrics && typeof metrics.total_steps === 'number') {
    metaParts.push(`${String(metrics.total_steps)} total`);
  }

  if (data.session_id) {
    metaParts.push(String(data.session_id));
  }

  sessionMetaEl.textContent = metaParts.join(' · ');

  timelineEl.replaceChildren();

  if (!Array.isArray(steps)) return;

  for (const step of steps) {
    if (!step || typeof step !== 'object') continue;
    const bubble = createStepBubble(/** @type {Record<string, unknown>} */ (step));
    if (bubble) timelineEl.appendChild(bubble);
  }
}
