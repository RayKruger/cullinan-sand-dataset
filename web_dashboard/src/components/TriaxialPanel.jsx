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
import { seriesColors } from '../data/colors.js';
import {
  buildSeries,
  downloadCsv,
  toCsv,
  rawCsvPath,
  fmt,
  formatTick,
  niceLogTicks,
} from '../data/transform.js';

const TABLE_ROWS = 200;
const ALL_POINTS = Infinity; // plot every available point (data is pre-decimated in the JSON)

// Consolidated-Undrained (CU) vs Consolidated-Drained (CD) from the test id,
// e.g. "TX2 CU200" → CU, "TX13 CD400" → CD.
function drainageOf(t) {
  const s = String(t.test_id || t.scalars?.name || '');
  if (s.includes('CD')) return 'CD';
  if (s.includes('CU')) return 'CU';
  return 'other';
}

export default function TriaxialPanel({ dataset, drainage }) {
  const tests = useMemo(
    () => (drainage ? dataset.tests.filter((t) => drainageOf(t) === drainage) : dataset.tests),
    [dataset.tests, drainage]
  );
  const panels = dataset.axes.panels;

  const [primaryId, setPrimaryId] = useState(tests[0]?.test_id);
  // All tests overlaid on the q–p′ panel by default.
  const [overlayIds, setOverlayIds] = useState(() => new Set(tests.map((t) => t.test_id)));

  const colorByTest = useMemo(() => {
    const colors = seriesColors(tests.length);
    const map = {};
    tests.forEach((t, i) => {
      map[t.test_id] = colors[i];
    });
    return map;
  }, [tests]);

  const primary = useMemo(
    () => tests.find((t) => t.test_id === primaryId) || tests[0],
    [tests, primaryId]
  );
  const overlays = useMemo(
    () => tests.filter((t) => overlayIds.has(t.test_id) && t.test_id !== primaryId),
    [tests, overlayIds, primaryId]
  );

  // Build the {name,color,data} series for a given panel definition. The
  // q–p′ panel additionally shows any overlay tests.
  function seriesForPanel(panel) {
    const list = [primary, ...(panel.id === 'q_p' ? overlays : [])];
    return list.map((t) => ({
      id: t.test_id,
      name: t.test_id,
      color: colorByTest[t.test_id],
      primary: t.test_id === primary.test_id,
      data: buildSeries(t.columns[panel.x], t.columns[panel.y], ALL_POINTS, panel.logx),
    }));
  }

  function toggleOverlay(id) {
    setOverlayIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // First ~200 rows of the primary test's (decimated) columns.
  const tableRows = useMemo(() => {
    const c = primary.columns;
    const n = Math.min(TABLE_ROWS, c.axial_strain.length);
    return Array.from({ length: n }, (_, i) => ({
      axial_strain: c.axial_strain[i],
      q: c.q[i],
      p_prime: c.p_prime[i],
      e: c.e[i],
    }));
  }, [primary]);

  function handleDownload() {
    const c = primary.columns;
    const n = c.axial_strain.length;
    const header = ['test_id', 'axial_strain', 'q_kPa', 'p_prime_kPa', 'e'];
    const rows = [];
    for (let i = 0; i < n; i += 1) {
      rows.push([primary.test_id, c.axial_strain[i], c.q[i], c.p_prime[i], c.e[i]]);
    }
    downloadCsv(`triaxial_${primary.test_id.replace(/\s+/g, '_')}.csv`, toCsv(header, rows));
  }

  return (
    <div className="panel">
      <div className="panel__row">
        <div className="panel__plot">
          <div className="triaxial-grid">
            {panels.map((panel) => (
              <TriaxialSubPanel key={panel.id} panel={panel} series={seriesForPanel(panel)} />
            ))}
          </div>
        </div>

        <aside className="panel__side">
          <div className="panel__controls">
            <label className="control">
              <span className="control__label">Primary test</span>
              <select
                className="select"
                name="triaxial-primary-test"
                value={primaryId}
                onChange={(e) => setPrimaryId(e.target.value)}
              >
                {tests.map((t) => (
                  <option key={t.test_id} value={t.test_id}>
                    {t.test_id}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="control control--group">
              <legend className="control__label">Overlay on q–p′ panel (optional)</legend>
              <div className="checkrow checkrow--wrap">
                {tests
                  .filter((t) => t.test_id !== primaryId)
                  .map((t) => (
                    <label key={t.test_id} className="checkbox checkbox--compact">
                      <input
                        type="checkbox"
                        checked={overlayIds.has(t.test_id)}
                        onChange={() => toggleOverlay(t.test_id)}
                      />
                      <span className="swatch" style={{ background: colorByTest[t.test_id] }} />
                      <span>{t.test_id}</span>
                    </label>
                  ))}
              </div>
            </fieldset>
          </div>
        </aside>
      </div>

      <div className="panel__actions">
        <button
          className="btn"
          onClick={() => downloadTestCsv('triaxial', primary.csv_file, primary.test_id)}
        >
          ⬇ {primary.test_id} — CSV
        </button>
        <button
          className="btn"
          onClick={() => downloadTestNpz('triaxial', primary.csv_file, primary.test_id)}
        >
          ⬇ {primary.test_id} — NPZ
        </button>
        <span className="panel__count">
          Table below: first {tableRows.length} points of {primary.test_id}. Raw CSV in repo:{' '}
          <code>{rawCsvPath('triaxial', primary.csv_file)}</code>
        </span>
      </div>

      <div className="table-wrap table-wrap--scroll">
        <table className="table table--compact">
          <thead>
            <tr>
              <th>#</th>
              <th>Axial strain [-]</th>
              <th>q [kPa]</th>
              <th>p′ [kPa]</th>
              <th>Void ratio e [-]</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((r, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{fmt(r.axial_strain, 5)}</td>
                <td>{fmt(r.q, 2)}</td>
                <td>{fmt(r.p_prime, 2)}</td>
                <td>{fmt(r.e, 4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DownloadBar />
    </div>
  );
}

function TriaxialSubPanel({ panel, series }) {
  const PanelTooltip = useMemo(
    () =>
      makeTooltip({
        xLabel: panel.x_label,
        yLabel: panel.y_label,
        xDigits: 4,
        yDigits: 3,
      }),
    [panel]
  );

  // For the log axis, derive clean 1-2-5 decade ticks from the actual
  // (positive) x-range so labels read as 1, 10, 100… instead of raw data mins.
  const logTicks = useMemo(() => {
    if (!panel.logx) return undefined;
    let min = Infinity;
    let max = -Infinity;
    series.forEach((s) =>
      s.data.forEach((p) => {
        if (p.x != null && p.x > 0) {
          if (p.x < min) min = p.x;
          if (p.x > max) max = p.x;
        }
      })
    );
    return Number.isFinite(min) && Number.isFinite(max) ? niceLogTicks(min, max) : undefined;
  }, [panel.logx, series]);

  const xAxisProps = panel.logx
    ? {
        scale: 'log',
        domain: ['auto', 'auto'],
        allowDataOverflow: true,
        type: 'number',
        ticks: logTicks,
        tickFormatter: formatTick,
      }
    : { type: 'number', domain: ['auto', 'auto'], tickFormatter: formatTick };

  return (
    <div className="subpanel">
      <div className="subpanel__title">
        {panel.y_label} vs {panel.x_label}
        {panel.logx && <span className="badge">log x</span>}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart margin={{ top: 8, right: 18, bottom: 40, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-grid)" />
          <XAxis
            dataKey="x"
            allowDuplicatedCategory={false}
            tickCount={6}
            label={{ value: panel.x_label, position: 'insideBottom', offset: -10 }}
            {...xAxisProps}
          />
          <YAxis
            type="number"
            domain={['auto', 'auto']}
            width={64}
            tickFormatter={formatTick}
            label={{ value: panel.y_label, angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<PanelTooltip />} isAnimationActive={false} />
          {series.map((s) => (
            <Line
              key={s.id}
              data={s.data}
              dataKey="y"
              name={s.name}
              stroke={s.color}
              strokeWidth={s.primary ? 2.2 : 1.4}
              strokeOpacity={s.primary ? 1 : 0.75}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {series.length > 1 && (
        <div className="legend legend--small">
          {series.map((s) => (
            <span key={s.id} className="legend__item">
              <span className="swatch" style={{ background: s.color }} />
              {s.name}
              {s.primary ? ' (primary)' : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
