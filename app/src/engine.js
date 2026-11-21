// Neon Coast cover engine: draws a GTA-poster-style cover on any canvas.
// Everything is drawn from the serialisable state object; no DOM is touched here
// except for the canvas element passed in. Photos arrive as HTMLImageElements
// that the caller has already loaded (local files or the bundled samples).

export const LAYOUTS = {
  grid4: { panels: 4, label: 'Four-panel grid' },
  hero3: { panels: 4, label: 'Hero + three' },
  bleed: { panels: 1, label: 'Full bleed' },
  tilt: { panels: 2, label: 'Tilted snapshot' },
  nine: { panels: 9, label: 'Nine-panel grid' },
  strip: { panels: 3, label: 'Triptych strip' },
};

// Gradient-map stops per grade: [shadow, mid, highlight] in sRGB.
export const GRADES = {
  vice: { stops: [[22, 8, 52], [255, 46, 136], [255, 209, 102]], label: 'Vice Sunset' },
  neon: { stops: [[10, 0, 40], [255, 46, 136], [0, 229, 255]], label: 'Neon Pink' },
  teal: { stops: [[4, 14, 42], [10, 108, 255], [0, 229, 199]], label: 'Teal Night' },
  gold: { stops: [[48, 16, 4], [255, 122, 61], [255, 209, 102]], label: 'Gold Hour' },
  noir: { stops: [[5, 5, 5], [110, 110, 110], [238, 238, 238]], label: 'Noir' },
};

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1080x1920': [1080, 1920],
  '1920x1080': [1920, 1080],
};

export const SAMPLE_URLS = {
  pier: './samples/pier.jpg',
  boulevard: './samples/boulevard.jpg',
  neon: './samples/neon.jpg',
  palms: './samples/palms.jpg',
};

export function freshState() {
  return {
    layout: 'grid4',
    grade: 'vice',
    title: 'SUNSET HEIST',
    subtitle: 'one last ride down the coast',
    badge: 'VICE NIGHTS',
    stars: 3,
    size: '1080x1080',
    fillAll: true,
    grain: 45,
    vignette: 55,
    panels: [
      { src: 'pier', scale: 1.0, ox: 0, oy: 0 },
      { src: 'boulevard', scale: 1.0, ox: 0, oy: 0 },
      { src: 'neon', scale: 1.0, ox: 0, oy: 0 },
      { src: 'palms', scale: 1.0, ox: 0, oy: 0 },
    ],
  };
}

// Rects for each layout, in fractions of (width, height). Gap is in pixels at
// export scale; the caller passes the real canvas size.
export function panelRects(layout, w, h) {
  const gap = Math.max(6, Math.round(Math.min(w, h) * 0.008));
  const full = { x: 0, y: 0, w, h, rot: 0 };
  switch (layout) {
    case 'hero3': {
      const heroW = Math.round(w * 0.62);
      const colX = heroW + gap;
      const colW = w - colX;
      const rh = Math.round((h - gap * 2) / 3);
      return [
        { x: 0, y: 0, w: heroW, h, rot: 0 },
        { x: colX, y: 0, w: colW, h: rh, rot: 0 },
        { x: colX, y: rh + gap, w: colW, h: rh, rot: 0 },
        { x: colX, y: (rh + gap) * 2, w: colW, h: rh, rot: 0 },
      ];
    }
    case 'bleed':
      return [full];
    case 'tilt': {
      const snapW = Math.round(w * 0.52);
      const snapH = Math.round(h * 0.42);
      return [
        full,
        {
          x: Math.round(w * 0.42), y: Math.round(h * 0.5),
          w: snapW, h: snapH, rot: -0.07, frame: true,
        },
      ];
    }
    case 'nine': {
      const cw = Math.round((w - gap * 2) / 3);
      const ch = Math.round((h - gap * 2) / 3);
      const out = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          out.push({ x: c * (cw + gap), y: r * (ch + gap), w: cw, h: ch, rot: 0 });
        }
      }
      return out;
    }
    case 'strip': {
      const cw = Math.round((w - gap * 2) / 3);
      return [0, 1, 2].map((i) => ({ x: i * (cw + gap), y: 0, w: cw, h, rot: 0 }));
    }
    case 'grid4':
    default: {
      const cw = Math.round((w - gap) / 2);
      const ch = Math.round((h - gap) / 2);
      return [
        { x: 0, y: 0, w: cw, h: ch, rot: 0 },
        { x: cw + gap, y: 0, w: cw, h: ch, rot: 0 },
        { x: 0, y: ch + gap, w: cw, h: ch, rot: 0 },
        { x: cw + gap, y: ch + gap, w: cw, h: ch, rot: 0 },
      ];
    }
  }
}

