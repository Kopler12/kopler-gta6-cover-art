// VICE HEAT — the editor: loads photos, wires every control, renders the live
// preview, and exports PNGs. Deterministic demo states come from ?shot= URL params
// (shot=cover draws the cover full-frame, shot=editor shows the full studio).

import { SIZES, GRADES, LAYOUTS, drawCover, panelRect, panelsForLayout } from './cover.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');

/** The whole editor state: one object the renderer reads, the controls write. */
const state = {
  layout: 'classic',
  grade: 'sunset',
  size: 'square',
  caption: 'VICE HEAT',
  subtitle: 'WELCOME TO VICE CITY',
  palms: true,
  grain: true,
  sun: true,
  panels: panelsForLayout('classic'),
  selected: 0,
};

/** Loaded photos by id: the two kit samples plus anything the person uploads. */
const photos = { boulevard: null, pier: null };
const photoLabels = { boulevard: 'Boulevard (sample)', pier: 'Pier (sample)' };
let uploadCount = 0;

const params = new URLSearchParams(location.search);
const shotMode = params.get('shot') || '';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

async function loadSamples() {
  const [boulevard, pier] = await Promise.all([
    loadImage('./samples/boulevard.jpg'),
    loadImage('./samples/pier.jpg'),
  ]);
  photos.boulevard = boulevard;
  photos.pier = pier;
}

/** Renders the preview canvas at the selected export size. */
function render() {
  const [w, h] = SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(ctx, w, h, state, photos, state.selected);
  syncPanelControls();
}

/** Marks the given control group as active and re-renders. */
function markActive(container, attr, value) {
  container.querySelectorAll('[data-' + attr + ']').forEach((el) => {
    el.classList.toggle('active', el.dataset[attr] === value);
  });
}

function syncLayoutButtons() {
  markActive($('layouts'), 'layout', state.layout);
  markActive($('grades'), 'grade', state.grade);
  markActive($('sizes'), 'size', state.size);
  $('sizeLabel').textContent = `${SIZES[state.size][0]} × ${SIZES[state.size][1]}`;
}

function setLayout(key) {
  if (!LAYOUTS[key]) return;
  state.layout = key;
  state.panels = panelsForLayout(key, state.panels);
  state.selected = 0;
  syncLayoutButtons();
  render();
}

function setGrade(key) {
  if (!GRADES[key]) return;
  state.grade = key;
  syncLayoutButtons();
  render();
}

function setSize(key) {
  if (!SIZES[key]) return;
  state.size = key;
  syncLayoutButtons();
  render();
}

/** The panel the controls currently edit. */
function selectedPanel() {
  return state.panels[state.selected];
}

function panelName(i) {
  const layout = LAYOUTS[state.layout];
  const name = layout.panels[i]?.name ?? `Panel ${i + 1}`;
  return `Panel ${i + 1} — ${name}`;
}

/** Rebuilds the "photo in this panel" dropdown from the loaded photos. */
function rebuildPhotoSelect() {
  const select = $('panelPhoto');
  const current = selectedPanel()?.photo;
  select.innerHTML = '';
  for (const [id, label] of Object.entries(photoLabels)) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = label;
    select.appendChild(opt);
  }
  if (current && photoLabels[current]) select.value = current;
}

function syncPanelControls() {
  const panel = selectedPanel();
  if (!panel) return;
  $('panelName').textContent = panelName(state.selected);
  const select = $('panelPhoto');
  if (select.value !== panel.photo) select.value = panel.photo;
  $('zoomRange').value = String(panel.zoom);
  $('zoomVal').textContent = `${panel.zoom.toFixed(2)}×`;
  $('panX').value = String(panel.ox);
  $('panY').value = String(panel.oy);
}

function selectPanel(i) {
  state.selected = i;
  render();
}

// ------------------------------------------------------------ photo input

function addUploadedPhoto(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        uploadCount += 1;
        const id = `upload-${uploadCount}`;
        photos[id] = img;
        photoLabels[id] = file.name.replace(/\.[^.]+$/, '') || `Photo ${uploadCount}`;
        rebuildPhotoSelect();
        resolve(id);
      };
      img.onerror = () => resolve(null);
      img.src = String(reader.result);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

