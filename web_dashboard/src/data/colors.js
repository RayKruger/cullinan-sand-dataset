// Colour + label metadata for compaction methods, plus a viridis-like
// categorical palette for multi-series charts.

/**
 * Normalise a `method` scalar to an integer 1..5.
 * Handles both numeric (5) and string ("Method 5") encodings.
 */
export function methodNumber(method) {
  if (method == null) return null;
  if (typeof method === 'number') return method;
  const match = String(method).match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

// Per-method colour and description.
// Hues are the dark-mode categorical steps from the data-viz reference palette,
// validated CVD-safe against the dark surface (worst common-CVD ΔE ≈ 26). The
// paper's green / magenta / blue / red convention is preserved; Method 4's
// original black is remapped to orange because black is invisible on a dark
// surface. Colour is a display choice only — it never changes the data.
export const METHOD_META = {
  1: { color: '#008300', name: 'Method 1', desc: 'Loosest' },
  2: { color: '#d55181', name: 'Method 2', desc: 'Low Compact' },
  3: { color: '#3987e5', name: 'Method 3', desc: '1390 kg/m³ (~77% Mod AASHTO)' },
  4: { color: '#d95926', name: 'Method 4', desc: '1511 kg/m³ (~84%)' },
  5: { color: '#e66767', name: 'Method 5', desc: '1538 kg/m³ (~86%, e=0.908)' },
};

const METHOD_FALLBACK = { color: '#7f7f7f', name: 'Unknown', desc: '' };

export function methodMeta(method) {
  const n = methodNumber(method);
  return (n != null && METHOD_META[n]) || METHOD_FALLBACK;
}

// Dark-mode categorical series palette: the eight validated hues from the
// data-viz reference palette, stepped for a dark surface (each ≥3:1 contrast,
// mutually CVD-distinct). Assigned in fixed order — never a generated/cycled
// hue — so a series keeps its colour as the selection changes.
export const SERIES_DARK = [
  '#3987e5', // blue
  '#199e70', // aqua
  '#c98500', // yellow
  '#9085e9', // violet
  '#e66767', // red
  '#d55181', // magenta
  '#d95926', // orange
  '#008300', // green
];

/** Return `n` distinct dark-safe series colours (fixed order, wraps past 8). */
export function seriesColors(n) {
  if (n <= 0) return [];
  return Array.from({ length: n }, (_, i) => SERIES_DARK[i % SERIES_DARK.length]);
}
