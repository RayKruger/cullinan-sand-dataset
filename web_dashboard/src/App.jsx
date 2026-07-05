import React, { useState } from 'react';
import Tabs from './components/Tabs.jsx';
import PlateSinkagePanel from './components/PlateSinkagePanel.jsx';
import ShearPanel from './components/ShearPanel.jsx';
import TriaxialPanel from './components/TriaxialPanel.jsx';
import BenderPanel from './components/BenderPanel.jsx';
import TorsionalShearPanel from './components/TorsionalShearPanel.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { useDataset } from './data/useDataset.js';

// Tabs are organised into three categories. The triaxial dataset (one JSON
// file) is surfaced as undrained (CU) and drained (CD) tabs via the `drainage`
// filter. The Bevameter shear data is the linear-shear series; the torsional
// shear and bender-element tabs are informational (no bundled curve data).
const GROUP_ORDER = ['Bevameter in-situ field tests', 'Triaxial', 'Bender-element shear wave'];
const TABS = [
  { id: 'plate_sinkage', group: 'Bevameter in-situ field tests', title: 'Plate Sinkage', file: 'plate_sinkage.json', n_tests: 13, Panel: PlateSinkagePanel },
  { id: 'shear_linear', group: 'Bevameter in-situ field tests', title: 'Linear Shear', file: 'shear.json', n_tests: 4, Panel: ShearPanel },
  { id: 'shear_torsional', group: 'Bevameter in-situ field tests', title: 'Torsional Shear', Panel: TorsionalShearPanel, isStatic: true },
  { id: 'triaxial_cd', group: 'Triaxial', title: 'Drained (CD)', file: 'triaxial.json', n_tests: 6, Panel: TriaxialPanel, drainage: 'CD' },
  { id: 'triaxial_cu', group: 'Triaxial', title: 'Undrained (CU)', file: 'triaxial.json', n_tests: 10, Panel: TriaxialPanel, drainage: 'CU' },
  { id: 'bender', group: 'Bender-element shear wave', title: 'Shear-wave tests', n_tests: 6, Panel: BenderPanel, isStatic: true },
];

