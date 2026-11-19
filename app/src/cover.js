// VICE HEAT cover engine — draws a multi-panel GTA-style poster onto any 2D canvas.
// Everything is drawn from code: gradient skies, a striped retro sun, palm silhouettes,
// a skyline, halftone dots, grain and vignette, and bold condensed caption lettering.
// No artwork, logo or font is taken from any game; the lettering is a system bold face
// squeezed to a condensed cut with a thick outline and a sunset gradient fill.

/** The three post sizes the app exports, in pixels. */
export const SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  wide: [1920, 1080],
};

/** The colour grades. Each one drives the sky, the sun, the title and the photo tint. */
export const GRADES = {
  sunset: {
    label: 'Vice City Sunset',
    sky: ['#2a0f3d', '#7a1e5e', '#e0396e', '#ff7a3d', '#ffc46b'],
    sun: ['#ffe27a', '#ff5e7a'],
    title: ['#ff5e7a', '#ff9e3d', '#ffe27a'],
    titleStroke: '#1c0616',
    overlayTop: 'rgba(255,90,140,0.16)',
    overlayBottom: 'rgba(255,150,50,0.26)',
    tint: 'rgba(255,110,60,0.10)',
    palm: '#160a1c',
    band: 'rgba(24,6,26,0.50)',
  },
  neon: {
    label: 'Neon Night',
    sky: ['#05081f', '#0d2b52', '#123f6b', '#7a1e8e', '#ff2e88'],
    sun: ['#7df9ff', '#ff2e88'],
    title: ['#7df9ff', '#ff2e88', '#ffb3e2'],
    titleStroke: '#0a0616',
    overlayTop: 'rgba(0,220,255,0.14)',
    overlayBottom: 'rgba(255,0,160,0.20)',
    tint: 'rgba(0,200,255,0.08)',
    palm: '#05030f',
    band: 'rgba(5,4,24,0.52)',
  },
  pastel: {
    label: 'Pastel Day',
    sky: ['#8fc7e8', '#f7c9d8', '#ffd9a8', '#fff3d6'],
    sun: ['#fff8d6', '#ffb27a'],
    title: ['#ffffff', '#ffd9a8', '#ff9e7a'],
    titleStroke: '#5a2b3a',
    overlayTop: 'rgba(255,255,255,0.14)',
    overlayBottom: 'rgba(255,190,150,0.12)',
    tint: 'rgba(255,255,255,0.10)',
    palm: '#3a2a33',
    band: 'rgba(90,43,58,0.34)',
  },
};

/**
 * The panel layouts. Coordinates are fractions of the cover (panels live in the top
 * ~67%, the caption band in the bottom ~30%). `rot` tilts a panel a few degrees the
 * way a pasted-up poster tilts; `photo` is the default sample for the slot.
 */
export const LAYOUTS = {
  classic: {
    label: 'Classic',
    panels: [
      { name: 'Hero', x: 0.03, y: 0.03, w: 0.58, h: 0.64, rot: -2, photo: 'boulevard', zoom: 1.05, ox: 0.5, oy: 0.22 },
      { name: 'Top right', x: 0.64, y: 0.03, w: 0.33, h: 0.305, rot: 1.5, photo: 'pier', zoom: 1, ox: 0.5, oy: 0.35 },
      { name: 'Bottom right', x: 0.64, y: 0.36, w: 0.33, h: 0.31, rot: -1, photo: 'boulevard', zoom: 1.5, ox: 0.12, oy: 0.75 },
    ],
  },
  duo: {
    label: 'Duo',
    panels: [
      { name: 'Left', x: 0.03, y: 0.03, w: 0.46, h: 0.64, rot: -2, photo: 'boulevard', zoom: 1.05, ox: 0.5, oy: 0.22 },
      { name: 'Right', x: 0.51, y: 0.03, w: 0.46, h: 0.64, rot: 2, photo: 'pier', zoom: 1, ox: 0.5, oy: 0.35 },
    ],
  },
  solo: {
    label: 'Solo',
    panels: [
      { name: 'Full photo', x: 0, y: 0, w: 1, h: 0.7, rot: 0, photo: 'boulevard', zoom: 1, ox: 0.5, oy: 0.42, bleed: true },
    ],
  },
  quad: {
    label: 'Quad',
    panels: [
      { name: 'Top left', x: 0.03, y: 0.03, w: 0.46, h: 0.305, rot: -1.5, photo: 'boulevard', zoom: 1.15, ox: 0.5, oy: 0.22 },
      { name: 'Top right', x: 0.51, y: 0.03, w: 0.46, h: 0.305, rot: 1.5, photo: 'pier', zoom: 1, ox: 0.5, oy: 0.35 },
      { name: 'Bottom left', x: 0.03, y: 0.355, w: 0.46, h: 0.315, rot: 1, photo: 'pier', zoom: 1.5, ox: 0.55, oy: 0.4 },
      { name: 'Bottom right', x: 0.51, y: 0.355, w: 0.46, h: 0.315, rot: -1.5, photo: 'boulevard', zoom: 1.5, ox: 0.12, oy: 0.75 },
    ],
  },
};

