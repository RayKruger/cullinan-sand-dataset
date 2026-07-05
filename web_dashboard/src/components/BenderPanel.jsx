import React from 'react';

// Informational panel for the bender-element shear-wave tests. These six tests
// are part of the multi-scale Cullinan Sand study, but their raw waveforms are
// not bundled in this static dashboard — so this tab documents the method and
// links to the paper rather than plotting data that isn't present.
export default function BenderPanel() {
  return (
    <div className="panel">
      <div className="infocard">
        <div className="infocard__body">
          <h2 className="infocard__title">Bender-element shear-wave tests</h2>
          <p className="infocard__lead">
            Piezoelectric <strong>bender elements</strong> embedded in the end platens transmit and
            receive a shear wave through the specimen. From the travel time and tip-to-tip distance
            they give the <strong>shear-wave velocity</strong> V<sub>s</sub> at very small strain —
            and hence the maximum (small-strain) shear modulus:
          </p>

          <div className="infocard__eq">
            <code>G₀ = ρ · V<sub>s</sub>²</code>
          </div>

          <div className="infocard__tiles">
            <div className="tile">
              <span className="tile__num">6</span>
              <span className="tile__label">bender-element tests</span>
            </div>
            <div className="tile">
              <span className="tile__num">
                V<sub>s</sub>
              </span>
              <span className="tile__label">shear-wave velocity</span>
            </div>
            <div className="tile">
              <span className="tile__num">G₀</span>
              <span className="tile__label">small-strain stiffness</span>
            </div>
          </div>

          <p className="infocard__note">
            The six bender-element shear-wave tests are documented in the associated{' '}
            <a
              href="https://doi.org/10.1016/j.jterra.2026.101138"
              target="_blank"
              rel="noreferrer"
            >
              Journal of Terramechanics (2026) paper
            </a>
            . Their raw waveforms are not part of this interactive preview; drop a
            <code> bender.json</code> file into <code>public/data/</code> (same shape as the other
            datasets) to plot them here.
          </p>
        </div>

        <BenderDiagram />
      </div>
    </div>
  );
}

// Schematic: a specimen between two platens with source/receiver bender
// elements and a shear wave propagating upward. Decorative + explanatory.
function BenderDiagram() {
  return (
    <figure className="infocard__figure">
      <svg viewBox="0 0 220 280" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"
           role="img" aria-label="Bender-element test schematic">
        {/* platens */}
        <rect x="46" y="24" width="128" height="16" rx="3" strokeWidth="2" />
        <rect x="46" y="240" width="128" height="16" rx="3" strokeWidth="2" />
        {/* specimen */}
        <rect x="62" y="40" width="96" height="200" rx="6" strokeWidth="2" opacity="0.9" />
        {/* soil hatch */}
        <g strokeWidth="1" opacity="0.35">
          <path d="M62 70 H158 M62 110 H158 M62 150 H158 M62 190 H158 M62 220 H158" />
        </g>
        {/* receiver bender (top) */}
        <rect x="98" y="44" width="24" height="9" rx="2" strokeWidth="2" className="infocard__el" />
        <path d="M110 53 V70" strokeWidth="1.5" />
        <text x="132" y="52" className="infocard__lbl">receiver</text>
        {/* source bender (bottom) */}
        <rect x="98" y="227" width="24" height="9" rx="2" strokeWidth="2" className="infocard__el" />
        <path d="M110 227 V210" strokeWidth="1.5" />
        <text x="132" y="235" className="infocard__lbl">source</text>
        {/* shear wave travelling up */}
        <path d="M110 205 q14 -18 0 -36 q-14 -18 0 -36 q14 -18 0 -36"
              strokeWidth="2" className="infocard__wave" />
        <path d="M110 78 l-5 9 M110 78 l5 9" strokeWidth="2" className="infocard__wave" />
        {/* Vs label */}
        <text x="150" y="150" className="infocard__vs">Vₛ ↑</text>
      </svg>
      <figcaption>Shear wave propagating tip-to-tip through the specimen.</figcaption>
    </figure>
  );
}