async function handleFiles(files) {
  const images = [...files].filter((f) => f.type.startsWith('image/'));
  if (images.length === 0) return;
  let firstId = null;
  for (const file of images) {
    const id = await addUploadedPhoto(file);
    if (id && !firstId) firstId = id;
  }
  if (firstId) {
    // The first new photo becomes the hero; the rest fill the other panels.
    const ids = Object.keys(photos).filter((id) => id.startsWith('upload-'));
    state.panels.forEach((panel, i) => {
      panel.photo = ids[i % ids.length];
    });
    state.selected = 0;
    render();
    setStatus(`Loaded ${images.length} photo${images.length > 1 ? 's' : ''} — drag to position, then export.`);
  }
}

function useSample(id) {
  if (!photos[id]) return;
  state.panels[state.selected].photo = id;
  render();
}

// ------------------------------------------------------------ export

function exportCanvas(sizeKey) {
  const [w, h] = SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off.getContext('2d'), w, h, state, photos, -1);
  return off;
}

function downloadCanvas(off, sizeKey) {
  const [w, h] = SIZES[sizeKey];
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      if (!blob) {
        resolve(null);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vice-heat-${sizeKey}-${w}x${h}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      $('lastExportImg').src = url;
      $('lastExport').hidden = false;
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      resolve(blob);
    }, 'image/png');
  });
}

async function exportOne(sizeKey) {
  setStatus('Rendering PNG…');
  const off = exportCanvas(sizeKey);
  const blob = await downloadCanvas(off, sizeKey);
  if (blob) setStatus(`Exported ${SIZES[sizeKey][0]} × ${SIZES[sizeKey][1]} PNG (${(blob.size / 1024).toFixed(0)} KB).`);
  else setStatus('Export failed — please try again.');
}

async function exportAll() {
  for (const key of Object.keys(SIZES)) {
    await exportOne(key);
    await new Promise((r) => setTimeout(r, 120));
  }
  setStatus('Exported all three sizes — square, portrait and wide.');
}

function setStatus(text) {
  $('status').textContent = text;
}

// ------------------------------------------------------------ canvas drag

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

/** Which panel (topmost first) contains the point, accounting for its tilt. */
function hitPanel(point) {
  const layout = LAYOUTS[state.layout];
  const [W, H] = SIZES[state.size];
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const r = panelRect(layout.panels[i], W, H);
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const a = (-r.rot * Math.PI) / 180;
    const dx = point.x - cx;
    const dy = point.y - cy;
    const lx = dx * Math.cos(a) - dy * Math.sin(a);
    const ly = dx * Math.sin(a) + dy * Math.cos(a);
    if (Math.abs(lx) <= r.w / 2 && Math.abs(ly) <= r.h / 2) return i;
  }
  return -1;
}

let drag = null;

canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  const hit = hitPanel(point);
  if (hit < 0) return;
  selectPanel(hit);
  const panel = selectedPanel();
  const img = photos[panel.photo];
  drag = { start: point, ox: panel.ox, oy: panel.oy, img, panel };
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const point = canvasPoint(event);
  const { panel, img } = drag;
  if (!img) return;
  const layout = LAYOUTS[state.layout];
  const r = panelRect(layout.panels[state.selected], canvas.width, canvas.height);
  const base = Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight);
  const drawnW = img.naturalWidth * base * panel.zoom;
  const drawnH = img.naturalHeight * base * panel.zoom;
  if (drawnW > r.w) panel.ox = clamp(drag.ox + (point.x - drag.start.x) / (drawnW - r.w), 0, 1);
  if (drawnH > r.h) panel.oy = clamp(drag.oy + (point.y - drag.start.y) / (drawnH - r.h), 0, 1);
  render();
});

canvas.addEventListener('pointerup', () => {
  drag = null;
});

canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const point = canvasPoint(event);
  const hit = hitPanel(point);
  if (hit < 0) return;
  selectPanel(hit);
  const panel = selectedPanel();
  panel.zoom = clamp(panel.zoom * Math.exp(-event.deltaY * 0.0012), 1, 3);
  render();
}, { passive: false });

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// ------------------------------------------------------------ wiring

