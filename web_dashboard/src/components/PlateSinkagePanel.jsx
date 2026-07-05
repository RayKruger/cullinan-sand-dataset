import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import makeTooltip from './ChartTooltip.jsx';
import DownloadBar from './DownloadBar.jsx';
import { downloadTestCsv, downloadTestNpz } from '../data/fulldl.js';
import { METHOD_META, methodMeta, methodNumber } from '../data/colors.js';
import {
  buildSeries,
  downloadCsv,
  toCsv,
  rawCsvPath,
  fmt,
  columnsToCsv,
  testFilename,
} from '../data/transform.js';

const REF_PRESSURE = 100; // kPa — Nominal Vehicle Ground Pressure
const FORCE_FACTOR = 0.018; // secondary force axis: force [kN] = pressure [kPa] × 0.018
const ALL_POINTS = Infinity; // plot every available point (data is pre-decimated in the JSON)

const PlateTooltip = makeTooltip({
  xLabel: 'Sinkage',
  xUnit: 'mm',
  yLabel: 'Pressure',
  yUnit: 'kPa',
});

export default function PlateSinkagePanel({ dataset }) {
  const tests = dataset.tests;

  // Methods present, sorted ascending.
  const methodsPresent = useMemo(() => {
    const set = new Set();
    tests.forEach((t) => {
      const n = methodNumber(t.scalars.method);
      if (n != null) set.add(n);
    });
    return [...set].sort((a, b) => a - b);
  }, [tests]);

  const [selectedMethods, setSelectedMethods] = useState(() => new Set(methodsPresent));
  const [showRef, setShowRef] = useState(true);

  const visibleTests = useMemo(
    () => tests.filter((t) => selectedMethods.has(methodNumber(t.scalars.method))),
    [tests, selectedMethods]
  );

  const series = useMemo(
    () =>
      visibleTests.map((t) => ({
        id: t.test_id,
        name: t.test_id,
        color: methodMeta(t.scalars.method).color,
        data: buildSeries(t.columns.sinkage, t.columns.pressure, ALL_POINTS),
      })),
    [visibleTests]
  );

  function toggleMethod(n) {
    setSelectedMethods((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }

  function handleDownload() {
    const header = ['test_id', 'method', 'sinkage_mm', 'pressure_kPa', 'force_kN'];
    const rows = [];
    series.forEach((s) => {
      const mNum = methodNumber(visibleTests.find((t) => t.test_id === s.id)?.scalars.method);
      s.data.forEach((p) => {
        rows.push([
          s.id,
          mNum ?? '',
          p.x,
          p.y,
          p.y == null ? '' : (p.y * FORCE_FACTOR).toFixed(4),
        ]);
      });
    });
    downloadCsv('plate_sinkage_visible.csv', toCsv(header, rows));
  }

  return (
    <div className="panel">
      <div className="panel__row">
        <div className="panel__plot">
          <p className="panel__hint">
            Pressure–sinkage response coloured by compaction method. Secondary force axis:{' '}
            <code>force [kN] = pressure [kPa] × {FORCE_FACTOR}</code>.
          </p>

          <div className="chart">
            <ResponsiveContainer width="100%" height={460}>
              <LineChart margin={{ top: 12, right: 24, bottom: 48, left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-grid)" />
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={[0, 80]}
                  allowDataOverflow
                  allowDuplicatedCategory={false}
                  tickCount={9}
                  label={{ value: 'Sinkage [mm]', position: 'insideBottom', offset: -12 }}
                />
                <YAxis
                  type="number"
                  domain={[0, 'auto']}
                  allowDataOverflow
                  label={{ value: 'Pressure [kPa]', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<PlateTooltip />} isAnimationActive={false} />
                {showRef && (
                  <ReferenceLine
                    y={REF_PRESSURE}
                    stroke="#e2a53b"
                    strokeDasharray="6 4"
                    strokeWidth={1.4}
                    label={{
                      value: 'Nominal Vehicle Ground Pressure = 100 kPa',
                      position: 'insideTopRight',
                      fill: '#e2a53b',
                      fontSize: 11,
                    }}
                  />
                )}
                {series.map((s) => (
                  <Line
                    key={s.id}
                    data={s.data}
                    dataKey="y"
                    name={s.name}
                    stroke={s.color}
                    strokeWidth={1.6}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="legend">
            {methodsPresent.map((n) => {
              const meta = METHOD_META[n];
              const dimmed = !selectedMethods.has(n);
              return (
                <span key={n} className={`legend__item${dimmed ? ' legend__item--dim' : ''}`}>
                  <span className="swatch" style={{ background: meta.color }} />
                  {meta.name} — {meta.desc}
                </span>
              );
            })}
          </div>
        </div>

        <aside className="panel__side">
          <div className="panel__controls">
            <fieldset className="control control--group">
              <legend className="control__label">Compaction method</legend>
              <div className="checkrow">
                {methodsPresent.map((n) => {
                  const meta = METHOD_META[n];
                  return (
                    <label key={n} className="checkbox" title={meta.desc}>
                      <input
                        type="checkbox"
                        checked={selectedMethods.has(n)}
                        onChange={() => toggleMethod(n)}
                      />
                      <span className="swatch" style={{ background: meta.color }} />
                      <span>
                        {meta.name} <span className="checkbox__desc">— {meta.desc}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <label className="control checkbox checkbox--standalone">
              <input
                type="checkbox"
                checked={showRef}
                onChange={(e) => setShowRef(e.target.checked)}
              />
              <span>Show 100 kPa reference (Nominal Vehicle Ground Pressure)</span>
            </label>
          </div>
        </aside>
      </div>

      <div className="panel__actions">
        <span className="panel__count">
          {visibleTests.length} of {tests.length} tests shown
        </span>
      </div>

      <MetadataTable tests={visibleTests} />

      <DownloadBar />
    </div>
  );
}

function MetadataTable({ tests }) {
  if (tests.length === 0) {
    return <p className="empty">No tests selected — enable a method above.</p>;
  }
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Test ID</th>
            <th>Method</th>
            <th>Dry density [kg/m³]</th>
            <th>Void ratio e [-]</th>
            <th>Mod. Proctor [%]</th>
            <th>Raw CSV (in repo)</th>
            <th>Download</th>
          </tr>
        </thead>
        <tbody>
          {tests.map((t) => {
            const meta = methodMeta(t.scalars.method);
            return (
              <tr key={t.test_id}>
                <td>{t.test_id}</td>
                <td>
                  <span className="swatch swatch--inline" style={{ background: meta.color }} />
                  {meta.name}
                </td>
                <td>{fmt(t.scalars.dry_density)}</td>
                <td>{fmt(t.scalars.void_ratio)}</td>
                <td>{fmt(t.scalars.mod_procter)}</td>
                <td>
                  <code title="Full-resolution CSV path in the data repository">
                    {rawCsvPath('plate_sinkage', t.csv_file)}
                  </code>
                </td>
                <td>
                  <span className="table__dl">
                    <button
                      className="btn btn--tiny"
                      onClick={() => downloadTestCsv('plate_sinkage', t.csv_file, t.test_id)}
                    >
                      ⬇ CSV
                    </button>
                    <button
                      className="btn btn--tiny"
                      onClick={() => downloadTestNpz('plate_sinkage', t.csv_file, t.test_id)}
                    >
                      ⬇ NPZ
                    </button>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
