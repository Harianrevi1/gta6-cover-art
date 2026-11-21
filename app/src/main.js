// Neon Coast Cover Studio: editor wiring, photo loading, drag + zoom,
// export, and the deterministic ?shot= mode used for the entry screenshots.
// Photos stay on the machine: FileReader turns an upload into a data URL and
// nothing is ever sent anywhere.

import { renderCover, panelRects, SAMPLE_URLS, SIZES } from './engine.js';
import { createHistory, panelsForLayout } from './state.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const statusEl = $('status');

const history = createHistory();
const images = {}; // src key -> HTMLImageElement
let uploadCount = 0;
let drag = null;

function note(msg) {
  statusEl.textContent = msg;
  clearTimeout(note._t);
  note._t = setTimeout(() => { statusEl.textContent = ''; }, 4000);
}

function loadImage(src, url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { images[src] = img; resolve(img); };
    img.onerror = () => reject(new Error('could not load ' + src));
    img.src = url;
  });
}

async function ensureImages() {
  const jobs = [];
  for (const p of history.current.panels) {
    if (images[p.src]) continue;
    if (SAMPLE_URLS[p.src]) jobs.push(loadImage(p.src, SAMPLE_URLS[p.src]));
    // Upload keys hold a data URL in images already; nothing to fetch.
  }
  await Promise.allSettled(jobs);
}

function previewSize() {
  const [w, h] = SIZES[history.current.size];
  const longest = 720;
  const scale = longest / Math.max(w, h);
  return [Math.round(w * scale), Math.round(h * scale)];
}

async function draw() {
  await ensureImages();
  const [pw, ph] = previewSize();
  if (stage.width !== pw || stage.height !== ph) {
    stage.width = pw;
    stage.height = ph;
  }
  await document.fonts.ready;
  renderCover(stage, history.current, images);
  syncControls();
}

function syncControls() {
  const s = history.current;
  document.querySelectorAll('#layoutRow .choice').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === s.layout);
  });
  document.querySelectorAll('#gradeRow .grade').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === s.grade);
  });
  document.querySelectorAll('#sizeRow .choice').forEach((b) => {
    b.classList.toggle('active', b.dataset.size === s.size);
  });
  document.querySelectorAll('#sampleRow .sample-btn').forEach((b) => {
    b.classList.toggle('active', s.panels[0] && s.panels[0].src === b.dataset.sample);
  });
  $('titleInput').value = s.title;
  $('subtitleInput').value = s.subtitle;
  $('badgeInput').value = s.badge;
  $('starsInput').value = String(s.stars);
  $('fillAll').checked = s.fillAll;
  $('grainSlider').value = String(s.grain);
  $('grainVal').textContent = String(s.grain);
  $('vignetteSlider').value = String(s.vignette);
  $('vignetteVal').textContent = String(s.vignette);
  $('undoBtn').disabled = !history.canUndo();
  $('redoBtn').disabled = !history.canRedo();
}

function commit(mutator) {
  const next = JSON.parse(JSON.stringify(history.current));
  mutator(next);
  history.commit(next);
  draw();
}

function applyPhoto(key, url) {
  const next = JSON.parse(JSON.stringify(history.current));
  const targets = next.fillAll ? next.panels : [next.panels[0]];
  for (const p of targets) p.src = key;
  history.commit(next);
  if (url) images[key] = null;
  if (url) {
    const img = new Image();
    img.onload = () => { images[key] = img; draw(); };
    img.src = url;
  }
  draw();
}

// ---- Controls -----------------------------------------------------------

$('photoInput').addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    uploadCount += 1;
    applyPhoto('upload:' + uploadCount, String(reader.result));
    note('Photo loaded — drag it into place, then export.');
  };
  reader.readAsDataURL(file);
});

document.querySelectorAll('#sampleRow .sample-btn').forEach((b) => {
  b.addEventListener('click', () => applyPhoto(b.dataset.sample, null));
});

document.querySelectorAll('#layoutRow .choice').forEach((b) => {
  b.addEventListener('click', () => {
    commit((s) => {
      s.layout = b.dataset.layout;
      s.panels = panelsForLayout(s.layout, s.panels);
    });
  });
});

document.querySelectorAll('#gradeRow .grade').forEach((b) => {
  b.addEventListener('click', () => commit((s) => { s.grade = b.dataset.grade; }));
});

document.querySelectorAll('#sizeRow .choice').forEach((b) => {
  b.addEventListener('click', () => commit((s) => { s.size = b.dataset.size; }));
});

