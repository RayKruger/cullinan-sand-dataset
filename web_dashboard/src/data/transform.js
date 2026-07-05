// Pure helpers for turning row-aligned column arrays into recharts-ready
// point arrays, plus client-side decimation and CSV export.

/**
 * Build a decimated {x, y} point array from two row-aligned column arrays.
 * Keeps at most `maxPoints` points using a fixed stride, always retaining the
 * final sample. `null` values are preserved so recharts can render gaps.
 * When `positiveX` is true (log axes), non-positive/`null` x are dropped.
 */
export function buildSeries(xArr, yArr, maxPoints, positiveX = false) {
  if (!xArr || !yArr) return [];
  const n = Math.min(xArr.length, yArr.length);
  if (n === 0) return [];

  const target = Math.max(2, Math.floor(maxPoints) || 2);
  const stride = Math.max(1, Math.ceil(n / target));
  const pts = [];

  const push = (i) => {
    const x = xArr[i];
    const y = yArr[i];
    if (positiveX && (x == null || x <= 0)) return;
    pts.push({ x: x == null ? null : x, y: y == null ? null : y });
  };

  for (let i = 0; i < n; i += stride) push(i);
  if ((n - 1) % stride !== 0) push(n - 1);

  return pts;
}

function csvCell(value) {
  if (value == null) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Serialise a header + rows array to a CSV string. */
export function toCsv(header, rows) {
  const lines = [header.map(csvCell).join(',')];
  for (const row of rows) lines.push(row.map(csvCell).join(','));
  return lines.join('\r\n');
}

/** Parse a plain numeric CSV (header + rows) into {column: number[]}; '' -> NaN. */
export function parseCsvColumns(text) {
  const lines = text.split(/\r?\n/);
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  const headers = lines[0].split(',');
  const cols = {};
  headers.forEach((h) => {
    cols[h] = [];
  });
  for (let i = 1; i < lines.length; i += 1) {
    const parts = lines[i].split(',');
    headers.forEach((h, j) => {
      const v = parts[j];
      cols[h].push(v === undefined || v === '' ? NaN : Number(v));
    });
  }
  return cols;
}

/** CSV for one test's row-aligned `columns` dict ({col: array}). */
export function columnsToCsv(columns) {
  const cols = Object.keys(columns);
  if (cols.length === 0) return '';
  const n = columns[cols[0]].length;
  const rows = [];
  for (let i = 0; i < n; i += 1) rows.push(cols.map((c) => columns[c][i]));
  return toCsv(cols, rows);
}

/** Filesystem-safe CSV filename for a test id, e.g. "cullinan_TX2_CU200.csv". */
export function testFilename(testId) {
  return `cullinan_${String(testId).replace(/[^A-Za-z0-9._-]+/g, '_')}.csv`;
}

/** Trigger a browser download of `csvText` as `filename` via a Blob. */
export function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Repository path to the full-resolution raw CSV for a test.
 * `csv_file` is relative (e.g. "csv/01_x.csv"); raw data lives under
 * data/raw/<type>/.
 */
export function rawCsvPath(type, csvFile) {
  return `data/raw/${type}/${csvFile}`;
}

/** Format a numeric value for display, or an em dash for null/undefined. */
export function fmt(value, digits = 3) {
  if (value == null || Number.isNaN(value)) return '—';
  if (typeof value !== 'number') return String(value);
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(digits);
}

/** Compact axis-tick label: ~3 significant figures, no trailing noise. */
export function formatTick(value) {
  if (value == null || Number.isNaN(value)) return '';
  const a = Math.abs(value);
  if (a !== 0 && (a < 0.001 || a >= 100000)) return value.toExponential(1);
  return String(Number(value.toPrecision(3)));
}

/**
 * "Nice" tick positions for a log axis over [min, max], using 1-2-5 per
 * decade. Falls back to the endpoints when a narrow range contains no
 * standard decade tick, guaranteeing at least two readable ticks.
 */
export function niceLogTicks(min, max) {
  if (!(min > 0) || !(max > 0) || min >= max) return undefined;
  const ticks = [];
  const lo = Math.floor(Math.log10(min));
  const hi = Math.ceil(Math.log10(max));
  for (let e = lo; e <= hi; e += 1) {
    for (const m of [1, 2, 5]) {
      const v = m * 10 ** e;
      if (v >= min * 0.9999 && v <= max * 1.0001) ticks.push(v);
    }
  }
  if (ticks.length < 2) return [min, max];
  return ticks;
}
