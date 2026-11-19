// VICE HEAT — deterministic demo states for the screenshots and for trying the app.
// The URL carries everything: ?shot=cover draws the cover full-frame, ?shot=editor
// shows the full studio, and layout / grade / size / caption / subtitle / photo /
// palms / grain / sun pick the cover itself. Every state is reproducible from the
// URL alone, so the screenshots in shots.json can be retaken exactly.

import { SIZES, GRADES, LAYOUTS, panelsForLayout } from './cover.js';

/** The shot mode from the URL: 'cover', 'editor', or '' for the plain app. */
export function shotMode(params) {
  return params.get('shot') || '';
}

/**
 * Applies the URL's demo parameters to the editor state in place: layout, grade,
 * size, caption, subtitle, one photo for every panel, and the dressing toggles.
 * Unknown values are ignored, so a bare `?shot=cover` still shows the default cover.
 */
export function applyShotParams(state, params) {
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
  return state;
}

/** The four demo states the screenshots are taken from, kept in sync with shots.json. */
export const SHOT_STATES = [
  { name: '1-cover.jpg', query: '?shot=cover&size=wide&layout=classic&grade=sunset&caption=VICE%20HEAT', w: 1280, h: 720 },
  { name: '2-editor.jpg', query: '?shot=editor&size=square&layout=classic&grade=sunset&caption=VICE%20HEAT', w: 1280, h: 900 },
  { name: '3-neon.jpg', query: '?shot=cover&size=wide&layout=duo&grade=neon&caption=NEON%20NIGHTS&subtitle=MIDNIGHT%20ON%20THE%20PIER', w: 1280, h: 720 },
  { name: '4-portrait.jpg', query: '?shot=cover&size=portrait&layout=quad&grade=pastel&caption=GOLDEN%20HOUR&subtitle=VICE%20CITY%20DAYS', w: 1024, h: 1280 },
];