$('titleInput').addEventListener('focus', () => history.checkpoint());
$('titleInput').addEventListener('input', (e) => {
  history.poke((s) => { s.title = e.target.value; });
  draw();
});
$('subtitleInput').addEventListener('focus', () => history.checkpoint());
$('subtitleInput').addEventListener('input', (e) => {
  history.poke((s) => { s.subtitle = e.target.value; });
  draw();
});
$('badgeInput').addEventListener('focus', () => history.checkpoint());
$('badgeInput').addEventListener('input', (e) => {
  history.poke((s) => { s.badge = e.target.value; });
  draw();
});
$('starsInput').addEventListener('change', (e) => {
  commit((s) => { s.stars = Number(e.target.value); });
});
$('fillAll').addEventListener('change', (e) => {
  commit((s) => { s.fillAll = e.target.checked; });
});
$('grainSlider').addEventListener('focus', () => history.checkpoint());
$('grainSlider').addEventListener('input', (e) => {
  history.poke((s) => { s.grain = Number(e.target.value); });
  $('grainVal').textContent = e.target.value;
  draw();
});
$('vignetteSlider').addEventListener('focus', () => history.checkpoint());
$('vignetteSlider').addEventListener('input', (e) => {
  history.poke((s) => { s.vignette = Number(e.target.value); });
  $('vignetteVal').textContent = e.target.value;
  draw();
});

$('undoBtn').addEventListener('click', () => { if (history.undo()) draw(); });
$('redoBtn').addEventListener('click', () => { if (history.redo()) draw(); });
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    e.preventDefault();
    if (history.undo()) draw();
  } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
    e.preventDefault();
    if (history.redo()) draw();
  }
});

// ---- Drag to pan, wheel to zoom -----------------------------------------

function panelAt(clientX, clientY) {
  const box = stage.getBoundingClientRect();
  const x = (clientX - box.left) * (stage.width / box.width);
  const y = (clientY - box.top) * (stage.height / box.height);
  const rects = panelRects(history.current.layout, stage.width, stage.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

stage.addEventListener('pointerdown', (e) => {
  const idx = panelAt(e.clientX, e.clientY);
  if (idx < 0) return;
  history.checkpoint();
  drag = { idx, x: e.clientX, y: e.clientY, moved: false };
  stage.setPointerCapture(e.pointerId);
});

stage.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const box = stage.getBoundingClientRect();
  const kx = stage.width / box.width;
  const ky = stage.height / box.height;
  const dx = (e.clientX - drag.x) * kx;
  const dy = (e.clientY - drag.y) * ky;
  if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
  drag.x = e.clientX;
  drag.y = e.clientY;
  history.poke((s) => {
    const p = s.panels[drag.idx];
    p.ox = (p.ox || 0) + dx;
    p.oy = (p.oy || 0) + dy;
  });
  draw();
});

stage.addEventListener('pointerup', () => {
  drag = null;
});

stage.addEventListener('wheel', (e) => {
  e.preventDefault();
  const idx = panelAt(e.clientX, e.clientY);
  if (idx < 0) return;
  if (!stage._wheeling) {
    history.checkpoint();
    stage._wheeling = true;
  }
  const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
  history.poke((s) => {
    const p = s.panels[idx];
    p.scale = Math.max(0.4, Math.min(4, (p.scale || 1) * factor));
  });
  draw();
  clearTimeout(stage._wt);
  stage._wt = setTimeout(() => { stage._wheeling = false; }, 350);
}, { passive: false });

// ---- Export -------------------------------------------------------------

$('exportBtn').addEventListener('click', async () => {
  await ensureImages();
  await document.fonts.ready;
  const [w, h] = SIZES[history.current.size];
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  renderCover(out, history.current, images);
  out.toBlob((blob) => {
    if (!blob) { note('Export failed — try again.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-cover-${history.current.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    note(`Exported ${w} × ${h} PNG.`);
  }, 'image/png');
});

// ---- Deterministic screenshot mode --------------------------------------
// ?shot=cover renders just the cover at the viewport size; ?shot=editor
// renders the editor with a sample photo and caption loaded. Both set
// window.__shotReady once the cover is on screen.

async function runShotMode() {
  const q = new URLSearchParams(location.search);
  const mode = q.get('shot');
  if (!mode) return false;
  const photo = q.get('photo') || 'pier';
  const caption = q.get('caption') || 'Sunset Heist';
  // Panel one takes the requested photo; the rest cycle the other samples so
  // a multi-panel cover shows variety instead of the same frame four times.
  const others = ['pier', 'boulevard', 'neon', 'palms'].filter((k) => k !== photo);
  history.poke((s) => {
    s.title = caption.toUpperCase();
    s.panels.forEach((p, i) => {
      p.src = i === 0 ? photo : others[(i - 1) % others.length];
    });
  });
  if (mode === 'cover') {
    document.body.classList.add('shot-cover');
    stage.width = window.innerWidth;
    stage.height = window.innerHeight;
    // Square the canvas for square shots, keep the viewport ratio otherwise.
    const want = (q.get('w') && q.get('h')) ? [Number(q.get('w')), Number(q.get('h'))] : null;
    if (want) { stage.width = want[0]; stage.height = want[1]; }
    await ensureImages();
    await document.fonts.ready;
    renderCover(stage, history.current, images);
  } else {
    await draw();
  }
  window.__shotReady = true;
  document.title = 'shot-ready';
  return true;
}

window.addEventListener('error', (e) => {
  const el = document.createElement('p');
  el.id = 'pageerror';
  el.textContent = 'error: ' + e.message;
  document.body.appendChild(el);
});

runShotMode().then((shot) => { if (!shot) draw(); });
