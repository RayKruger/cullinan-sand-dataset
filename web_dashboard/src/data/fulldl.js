// Full-resolution downloads. The complete data is bundled under
// public/data/full/<type>/csv/*.csv and public/data/full/<type>.npz — the same
// files as the repository's data/raw/. Downloads serve those directly (CSV,
// NPZ) or bundle them client-side into ZIPs; NPZ for a single test is generated
// in-browser from its full CSV.
import { downloadCsv, columnsToCsv, parseCsvColumns, testFilename } from './transform.js';
import { columnsToNpz, downloadBytes, zipStore } from './npz.js';

const BASE = import.meta.env.BASE_URL;
const ZENODO = 'https://doi.org/10.5281/zenodo.17584462';

const TYPES = ['plate_sinkage', 'shear', 'triaxial'];

const fullCsvUrl = (type, csvFile) => `${BASE}data/full/${type}/${csvFile}`;
const fullNpzUrl = (type) => `${BASE}data/full/${type}.npz`;

// The full-resolution data is bundled in the self-contained build but omitted
// from the minimal GitHub Pages deploy. If a full file is missing, open the
// Zenodo archive instead of downloading a 404 page.
let openedZenodo = false;
function missingFullData() {
  if (!openedZenodo) {
    openedZenodo = true;
    window.open(ZENODO, '_blank', 'noopener');
  }
  throw new Error('full-resolution data not bundled; opened the Zenodo archive');
}
function fetchText(url) {
  return fetch(url).then((r) => (r.ok ? r.text() : missingFullData()));
}
function fetchBytes(url) {
  return fetch(url)
    .then((r) => (r.ok ? r.arrayBuffer() : missingFullData()))
    .then((b) => new Uint8Array(b));
}
// Per-test file list (csv_file, test_id) from the small display index.
function typeIndex(type) {
  return fetch(`${BASE}data/${type}.json`).then((r) => r.json()).then((d) =>
    d.tests.map((t) => ({ csvFile: t.csv_file, testId: t.test_id }))
  );
}

// ---- single test ----------------------------------------------------------
export function downloadTestCsv(type, csvFile, testId) {
  return fetchText(fullCsvUrl(type, csvFile)).then((text) =>
    downloadCsv(testFilename(testId), text)
  );
}
export function downloadTestNpz(type, csvFile, testId) {
  return fetchText(fullCsvUrl(type, csvFile)).then((text) =>
    downloadBytes(testFilename(testId).replace(/\.csv$/, '.npz'), columnsToNpz(parseCsvColumns(text)))
  );
}

// ---- one dataset ----------------------------------------------------------
// Per-type CSV: one combined CSV (test_id + columns), all tests stacked.
export async function downloadTypeCsv(type) {
  const tests = await typeIndex(type);
  let header = null;
  const rows = [];
  for (const t of tests) {
    // eslint-disable-next-line no-await-in-loop
    const cols = parseCsvColumns(await fetchText(fullCsvUrl(type, t.csvFile)));
    const names = Object.keys(cols);
    if (!header) header = ['test_id', ...names];
    const n = cols[names[0]].length;
    for (let i = 0; i < n; i += 1) rows.push([t.testId, ...names.map((c) => cols[c][i])]);
  }
  const csv = [header, ...rows]
    .map((r) => r.map((v) => (v == null || Number.isNaN(v) ? '' : v)).join(','))
    .join('\r\n');
  downloadCsv(`cullinan_${type}.csv`, csv);
}
// Per-type NPZ: serve the full bundle directly.
export function downloadTypeNpz(type) {
  return fetchBytes(fullNpzUrl(type)).then((b) => downloadBytes(`cullinan_${type}.npz`, b));
}

// ---- all datasets (zipped) ------------------------------------------------
export async function downloadAllCsvZip() {
  const entries = [];
  for (const type of TYPES) {
    // eslint-disable-next-line no-await-in-loop
    const tests = await typeIndex(type);
    for (const t of tests) {
      const base = t.csvFile.replace(/^csv\//, '');
      // eslint-disable-next-line no-await-in-loop
      entries.push({ name: `${type}/${base}`, data: await fetchBytes(fullCsvUrl(type, t.csvFile)) });
    }
  }
  downloadBytes('cullinan_full_csv.zip', zipStore(entries));
}
export async function downloadAllNpzZip() {
  const entries = [];
  for (const type of TYPES) {
    // eslint-disable-next-line no-await-in-loop
    entries.push({ name: `${type}.npz`, data: await fetchBytes(fullNpzUrl(type)) });
  }
  downloadBytes('cullinan_full_npz.zip', zipStore(entries));
}

export { columnsToCsv };