function drawPhotoInto(ctx, img, rect, panel) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const scale = base * (panel.scale || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = rect.x + (rect.w - dw) / 2 + (panel.ox || 0);
  const dy = rect.y + (rect.h - dh) / 2 + (panel.oy || 0);
  ctx.drawImage(img, dx, dy, dw, dh);
}

function applyGradientMap(ctx, w, h, stops) {
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  const lut = [];
  for (let c = 0; c < 3; c++) {
    const ramp = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let lo, hi, f;
      if (t < 0.5) { lo = stops[0][c]; hi = stops[1][c]; f = t / 0.5; }
      else { lo = stops[1][c]; hi = stops[2][c]; f = (t - 0.5) / 0.5; }
      ramp[i] = Math.round(lo + (hi - lo) * f);
    }
    lut.push(ramp);
  }
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const idx = lum | 0;
    // Blend the mapped colour with the original so skin and detail survive.
    data[i] = Math.round(data[i] * 0.45 + lut[0][idx] * 0.55);
    data[i + 1] = Math.round(data[i + 1] * 0.45 + lut[1][idx] * 0.55);
    data[i + 2] = Math.round(data[i + 2] * 0.45 + lut[2][idx] * 0.55);
  }
  ctx.putImageData(img, 0, 0);
}

let noiseTile = null;
function grainTile() {
  if (noiseTile) return noiseTile;
  const c = document.createElement('canvas');
  c.width = 160; c.height = 160;
  const g = c.getContext('2d');
  const img = g.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = (Math.random() * 255) | 0;
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  noiseTile = c;
  return c;
}

function drawTitleBlock(ctx, state, w, h) {
  const unit = Math.min(w, h) / 1080;
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const badge = (state.badge || '').trim();
  const bandH = Math.round(h * 0.27);
  const bandY = h - bandH;

  // Frosted dark band so lettering stays readable over any photo.
  const bandGrad = ctx.createLinearGradient(0, bandY, 0, h);
  bandGrad.addColorStop(0, 'rgba(8,2,20,0)');
  bandGrad.addColorStop(0.35, 'rgba(8,2,20,0.72)');
  bandGrad.addColorStop(1, 'rgba(8,2,20,0.92)');
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, bandY, w, bandH);

  const pad = Math.round(44 * unit);
  let y = bandY + Math.round(40 * unit);

  // Badge ribbon, top-left of the band.
  if (badge) {
    ctx.save();
    ctx.font = `400 ${Math.round(28 * unit)}px Anton, sans-serif`;
    const bw = ctx.measureText(badge).width + Math.round(34 * unit);
    const bh = Math.round(42 * unit);
    ctx.translate(pad, y);
    ctx.rotate(-0.03);
    ctx.fillStyle = '#ff2e88';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(bw, 0);
    ctx.lineTo(bw - Math.round(13 * unit), bh);
    ctx.lineTo(0, bh);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge, Math.round(17 * unit), bh / 2 + 1);
    ctx.restore();
    y += Math.round(58 * unit);
  }

  // Main title: sunset gradient fill, thick dark outline, slight lean.
  if (title) {
    const size = Math.round((title.length > 14 ? 104 : 128) * unit);
    ctx.save();
    ctx.translate(pad, y + size * 0.72);
    ctx.rotate(-0.015);
    ctx.font = `${size}px Anton, sans-serif`;
    ctx.textBaseline = 'alphabetic';
    const grad = ctx.createLinearGradient(0, -size, 0, size * 0.25);
    grad.addColorStop(0, '#ffe9a8');
    grad.addColorStop(0.45, '#ff9a3d');
    grad.addColorStop(0.75, '#ff2e88');
    grad.addColorStop(1, '#7a2bff');
    ctx.lineWidth = Math.max(4, Math.round(8 * unit));
    ctx.strokeStyle = 'rgba(10,2,24,0.9)';
    ctx.lineJoin = 'round';
    ctx.strokeText(title, 0, 0);
    ctx.fillStyle = grad;
    ctx.fillText(title, 0, 0);
    ctx.restore();
    y += Math.round(size * 0.92);
  }

  // Script subtitle in neon teal.
  if (subtitle) {
    ctx.save();
    ctx.font = `${Math.round(40 * unit)}px Pacifico, cursive`;
    ctx.fillStyle = '#00e5c7';
    ctx.shadowColor = 'rgba(0,229,199,0.8)';
    ctx.shadowBlur = Math.round(16 * unit);
    ctx.fillText(subtitle, pad + Math.round(6 * unit), y + Math.round(6 * unit));
    ctx.restore();
  }

  // Heat meter: stars top-right.
  const stars = Math.max(0, Math.min(5, state.stars | 0));
  if (stars > 0) {
    const sx = w - pad - Math.round(34 * unit) * stars;
    const sy = Math.round(40 * unit);
    ctx.save();
    ctx.font = `${Math.round(40 * unit)}px sans-serif`;
    ctx.fillStyle = '#ffb02e';
    ctx.shadowColor = 'rgba(255,176,46,0.7)';
    ctx.shadowBlur = Math.round(12 * unit);
    ctx.fillText('★'.repeat(stars), sx, sy);
    ctx.restore();
  }
}

