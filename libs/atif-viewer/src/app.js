import { loadTrajectory } from './parse.js';
import { renderTrajectory } from './render.js';

const landing = document.getElementById('landing');
const viewer = document.getElementById('viewer');
const header = document.getElementById('header');
const timeline = document.getElementById('timeline');
const fileNameEl = document.getElementById('file-name');
const sessionMetaEl = document.getElementById('session-meta');
const errorBanner = document.getElementById('error-banner');
const fileInput = document.getElementById('file-input');
const btnOpen = document.getElementById('btn-open');
const btnOpenAnother = document.getElementById('btn-open-another');
const dropZone = document.getElementById('drop-zone');

if (
  !landing ||
  !viewer ||
  !header ||
  !timeline ||
  !fileNameEl ||
  !sessionMetaEl ||
  !errorBanner ||
  !fileInput ||
  !btnOpen ||
  !btnOpenAnother ||
  !dropZone
) {
  throw new Error('Missing required DOM elements');
}

/**
 * @param {string | null} message
 */
function showError(message) {
  if (message) {
    errorBanner.textContent = message;
    errorBanner.hidden = false;
  } else {
    errorBanner.textContent = '';
    errorBanner.hidden = true;
  }
}

function showViewer() {
  landing.hidden = true;
  viewer.hidden = false;
  header.hidden = false;
}

function showLanding() {
  landing.hidden = false;
  viewer.hidden = true;
  header.hidden = true;
  timeline.replaceChildren();
  showError(null);
}

/**
 * @param {File} file
 */
function handleFile(file) {
  if (!file.name.endsWith('.json') && file.type !== 'application/json') {
    showError('Please select a JSON trajectory file.');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const data = loadTrajectory(text);
      renderTrajectory(data, file.name, timeline, fileNameEl, sessionMetaEl);
      showViewer();
      showError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showError(msg);
      showLanding();
    }
  };
  reader.onerror = () => {
    showError('Failed to read file.');
  };
  reader.readAsText(file);
}

btnOpen.addEventListener('click', () => {
  fileInput.click();
});

btnOpenAnother.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (file) handleFile(file);
  fileInput.value = '';
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer?.files?.[0];
  if (file) handleFile(file);
});

document.body.addEventListener('dragover', (e) => e.preventDefault());
document.body.addEventListener('drop', (e) => {
  if (viewer.hidden) return;
  e.preventDefault();
});