export default function App() {
  const [active, setActive] = useState(TABS[0].id);

  const activeTab = TABS.find((t) => t.id === active) || TABS[0];
  const dataset = useDataset(activeTab.file); // file undefined (bender) → stays idle

  const ActivePanel = activeTab.Panel;

  const groups = GROUP_ORDER.map((label) => ({
    label,
    tabs: TABS.filter((t) => t.group === label).map((t) => ({
      id: t.id,
      title: t.title,
      n_tests: t.n_tests,
    })),
  }));

  return (
    <div className="app">
      <div className="app__glow" aria-hidden="true" />
      <SideArt side="left" label="Off-road vehicle mobility applications" />
      <SideArt side="right" label="FEM · DEM · SPH · PINNs · MPM · classical empirical models · model validation set" />

      <header className="app__header">
        <div className="app__header-inner">
          <div className="app__header-top">
          <div className="app__header-main">
          <p className="eyebrow">
            <span className="eyebrow__mark" aria-hidden="true">◆</span>
            Multi-scale Cullinan Sand Dataset Dashboard
          </p>
          <p className="app__purpose">
            Supports open research and development across a wide range of terramechanics modeling
            approaches — data-driven and physics-based methods such as{' '}
            <span className="app__methods">FEM, DEM, SPH, PINNs, MPM</span>, and classic empirical
            terramechanics models.
          </p>
          <ul className="composition" aria-label="Dataset composition">
            <li className="composition__item">
              <span className="composition__num">52</span>
              <span className="composition__desc">
                in-situ field Bevameter plate-sinkage &amp; in-situ shear tests
                <span className="composition__scale">field-scale validation tests</span>
              </span>
            </li>
            <li className="composition__item">
              <span className="composition__num">18</span>
              <span className="composition__desc">
                triaxial tests
                <span className="composition__scale">macroscopic laboratory tests</span>
              </span>
            </li>
            <li className="composition__item">
              <span className="composition__num">6</span>
              <span className="composition__desc">
                bender-element shear-wave tests
                <span className="composition__scale">small-strain laboratory &amp; field tests</span>
              </span>
            </li>
          </ul>
          </div>

          <aside className="keycard">
            <div className="keycard__head">Multi-scale soil characterisation</div>
            <div className="keycard__scales">
              <span className="keycard__scale">
                <svg viewBox="0 0 30 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M2 12 q4 -9 8 0 t8 0 t8 0" strokeWidth="1.6" />
                </svg>
                <b>Grain</b>
                <i>bender</i>
              </span>
              <span className="keycard__scale">
                <svg viewBox="0 0 30 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <ellipse cx="15" cy="5" rx="8" ry="2.6" strokeWidth="1.5" />
                  <path d="M7 5 V19 M23 5 V19" strokeWidth="1.5" />
                  <ellipse cx="15" cy="19" rx="8" ry="2.6" strokeWidth="1.5" />
                </svg>
                <b>Lab</b>
                <i>triaxial</i>
              </span>
              <span className="keycard__scale">
                <svg viewBox="0 0 30 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M3 20 H27" strokeWidth="1.5" />
                  <rect x="9" y="9" width="12" height="4" rx="1" strokeWidth="1.5" />
                  <path d="M15 9 V4 M12 6 L15 3 L18 6" strokeWidth="1.5" />
                </svg>
                <b>Field</b>
                <i>Bevameter</i>
              </span>
            </div>
            <dl className="keycard__list">
              <div>
                <dt>Material</dt>
                <dd>Cullinan fine sand</dd>
              </div>
              <div>
                <dt>Open formats</dt>
                <dd>CSV · NPZ · JSON · PKL</dd>
              </div>
              <div>
                <dt>License</dt>
                <dd>CC-BY-4.0</dd>
              </div>
            </dl>
          </aside>
          </div>

          <div className="cites">
            <span className="cites__label">How to cite this data</span>
            <a
              className="citebar"
              href="https://doi.org/10.1016/j.jterra.2026.101138"
              target="_blank"
              rel="noreferrer"
            >
              <span className="citebar__tag">Paper · 2026</span>
              <span className="citebar__doi">10.1016/j.jterra.2026.101138</span>
              <span className="citebar__arrow" aria-hidden="true">↗</span>
            </a>
            <a
              className="citebar"
              href="https://doi.org/10.1016/j.jterra.2023.06.002"
              target="_blank"
              rel="noreferrer"
            >
              <span className="citebar__tag">Paper · 2023</span>
              <span className="citebar__doi">10.1016/j.jterra.2023.06.002</span>
              <span className="citebar__arrow" aria-hidden="true">↗</span>
            </a>
            <a
              className="citebar citebar--data"
              href="https://doi.org/10.5281/zenodo.17584462"
              target="_blank"
              rel="noreferrer"
              title="Dataset archive — doi.org/10.5281/zenodo.17584462"
            >
              <span className="citebar__tag">Dataset repository</span>
              <span className="citebar__doi">10.5281/zenodo.17584462</span>
              <span className="citebar__arrow" aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </header>

      <h2 className="section-head">Explore the dataset</h2>
      <Tabs groups={groups} active={active} onChange={setActive} />

      <main
        key={active}
        className="app__main"
        role="tabpanel"
        id={`panel-${active}`}
        aria-labelledby={`tab-${active}`}
      >
        {activeTab.isStatic ? (
          <ErrorBoundary resetKey={active}>
            <ActivePanel />
          </ErrorBoundary>
        ) : dataset.loading ? (
          <div className="state state--loading">Loading {activeTab.title}…</div>
        ) : dataset.error ? (
          <div className="state state--error">
            Failed to load {activeTab.file}: {dataset.error}
          </div>
        ) : dataset.data ? (
          <ErrorBoundary resetKey={active}>
            <ActivePanel dataset={dataset.data} drainage={activeTab.drainage} />
          </ErrorBoundary>
        ) : null}
      </main>

      <div className="page-footer">© Ray Kruger · All rights reserved</div>
    </div>
  );
}

// Ambient background art for the wide side margins: a stacked "terramechanics
// fleet" of line-art off-road vehicles — planetary rovers (×3), a tracked tank
// and an armored military truck, each on a dune with wheel/track marks, plus a
// ringed planet and stars. A nod to the field this data serves: soil trafficability
// and vehicle mobility. Decorative (aria-hidden), CSP-safe inline SVG.
function SideArt({ side, label }) {
  return (
    <div className={`side-art side-art--${side}`} aria-hidden="true">
      <span className="side-art__label">{label}</span>
      <svg className="side-art__svg" viewBox="0 0 300 790" preserveAspectRatio="xMidYMid meet"
           fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
        {/* small planet + stars */}
        <circle cx="232" cy="30" r="24" strokeWidth="1.4" opacity="0.5" />
        <ellipse cx="232" cy="30" rx="40" ry="9" strokeWidth="1" opacity="0.35" />
        <g strokeWidth="1.4" opacity="0.7">
          <path d="M40 118 l0 9 M35 122 l9 0" />
          <path d="M252 250 l0 9 M247 254 l9 0" />
          <path d="M42 410 l0 9 M37 414 l9 0" />
          <path d="M250 560 l0 9 M245 564 l9 0" />
          <circle cx="255" cy="150" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="46" cy="300" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="255" cy="470" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="48" cy="700" r="1.5" fill="currentColor" stroke="none" />
        </g>
        {/* fleet — rover · tank · rover · military truck · rover */}
        <g transform="translate(78 40)"><GroundMark y={123} w={128} /><RoverShape /></g>
        <g transform="translate(52 190)"><GroundMark y={104} w={196} /><TankShape /></g>
        <g transform="translate(78 330)"><GroundMark y={123} w={128} /><RoverShape /></g>
        <g transform="translate(70 480)"><GroundMark y={108} w={158} /><TruckShape /></g>
        <g transform="translate(78 630)"><GroundMark y={123} w={128} /><RoverShape /></g>
      </svg>
    </div>
  );
}