// Render the whole cover. `images` maps a panel src key (sample name or
// 'upload:<n>') to a loaded HTMLImageElement. Returns nothing; draws in place.
export function renderCover(canvas, state, images) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0d0716';
  ctx.fillRect(0, 0, w, h);

  const rects = panelRects(state.layout, w, h);
  const count = Math.min(rects.length, state.panels.length);
  for (let i = 0; i < count; i++) {
    const rect = rects[i];
    const img = images[state.panels[i].src];
    if (!img) continue;
    ctx.save();
    if (rect.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rot);
      ctx.translate(-rect.w / 2, -rect.h / 2);
    }
    ctx.beginPath();
    const r = Math.max(4, Math.round(Math.min(w, h) * 0.006));
    ctx.roundRect(rect.rot ? 0 : rect.x, rect.rot ? 0 : rect.y, rect.w, rect.h, r);
    ctx.clip();
    if (rect.frame) {
      ctx.fillStyle = '#f8f2e6';
      ctx.fillRect(-40, -40, rect.w + 80, rect.h + 80);
    }
    const inner = rect.frame
      ? { x: 14, y: 14, w: rect.w - 28, h: rect.h - 28, rot: 0 }
      : { x: rect.rot ? 0 : rect.x, y: rect.rot ? 0 : rect.y, w: rect.w, h: rect.h, rot: 0 };
    drawPhotoInto(ctx, img, inner, state.panels[i]);
    ctx.restore();
    if (rect.frame) {
      ctx.save();
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rot);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
      ctx.restore();
    }
  }

  // Colour grade across the whole cover, then grain and vignette.
  const grade = GRADES[state.grade] || GRADES.vice;
  applyGradientMap(ctx, w, h, grade.stops);

  const grainAmt = Math.max(0, Math.min(100, state.grain ?? 45)) / 100;
  if (grainAmt > 0) {
    ctx.save();
    ctx.globalAlpha = grainAmt * 0.28;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(grainTile(), 'repeat');
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  const vigAmt = Math.max(0, Math.min(100, state.vignette ?? 55)) / 100;
  if (vigAmt > 0) {
    const rg = ctx.createRadialGradient(
      w / 2, h * 0.42, Math.min(w, h) * 0.35,
      w / 2, h / 2, Math.max(w, h) * 0.75,
    );
    rg.addColorStop(0, 'rgba(5,0,16,0)');
    rg.addColorStop(1, `rgba(5,0,16,${0.55 * vigAmt})`);
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);
  }

  drawTitleBlock(ctx, state, w, h);
}
