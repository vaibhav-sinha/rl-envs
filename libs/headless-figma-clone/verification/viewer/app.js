/** @typedef {{ id: string; title: string; order: number; tier?: string; tags?: string[] }} ScenarioEntry */

/** @type {ScenarioEntry[]} */
let scenarios = [];
let currentIndex = 0;

const elTitle = document.getElementById('scenario-title');
const elId = document.getElementById('scenario-id');
const elIndex = document.getElementById('scenario-index');
const elFigmaImg = document.getElementById('figma-img');
const elCloneImg = document.getElementById('clone-img');
const elFigmaPlaceholder = document.getElementById('figma-placeholder');
const elClonePlaceholder = document.getElementById('clone-placeholder');
const elDescription = document.getElementById('description-text');
const elDescriptionPanel = document.getElementById('description-panel');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnToggleDesc = document.getElementById('toggle-description');
const gotoForm = document.getElementById('goto-form');
const inputGoto = document.getElementById('goto-input');

/**
 * @param {string} id
 * @param {'figma' | 'clone'} side
 */
function imageUrl(id, side) {
  return `/scenarios/${encodeURIComponent(id)}/${side}.png?t=${String(Date.now())}`;
}

/**
 * @param {HTMLImageElement} img
 * @param {HTMLElement} placeholder
 * @param {string} url
 */
function loadImage(img, placeholder, url) {
  img.hidden = true;
  placeholder.hidden = false;
  const name = url.includes('clone') ? 'clone.png' : 'figma.png';
  placeholder.textContent = `${name} not found`;

  const probe = new Image();
  probe.onload = () => {
    img.src = url;
    img.hidden = false;
    placeholder.hidden = true;
  };
  probe.onerror = () => {
    img.removeAttribute('src');
    img.hidden = true;
    placeholder.hidden = false;
  };
  probe.src = url;
}

/** @param {number} n */
function findScenarioIndexByNumber(n) {
  const byOrder = scenarios.findIndex((s) => s.order === n);
  if (byOrder >= 0) return byOrder;

  const idPrefix = `${String(n)}-`;
  return scenarios.findIndex((s) => s.id === String(n) || s.id.startsWith(idPrefix));
}

/** @param {number} index */
function updateUrlForIndex(index) {
  const entry = scenarios[index];
  if (!entry) return;
  const url = new URL(window.location.href);
  url.searchParams.set('i', String(entry.order));
  window.history.replaceState(null, '', url);
}

/** @param {number} index */
async function showScenario(index) {
  if (scenarios.length === 0) return;
  currentIndex = Math.max(0, Math.min(index, scenarios.length - 1));
  const entry = scenarios[currentIndex];

  elTitle.textContent = entry.title;
  elId.textContent = entry.id;
  elIndex.textContent = `${String(entry.order)} / ${String(scenarios[scenarios.length - 1]?.order ?? scenarios.length)}`;

  inputGoto.value = String(entry.order);
  inputGoto.classList.remove('invalid');
  updateUrlForIndex(currentIndex);

  btnPrev.disabled = currentIndex <= 0;
  btnNext.disabled = currentIndex >= scenarios.length - 1;

  loadImage(elFigmaImg, elFigmaPlaceholder, imageUrl(entry.id, 'figma'));
  loadImage(elCloneImg, elClonePlaceholder, imageUrl(entry.id, 'clone'));

  try {
    const res = await fetch(`/api/scenarios/${encodeURIComponent(entry.id)}/description`);
    elDescription.textContent = res.ok ? await res.text() : '(no description)';
  } catch {
    elDescription.textContent = '(failed to load description)';
  }
}

async function init() {
  const res = await fetch('/api/manifest');
  if (!res.ok) {
    elTitle.textContent = 'Failed to load manifest';
    return;
  }
  const manifest = await res.json();
  scenarios = [...(manifest.scenarios || [])].sort((a, b) => a.order - b.order);

  const minOrder = scenarios[0]?.order ?? 1;
  const maxOrder = scenarios[scenarios.length - 1]?.order ?? minOrder;
  inputGoto.min = String(minOrder);
  inputGoto.max = String(maxOrder);

  const params = new URLSearchParams(window.location.search);
  const start = Number.parseInt(params.get('i') ?? '0', 10);
  const startIndex =
    Number.isFinite(start) && start > 0 ? findScenarioIndexByNumber(start) : 0;
  await showScenario(startIndex >= 0 ? startIndex : 0);
}

btnPrev.addEventListener('click', () => {
  void showScenario(currentIndex - 1);
});

btnNext.addEventListener('click', () => {
  void showScenario(currentIndex + 1);
});

gotoForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const n = Number.parseInt(inputGoto.value, 10);
  if (!Number.isFinite(n)) {
    inputGoto.classList.add('invalid');
    return;
  }
  const index = findScenarioIndexByNumber(n);
  if (index < 0) {
    inputGoto.classList.add('invalid');
    return;
  }
  void showScenario(index);
});

btnToggleDesc.addEventListener('click', () => {
  const collapsed = elDescriptionPanel.classList.toggle('collapsed');
  btnToggleDesc.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
});

document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return;
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    void showScenario(currentIndex - 1);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    void showScenario(currentIndex + 1);
  }
});

void init();
