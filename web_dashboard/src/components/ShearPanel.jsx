import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import makeTooltip from './ChartTooltip.jsx';
import DownloadBar from './DownloadBar.jsx';
import { downloadTestCsv, downloadTestNpz } from '../data/fulldl.js';
import { methodMeta } from '../data/colors.js';
import {
  buildSeries,
  downloadCsv,
  toCsv,
  rawCsvPath,
  fmt,
  columnsToCsv,
  testFilename,
} from '../data/transform.js';

const ALL_POINTS = Infinity; // plot every available point (data is pre-decimated in the JSON)

const ShearTooltip = makeTooltip({
  xLabel: 'Displacement',
  xUnit: 'mm',
  yLabel: 'Shear stress',
  yUnit: 'kPa',
});

// Legend / series label per the data spec: "{Method} | σₙ={Normal_Stress} kPa | {Density} kg/m³"
function shearLabel(scalars) {
  const density = scalars.Density == null ? 'n/a' : `${scalars.Density} kg/m³`;
  return `${scalars.Method} | σₙ=${fmt(scalars.Normal_Stress)} kPa | ${density}`;
}

export default function ShearPanel({ dataset }) {
  const tests = dataset.tests;

  const [selected, setSelected] = useState(() => new Set(tests.map((t) => t.test_id)));

  // Stable colour per test, keyed to its compaction method (same palette as the
  // plate-sinkage panel), so identity is consistent across the dashboard.
  const colorByTest = useMemo(() => {
    const map = {};
    tests.forEach((t) => {
      map[t.test_id] = methodMeta(t.scalars.Method).color;
    });
    return map;
  }, [tests]);

  const visibleTests = useMemo(
    () => tests.filter((t) => selected.has(t.test_id)),
    [tests, selected]
  );

  const series = useMemo(
    () =>
      visibleTests.map((t) => ({
        id: t.test_id,
        name: shearLabel(t.scalars),
        color: colorByTest[t.test_id],
        data: buildSeries(t.columns.Displacement, t.columns.shear_stress, ALL_POINTS),
      })),
    [visibleTests, colorByTest]
  );

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDownload() {
    const header = ['test_id', 'method', 'normal_stress_kPa', 'displacement_mm', 'shear_stress_kPa'];
    const rows = [];
    series.forEach((s) => {
      const t = visibleTests.find((v) => v.test_id === s.id);
      s.data.forEach((p) => {
        rows.push([s.id, t.scalars.Method, t.scalars.Normal_Stress, p.x, p.y]);
      });
    });
    downloadCsv('bevameter_shear_visible.csv', toCsv(header, rows));
  }

  return (
    <div className="panel">
      <div className="panel__row">
        <div className="panel__plot">
          <p className="panel__hint">Shear stress–displacement response; colour by compaction method.</p>

          <div className="chart">
            <ResponsiveContainer width="100%" height={460}>
              <LineChart margin={{ top: 12, right: 24, bottom: 48, left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-grid)" />
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={[0, 'auto']}
                  allowDataOverflow
                  allowDuplicatedCategory={false}
                  tickCount={8}
                  label={{ value: 'Displacement [mm]', position: 'insideBottom', offset: -12 }}
                />
                <YAxis
                  type="number"
                  domain={[0, 'auto']}
                  allowDataOverflow
                  label={{ value: 'Shear stress [kPa]', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<ShearTooltip />} isAnimationActive={false} />
                {series.map((s) => (
                  <Line
                    key={s.id}
                    data={s.data}
                    dataKey="y"
                    name={s.name}
                    stroke={s.color}
                    strokeWidth={1.8}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="legend">
            {series.map((s) => (
              <span key={s.id} className="legend__item">
                <span className="swatch" style={{ background: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
        </div>

        <aside className="panel__side">
          <div className="panel__controls">
            <fieldset className="control control--group control--grow">
              <legend className="control__label">Select tests (multi-select)</legend>
              <div className="checklist">
                {tests.map((t) => (
                  <label key={t.test_id} className="checkbox">
                    <input
                      type="checkbox"
                      checked={selected.has(t.test_id)}
                      onChange={() => toggle(t.test_id)}
                    />
                    <span className="swatch" style={{ background: colorByTest[t.test_id] }} />
                    <span>{shearLabel(t.scalars)}</span>
                  </label>
                ))}
              </div>
              <div className="checklist__actions">
                <button
                  className="btn btn--tiny"
                  onClick={() => setSelected(new Set(tests.map((t) => t.test_id)))}
                >
                  Select all
                </button>
                <button className="btn btn--tiny" onClick={() => setSelected(new Set())}>
                  Clear
                </button>
              </div>
            </fieldset>
          </div>
        </aside>
      </div>

      <div className="panel__actions">
        <span className="panel__count">
          {visibleTests.length} of {tests.length} tests shown
        </span>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Test ID</th>
              <th>Method</th>
              <th>Normal stress σₙ [kPa]</th>
              <th>Density [kg/m³]</th>
              <th>Raw CSV (in repo)</th>
              <th>Download</th>
            </tr>
          </thead>
          <tbody>
            {visibleTests.map((t) => (
              <tr key={t.test_id}>
                <td>
                  <span className="swatch swatch--inline" style={{ background: colorByTest[t.test_id] }} />
                  {t.test_id}
                </td>
                <td>{t.scalars.Method}</td>
                <td>{fmt(t.scalars.Normal_Stress)}</td>
                <td>{fmt(t.scalars.Density)}</td>
                <td>
                  <code title="Full-resolution CSV path in the data repository">
                    {rawCsvPath('shear', t.csv_file)}
                  </code>
                </td>
                <td>
                  <span className="table__dl">
                    <button
                      className="btn btn--tiny"
                      onClick={() => downloadTestCsv('shear', t.csv_file, t.test_id)}
                    >
                      ⬇ CSV
                    </button>
                    <button
                      className="btn btn--tiny"
                      onClick={() => downloadTestNpz('shear', t.csv_file, t.test_id)}
                    >
                      ⬇ NPZ
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DownloadBar />
    </div>
  );
}