// Ground line + dashed track marks beneath a vehicle (local coords).
function GroundMark({ y, w }) {
  return (
    <g opacity="0.5">
      <path d={`M-18 ${y} h ${w}`} strokeWidth="1.5" />
      <path d={`M-10 ${y + 8} h ${w - 22}`} strokeWidth="1.1" strokeDasharray="3 6" />
    </g>
  );
}

// Planetary rover (rocker-bogie), ground contact ≈ y 123, facing right.
function RoverShape() {
  return (
    <g strokeWidth="2" opacity="0.9">
      <circle cx="10" cy="104" r="15" />
      <circle cx="52" cy="108" r="15" />
      <circle cx="92" cy="106" r="15" />
      <path d="M10 92 l0 24 M-2 104 l24 0" strokeWidth="1.2" />
      <path d="M52 96 l0 24 M40 108 l24 0" strokeWidth="1.2" />
      <path d="M92 94 l0 24 M80 106 l24 0" strokeWidth="1.2" />
      <path d="M10 104 L34 60 L52 108 M52 90 L74 62 L92 106" strokeWidth="1.5" />
      <rect x="18" y="44" width="70" height="30" rx="4" />
      <path d="M6 42 L102 42" strokeWidth="3" />
      <path d="M6 42 L18 44 M102 42 L88 44" strokeWidth="1.2" />
      <path d="M30 44 L26 14" />
      <rect x="15" y="1" width="21" height="13" rx="2" />
      <circle cx="20" cy="8" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="31" cy="8" r="2.4" fill="currentColor" stroke="none" />
      <path d="M78 44 L92 20" />
      <circle cx="94" cy="15" r="7" />
    </g>
  );
}

// Tracked tank with turret + gun barrel, ground contact ≈ y 104, facing right.
function TankShape() {
  return (
    <g strokeWidth="2" opacity="0.9">
      <rect x="0" y="72" width="158" height="30" rx="15" />
      <circle cx="24" cy="87" r="7" strokeWidth="1.3" />
      <circle cx="51" cy="87" r="7" strokeWidth="1.3" />
      <circle cx="78" cy="87" r="7" strokeWidth="1.3" />
      <circle cx="105" cy="87" r="7" strokeWidth="1.3" />
      <circle cx="132" cy="87" r="7" strokeWidth="1.3" />
      <path d="M8 72 L8 52 L30 44 L138 44 L150 52 L150 72 Z" />
      <path d="M54 44 L60 26 L104 26 L112 44 Z" />
      <circle cx="82" cy="32" r="4.5" strokeWidth="1.3" />
      <path d="M112 34 L184 31" strokeWidth="2.6" />
    </g>
  );
}

// Armored military truck (cab + cargo box, big wheels), ground contact ≈ y 108.
function TruckShape() {
  return (
    <g strokeWidth="2" opacity="0.9">
      <circle cx="34" cy="90" r="16" />
      <circle cx="34" cy="90" r="6" strokeWidth="1.2" />
      <circle cx="120" cy="90" r="16" />
      <circle cx="120" cy="90" r="6" strokeWidth="1.2" />
      <path d="M14 82 L140 82" strokeWidth="1.4" />
      <path d="M16 82 L16 44 L96 44 L96 82 Z" />
      <path d="M34 44 L34 82 M52 44 L52 82 M70 44 L70 82" strokeWidth="1" />
      <path d="M96 82 L96 40 L124 40 L138 62 L138 82 Z" />
      <path d="M101 46 L120 46 L128 60 L101 60 Z" strokeWidth="1.3" />
      <circle cx="134" cy="72" r="2.4" fill="currentColor" stroke="none" />
    </g>
  );
}