/** A tiny seeded random generator, so the skyline and grain are identical on every render. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The caption band: where the title lives (fractions of the cover height). */
const BAND_TOP = 0.7;
const BAND_BOTTOM = 0.965;

/** Draws `img` cover-fitting `rect` (local coords), zoomed and panned by the panel state. */
function drawPhotoInto(ctx, img, rect, zoom, ox, oy) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const s = base * zoom;
  const dw = iw * s;
  const dh = ih * s;
  const dx = rect.x + (rect.w - dw) * ox;
  const dy = rect.y + (rect.h - dh) * oy;
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** The grade tint over one photo, in the panel's local coordinates. */
function applyGrade(ctx, w, h, grade) {
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, grade.overlayTop);
  g.addColorStop(1, grade.overlayBottom);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = grade.tint;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

/** One tilted panel: white frame, the photo clipped inside, grade tint, dark keyline. */
function drawPanel(ctx, img, panel, W, H, grade, selected) {
  const px = panel.x * W;
  const py = panel.y * H;
  const pw = panel.w * W;
  const ph = panel.h * H;
  const cx = px + pw / 2;
  const cy = py + ph / 2;
  const frame = Math.max(6, W * 0.008);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((panel.rot * Math.PI) / 180);
  if (!panel.bleed) {
    ctx.shadowColor = 'rgba(10,0,20,0.45)';
    ctx.shadowBlur = W * 0.02;
    ctx.shadowOffsetY = W * 0.008;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-pw / 2 - frame, -ph / 2 - frame, pw + 2 * frame, ph + 2 * frame);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(-pw / 2, -ph / 2, pw, ph);
  ctx.clip();
  if (img) drawPhotoInto(ctx, img, { x: -pw / 2, y: -ph / 2, w: pw, h: ph }, panel.zoom, panel.ox, panel.oy);
  applyGrade(ctx, pw, ph, grade);
  ctx.restore();
  if (!panel.bleed) {
    ctx.strokeStyle = 'rgba(20,5,20,0.85)';
    ctx.lineWidth = Math.max(2, W * 0.0015);
    ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);
  }
  if (selected) {
    ctx.strokeStyle = '#ff2e88';
    ctx.lineWidth = Math.max(3, W * 0.003);
    ctx.setLineDash([W * 0.02, W * 0.01]);
    ctx.strokeRect(-pw / 2 - frame - 4, -ph / 2 - frame - 4, pw + 2 * frame + 8, ph + 2 * frame + 8);
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/** The striped retro sun, cut on an offscreen canvas so the stripes are clean.
 *  It sits over the top-right corner of the panels, like a sticker on the poster. */
function drawSun(ctx, W, H, grade) {
  const r = Math.min(W, H) * 0.07;
  const cx = W * 0.92;
  const cy = H * 0.1;
  if (grade === GRADES.neon) {
    // A glowing neon ring instead of a disc.
    ctx.save();
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = r * 0.5;
    ctx.strokeStyle = '#ff2e88';
    ctx.lineWidth = r * 0.14;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    glow.addColorStop(0, 'rgba(125,249,255,0.85)');
    glow.addColorStop(0.6, 'rgba(255,46,136,0.45)');
    glow.addColorStop(1, 'rgba(255,46,136,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  const pad = r * 0.15;
  const off = document.createElement('canvas');
  off.width = Math.ceil((r + pad) * 2);
  off.height = Math.ceil((r + pad) * 2);
  const o = off.getContext('2d');
  const ocx = off.width / 2;
  const ocy = off.height / 2;
  const disc = o.createRadialGradient(ocx, ocy - r * 0.25, r * 0.1, ocx, ocy, r);
  disc.addColorStop(0, grade.sun[0]);
  disc.addColorStop(1, grade.sun[1]);
  o.fillStyle = disc;
  o.beginPath();
  o.arc(ocx, ocy, r, 0, Math.PI * 2);
  o.fill();
  // Horizontal stripes cut through the lower half, widening toward the bottom.
  o.globalCompositeOperation = 'destination-out';
  let y = ocy + r * 0.08;
  let thick = r * 0.045;
  while (y < ocy + r) {
    o.fillRect(0, y, off.width, thick);
    y += thick + r * 0.11;
    thick *= 1.55;
  }
  o.globalCompositeOperation = 'source-over';
  ctx.drawImage(off, cx - off.width / 2, cy - off.height / 2);
}

/** One palm silhouette: a tapered curved trunk and filled, drooping frond leaves. */
function drawPalm(ctx, x, y, s, lean, flip, color) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.fillStyle = color;
  // Trunk: a tapered curve from the base up to the crown.
  const tx = lean;
  const ty = -s;
  const bw = s * 0.09;
  const tw = s * 0.025;
  ctx.beginPath();
  ctx.moveTo(-bw / 2, 0);
  ctx.quadraticCurveTo(-bw / 2 + lean * 0.25, -s * 0.6, tx - tw / 2, ty);
  ctx.lineTo(tx + tw / 2, ty);
  ctx.quadraticCurveTo(bw / 2 + lean * 0.75, -s * 0.5, bw / 2, 0);
  ctx.closePath();
  ctx.fill();
  // Fronds: filled leaf shapes fanning out of the crown, drooping at the tips.
  const fronds = [
    { a: -2.85, len: 0.58, droop: 0.22 },
    { a: -2.45, len: 0.66, droop: 0.16 },
    { a: -2.0, len: 0.7, droop: 0.1 },
    { a: -1.55, len: 0.68, droop: 0.08 },
    { a: -1.1, len: 0.66, droop: 0.12 },
    { a: -0.65, len: 0.6, droop: 0.2 },
    { a: -0.25, len: 0.5, droop: 0.28 },
  ];
  for (const f of fronds) {
    const dx = Math.cos(f.a);
    const dy = Math.sin(f.a);
    const len = s * f.len;
    const tipX = tx + dx * len;
    const tipY = ty + dy * len + s * f.droop;
    const mx = tx + dx * len * 0.55;
    const my = ty + dy * len * 0.5 - len * 0.1;
    const px = -dy;
    const py = dx;
    const w = s * 0.038;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(mx + px * w, my + py * w, tipX, tipY);
    ctx.quadraticCurveTo(mx - px * w, my - py * w, tx, ty);
    ctx.closePath();
    ctx.fill();
  }
  // Coconuts.
  ctx.beginPath();
  ctx.arc(tx - s * 0.03, ty + s * 0.03, s * 0.028, 0, Math.PI * 2);
  ctx.arc(tx + s * 0.035, ty + s * 0.045, s * 0.025, 0, Math.PI * 2);
  ctx.arc(tx + s * 0.005, ty + s * 0.075, s * 0.022, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A deterministic skyline strip along the bottom edge, with a few lit windows. */
function drawSkyline(ctx, W, H) {
  const rand = mulberry32(20261119);
  const top = H * 0.972;
  const strip = H - top;
  ctx.fillStyle = '#12061a';
  let x = 0;
  while (x < W) {
    const bw = W * (0.03 + rand() * 0.045);
    const bh = strip * (0.3 + rand() * 0.55);
    ctx.fillRect(x, top + strip - bh, bw, bh);
    if (rand() > 0.6) ctx.fillRect(x + bw * 0.4, top + strip - bh - strip * 0.12, bw * 0.2, strip * 0.12);
    if (rand() > 0.75) {
      ctx.fillStyle = 'rgba(255,200,110,0.55)';
      for (let k = 0; k < 3; k++) {
        if (rand() > 0.5) ctx.fillRect(x + bw * (0.15 + rand() * 0.7), top + strip - bh + strip * (0.15 + rand() * 0.6), 2, 2);
      }
      ctx.fillStyle = '#12061a';
    }
    x += bw + W * 0.004;
  }
}

/** Halftone dots in the sky's top-left corner and along the caption divider. */
function drawHalftone(ctx, W, H) {
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  const gap = Math.max(14, W * 0.014);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 6 - row; col++) {
      const r = Math.max(1.5, W * 0.0035 * (1 - row * 0.18));
      ctx.beginPath();
      ctx.arc(W * 0.045 + col * gap, H * 0.045 + row * gap, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  for (let i = 0; i < Math.floor(W / gap); i++) {
    const r = Math.max(1, W * 0.002 * (0.6 + 0.4 * Math.sin(i * 0.7)));
    ctx.beginPath();
    ctx.arc(i * gap + gap / 2, H * (BAND_TOP - 0.012), r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A cached noise tile, stamped over the cover for film grain. */
let noiseTile = null;
function grainTile() {
  if (noiseTile) return noiseTile;
  const rand = mulberry32(777);
  const tile = document.createElement('canvas');
  tile.width = 140;
  tile.height = 140;
  const t = tile.getContext('2d');
  const img = t.createImageData(140, 140);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 118 + Math.floor(rand() * 40);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  t.putImageData(img, 0, 0);
  noiseTile = tile;
  return tile;
}

function applyGrainAndVignette(ctx, W, H) {
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(grainTile(), 'repeat');
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const v = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(8,2,12,0.30)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

/** The big condensed caption: gradient fill, thick dark outline, soft shadow. */
function drawTitle(ctx, W, H, caption, subtitle, grade) {
  const bandTop = H * BAND_TOP;
  const bandH = H * (BAND_BOTTOM - BAND_TOP);
  const text = (caption || 'VICE HEAT').trim().toUpperCase();
  // Kicker above the title.
  const kicker = (subtitle || '').trim().toUpperCase();
  const kickerSize = Math.max(12, H * 0.02);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (kicker) {
    ctx.font = `700 ${kickerSize}px 'Arial Black', Impact, sans-serif`;
    try {
      ctx.letterSpacing = `${kickerSize * 0.32}px`;
    } catch {
      /* letterSpacing is optional */
    }
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = kickerSize * 0.4;
    ctx.fillText(`\u2605  ${kicker}  \u2605`, W / 2, bandTop + bandH * 0.1);
    ctx.shadowBlur = 0;
  }
  // The title itself, squeezed to a condensed cut.
  let size = Math.min(W * 0.17, bandH * 0.58);
  const setFont = () => {
    ctx.font = `900 ${size}px 'Arial Black', Impact, 'Franklin Gothic Heavy', sans-serif`;
  };
  setFont();
  const squeeze = 0.82;
  while (ctx.measureText(text).width * squeeze > W * 0.92 && size > 10) {
    size -= 2;
    setFont();
  }
  try {
    ctx.letterSpacing = `${size * 0.015}px`;
  } catch {
    /* letterSpacing is optional */
  }
  const cy = bandTop + bandH * 0.48;
  const grad = ctx.createLinearGradient(0, cy - size * 0.5, 0, cy + size * 0.5);
  grade.title.forEach((c, i) => grad.addColorStop(i / (grade.title.length - 1), c));
  ctx.save();
  ctx.translate(W / 2, cy);
  ctx.scale(squeeze, 1);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = grade.titleStroke;
  ctx.lineWidth = size * 0.11;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = size * 0.08;
  ctx.shadowOffsetY = size * 0.03;
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = grad;
  ctx.fillText(text, 0, 0);
  ctx.restore();
  // Tagline under the title.
  const tagSize = Math.max(11, H * 0.016);
  ctx.font = `700 ${tagSize}px 'Arial Black', Impact, sans-serif`;
  try {
    ctx.letterSpacing = `${tagSize * 0.4}px`;
  } catch {
    /* letterSpacing is optional */
  }
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('LEONIDA  \u00B7  EST. 2026', W / 2, bandTop + bandH * 0.88);
  ctx.restore();
}

/**
 * Draws the whole cover.
 * `state` carries layout, grade, caption, subtitle, the per-panel photo states and
 * the toggles; `photos` maps a photo id to a loaded image (or null while loading).
 * `selected` is the index of the panel to outline, or -1 for an export.
 */
export function drawCover(ctx, W, H, state, photos, selected = -1) {
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.classic;
  // Sky: the grade's gradient runs the full height, so the caption band keeps the sunset.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  drawHalftone(ctx, W, H);
  // Panels.
  layout.panels.forEach((panel, i) => {
    const slot = state.panels[i] ?? panel;
    const img = photos[slot.photo] ?? null;
    drawPanel(ctx, img, { ...panel, zoom: slot.zoom, ox: slot.ox, oy: slot.oy }, W, H, grade, i === selected);
  });
  // The retro sun stickers over the top-right corner of the panels.
  if (state.sun !== false) drawSun(ctx, W, H, grade);
  // White gutter line between the panels and the caption band.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, H * (BAND_TOP - 0.006), W, Math.max(3, H * 0.012));
  // Caption band shading, then the lettering.
  const band = ctx.createLinearGradient(0, H * BAND_TOP, 0, H);
  band.addColorStop(0, 'rgba(0,0,0,0)');
  band.addColorStop(1, grade.band);
  ctx.fillStyle = band;
  ctx.fillRect(0, H * BAND_TOP, W, H * (1 - BAND_TOP));
  drawTitle(ctx, W, H, state.caption, state.subtitle, grade);
  // Palms flank the title band; skyline along the foot.
  if (state.palms !== false) {
    drawPalm(ctx, W * 0.008, H * 0.998, H * 0.24, W * 0.025, false, grade.palm);
    drawPalm(ctx, W * 0.992, H * 0.998, H * 0.2, W * 0.02, true, grade.palm);
  }
  drawSkyline(ctx, W, H);
  if (state.grain !== false) applyGrainAndVignette(ctx, W, H);
  // Poster edge: a white frame with a thin dark inner line.
  const frame = Math.max(8, W * 0.011);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = frame;
  ctx.strokeRect(frame / 2, frame / 2, W - frame, H - frame);
  ctx.strokeStyle = 'rgba(20,5,20,0.6)';
  ctx.lineWidth = Math.max(2, W * 0.0015);
  ctx.strokeRect(frame + 2, frame + 2, W - 2 * frame - 4, H - 2 * frame - 4);
}

/** The pixel rect of a panel (for hit-testing drags on the preview canvas). */
export function panelRect(panel, W, H) {
  return { x: panel.x * W, y: panel.y * H, w: panel.w * W, h: panel.h * H, rot: panel.rot };
}

/** A fresh panel state array for a layout, keeping photos from `previous` where they fit. */
export function panelsForLayout(layoutKey, previous = []) {
  const layout = LAYOUTS[layoutKey] ?? LAYOUTS.classic;
  return layout.panels.map((panel, i) => {
    const prev = previous[i];
    return {
      photo: prev?.photo ?? panel.photo,
      zoom: prev?.zoom ?? panel.zoom,
      ox: prev?.ox ?? panel.ox,
      oy: prev?.oy ?? panel.oy,
    };
  });
}