function wire() {
  $('uploadBtn').addEventListener('click', () => $('fileInput').click());
  $('fileInput').addEventListener('change', (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
  });
  const dropzone = $('dropzone');
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('over');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('over'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('over');
    handleFiles(e.dataTransfer.files);
  });
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') $('fileInput').click();
  });
  $('samples').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-photo]');
    if (btn) useSample(btn.dataset.photo);
  });
  $('layouts').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-layout]');
    if (btn) setLayout(btn.dataset.layout);
  });
  $('grades').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-grade]');
    if (btn) setGrade(btn.dataset.grade);
  });
  $('sizes').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-size]');
    if (btn) setSize(btn.dataset.size);
  });
  $('captionInput').addEventListener('input', (e) => {
    state.caption = e.target.value;
    render();
  });
  $('subtitleInput').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    render();
  });
  $('palmsToggle').addEventListener('change', (e) => {
    state.palms = e.target.checked;
    render();
  });
  $('grainToggle').addEventListener('change', (e) => {
    state.grain = e.target.checked;
    render();
  });
  $('sunToggle').addEventListener('change', (e) => {
    state.sun = e.target.checked;
    render();
  });
  $('panelPhoto').addEventListener('change', (e) => {
    selectedPanel().photo = e.target.value;
    render();
  });
  $('zoomRange').addEventListener('input', (e) => {
    selectedPanel().zoom = Number(e.target.value);
    render();
  });
  $('panX').addEventListener('input', (e) => {
    selectedPanel().ox = Number(e.target.value);
    render();
  });
  $('panY').addEventListener('input', (e) => {
    selectedPanel().oy = Number(e.target.value);
    render();
  });
  $('fillAllBtn').addEventListener('click', () => {
    const photo = selectedPanel().photo;
    state.panels.forEach((p) => {
      p.photo = photo;
    });
    render();
    setStatus('That photo now fills every panel.');
  });
  $('resetPanelBtn').addEventListener('click', () => {
    const def = LAYOUTS[state.layout].panels[state.selected];
    const panel = selectedPanel();
    panel.zoom = def.zoom;
    panel.ox = def.ox;
    panel.oy = def.oy;
    render();
  });
  $('exportBtn').addEventListener('click', () => exportOne(state.size));
  $('exportAllBtn').addEventListener('click', exportAll);
}

// ------------------------------------------------------------ demo states

function applyShotParams() {
  const layout = params.get('layout');
  if (layout && LAYOUTS[layout]) {
    state.layout = layout;
    state.panels = panelsForLayout(layout);
  }
  const grade = params.get('grade');
  if (grade && GRADES[grade]) state.grade = grade;
  const size = params.get('size');
  if (size && SIZES[size]) state.size = size;
  const caption = params.get('caption');
  if (caption) state.caption = caption;
  const subtitle = params.get('subtitle');
  if (subtitle) state.subtitle = subtitle;
  const photo = params.get('photo');
  if (photo === 'boulevard' || photo === 'pier') {
    state.panels.forEach((p) => {
      p.photo = photo;
    });
  }
  const toggles = { palms: 'palms', grain: 'grain', sun: 'sun' };
  for (const [param, key] of Object.entries(toggles)) {
    const v = params.get(param);
    if (v === '0' || v === 'off') state[key] = false;
  }
  $('captionInput').value = state.caption;
  $('subtitleInput').value = state.subtitle;
  $('palmsToggle').checked = state.palms;
  $('grainToggle').checked = state.grain;
  $('sunToggle').checked = state.sun;
}

async function boot() {
  wire();
  applyShotParams();
  syncLayoutButtons();
  rebuildPhotoSelect();
  await loadSamples();
  if (shotMode === 'cover') {
    // Full-frame cover: the canvas is the viewport, controls are hidden by CSS.
    document.body.classList.add('shot-cover');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawCover(ctx, canvas.width, canvas.height, state, photos, -1);
  } else {
    render();
  }
  document.body.dataset.ready = '1';
  window.__coverReady = true;
}

boot();

// A handle for automated checks: the live state and the export pipeline.
window.__viceHeat = { state, photos, exportCanvas, drawCover };
