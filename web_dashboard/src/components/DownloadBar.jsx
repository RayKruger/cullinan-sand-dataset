import React, { useState } from 'react';
import {
  downloadTypeCsv,
  downloadTypeNpz,
  downloadAllCsvZip,
  downloadAllNpzZip,
} from '../data/fulldl.js';

// Full-resolution downloads: all datasets as a single ZIP (of CSVs or of the
// NumPy .npz bundles), or one dataset at a time (combined CSV / .npz bundle).
const DL_TYPES = [
  { type: 'plate_sinkage', label: 'Plate sinkage' },
  { type: 'shear', label: 'Bevameter shear' },
  { type: 'triaxial', label: 'Triaxial' },
];

export default function DownloadBar() {
  const [busy, setBusy] = useState(false);

  function run(fn) {
    setBusy(true);
    Promise.resolve()
      .then(fn)
      // eslint-disable-next-line no-console
      .catch((e) => console.error('download failed', e))
      .finally(() => setBusy(false));
  }

  const rows = [
    {
      key: 'all',
      label: 'All datasets (zip)',
      csvLabel: '⬇ ZIP · CSV',
      npzLabel: '⬇ ZIP · NPZ',
      csv: () => run(downloadAllCsvZip),
      npz: () => run(downloadAllNpzZip),
    },
    ...DL_TYPES.map((t) => ({
      key: t.type,
      label: t.label,
      csvLabel: '⬇ CSV',
      npzLabel: '⬇ NPZ',
      csv: () => run(() => downloadTypeCsv(t.type)),
      npz: () => run(() => downloadTypeNpz(t.type)),
    })),
  ];

  return (
    <div className="downloadbar">
      <span className="downloadbar__label">
        Download all data — full resolution{busy ? ' · preparing…' : ''}
      </span>
      <div className="downloadbar__grid">
        {rows.map((r) => (
          <React.Fragment key={r.key}>
            <span className="downloadbar__rowlabel">{r.label}</span>
            <button className="btn btn--tiny" onClick={r.csv} disabled={busy}>
              {r.csvLabel}
            </button>
            <button className="btn btn--tiny" onClick={r.npz} disabled={busy}>
              {r.npzLabel}
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
