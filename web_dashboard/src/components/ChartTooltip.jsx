// Custom recharts tooltip that renders axis-aware labels/units.
import React from 'react';
import { fmt } from '../data/transform.js';

export default function makeTooltip({ xLabel, xUnit, yLabel, yUnit, xDigits = 3, yDigits = 2 }) {
  function ChartTooltip({ active, payload }) {
    if (!active || !payload || payload.length === 0) return null;
    const point = payload[0]?.payload;
    const xVal = point?.x;
    return (
      <div className="tooltip">
        <div className="tooltip__x">
          {xLabel}: <strong>{fmt(xVal, xDigits)}</strong>
          {xUnit ? ` ${xUnit}` : ''}
        </div>
        {payload.map((entry, i) => (
          <div className="tooltip__row" key={`${entry.name}-${i}`}>
            <span className="tooltip__swatch" style={{ background: entry.color || entry.stroke }} />
            <span className="tooltip__name">{entry.name}</span>
            <span className="tooltip__val">
              {yLabel}: <strong>{fmt(entry.value, yDigits)}</strong>
              {yUnit ? ` ${yUnit}` : ''}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return ChartTooltip;
}
