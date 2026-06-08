#!/usr/bin/env node
/**
 * Generates teardrop map-marker PNGs for the "Clean Berlin" design.
 *
 * Each marker = category-colored teardrop body + white circle + the design's
 * monoline category icon (stroked in the category color). One-shot build step:
 * writes assets/markers/teardrop_<key>.png. Re-run after changing colors/icons.
 *
 *   node scripts/gen-markers.mjs
 *
 * Requires `rsvg-convert` on PATH (librsvg). Colors mirror
 * src/constants/categories.ts — keep them in sync.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'assets', 'markers');
const RENDER_WIDTH = 132; // teardrop is 32x40 → height derived from aspect

// Category color (mirrors constants/categories.ts).
const COLORS = {
  drinking: '#1a56db',
  toilet: '#1E3A8A',
  bbq: '#EA580C',
  bikeRepair: '#6B7280',
  evCharging: '#16A34A',
  playground: '#CA8A04',
  bathing: '#0D9488',
  coolSpace: '#4F46E5',
  decorative: '#EA580C',
};

// Monoline icon inner markup (viewBox 0 0 24 24), from the design's CategoryIcon.
const ICONS = {
  toilet: '<circle cx="8" cy="5" r="1.7"/><path d="M6 21v-6H4l2-7h4l2 7h-2v6z"/><circle cx="16.5" cy="5" r="1.7"/><path d="M14 13l2.5-5 2.5 5-1.8.6V21h-1.4v-5.8z"/>',
  drinking: '<path d="M12 3c-3 4-4.8 6.5-4.8 9.3A4.8 4.8 0 0012 17a4.8 4.8 0 004.8-4.7C16.8 9.5 15 7 12 3z"/><path d="M9.5 12.5a2.5 2.5 0 002.5 2.3" opacity=".5"/>',
  bbq: '<path d="M4 9h16l-1.6 6a3 3 0 01-3 2.3h-6.8a3 3 0 01-3-2.3z"/><path d="M9 5c0-1 1-1 1-2M12 5c0-1 1-1 1-2M15 5c0-1 1-1 1-2"/><path d="M8 20l-1 2M16 20l1 2"/>',
  bikeRepair: '<path d="M14.5 4l4.5 4.5-2 2-1.5-1.5-4 4 1.5 1.5-2 2L6.5 12l2-2 1.5 1.5 4-4L12.5 6z"/>',
  evCharging: '<rect x="5" y="3" width="9" height="18" rx="1.5"/><path d="M5 8h9"/><path d="M10 11l-2 3.5h3L9 18"/><path d="M14 10h2a2 2 0 012 2v3a1.5 1.5 0 003 0v-5l-2-2"/>',
  playground: '<path d="M4 20l5-11 4 3 6-9"/><path d="M17 3l3 1-1 3z"/><path d="M4 20h8"/><path d="M8 20l1-4"/>',
  bathing: '<path d="M3 17c1.5 0 1.5 1.2 3 1.2s1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2"/><path d="M3 20c1.5 0 1.5 1.2 3 1.2s1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2"/><circle cx="16" cy="7" r="2"/><path d="M7 14l2-5 4 2"/>',
  coolSpace: '<path d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13"/>',
  decorative: '<path d="M12 3v5"/><path d="M8 8c0 2 2 3 2 5M16 8c0 2-2 3-2 5M12 8c0 2 0 3 0 5"/><path d="M5 13h14v2a4 4 0 01-4 4h-6a4 4 0 01-4-4z"/>',
};

// Icon is 24x24; scale to ~15px centered on the white circle (cx16, cy15).
const ICON_SCALE = 15 / 24;
const ICON_TX = 16 - 12 * ICON_SCALE;
const ICON_TY = 15 - 12 * ICON_SCALE;

function svgFor(key) {
  const color = COLORS[key];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
  <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 24 16 24s16-13 16-24C32 7.2 24.8 0 16 0z" fill="${color}"/>
  <circle cx="16" cy="15" r="10" fill="#ffffff"/>
  <g transform="translate(${ICON_TX} ${ICON_TY}) scale(${ICON_SCALE})" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[key]}</g>
</svg>`;
}

mkdirSync(OUT_DIR, { recursive: true });
for (const key of Object.keys(COLORS)) {
  const tmp = join(OUT_DIR, `_${key}.svg`);
  const out = join(OUT_DIR, `teardrop_${key}.png`);
  writeFileSync(tmp, svgFor(key));
  execFileSync('rsvg-convert', ['-w', String(RENDER_WIDTH), '-o', out, tmp]);
  rmSync(tmp);
  console.log('wrote', out);
}
console.log('done — 9 teardrop markers generated');
