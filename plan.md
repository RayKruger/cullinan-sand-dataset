# Migration Plan — Publication-Ready Research Archive

**Goal:** Restructure the existing geotechnical test data + code into a clean,
publication-ready archive suitable for **GitHub**, **GitHub Pages**, and **Zenodo**.

All new work lives in a **new folder**: `paper-repository/`. Nothing in the
original dated folders (`11_11_2025/`, `18_11_2025/`, `30_03_2026/`) is deleted or
modified — they remain untouched as provenance.

---

## 1. What exists today (inspection results)

```
Data_Repository_Upload/
├── count_all_tests_bevamter.txt        # notes: test-count tally (total 52)
├── 11_11_2025/                         # oldest: dill pickles as *.obj
│   ├── All_Bevameter_plate_sinkage_tests_data.obj
│   ├── All_Bevameter_shear_test_data.obj
│   └── All_triaxial_tests_data.obj
├── 18_11_2025/                         # *.pkl + one triaxial plot script
│   ├── All_Bevameter_plate_sinkage_tests_data.pkl
│   ├── All_Bevameter_shear_test_data.pkl
│   ├── All_triaxial_tests_data.pkl
│   └── plot_all_triaxial_data.py
└── 30_03_2026/                         # BEST / CURRENT — the source of truth
    ├── README.md
    ├── requirements.txt                # dill, numpy, matplotlib, pandas, scipy
    ├── export_to_open_formats.py       # regenerates open formats from .pkl
    ├── plate_sinkage/   (13 tests)     # .pkl, .npz, metadata.csv/json, csv/, plot
    ├── shear/           (4 tests)      # .pkl, .npz, metadata.csv/json, csv/, plot
    └── triaxial/        (16 tests)     # .pkl, .npz, metadata.csv/json, csv/, plot
```

**Datasets (source of truth = `30_03_2026/`):**

| Type | Tests | CSV columns | Per-test scalars (metadata) |
|------|-------|-------------|-----------------------------|
| plate_sinkage | 13 | `sinkage, pressure` | name, original_name, method, dry_density, void_ratio, mod_procter |
| shear | 4 | `Displacement, shear_stress` | Method, Normal_Stress, Density, Mod_asshto |
| triaxial | 16 | `axial_strain, q, p_prime, e` | name |

**Data volume:** ~45 MB of CSV (plate ≈20 MB, shear ≈16 MB, triaxial ≈9 MB);
individual tests up to ~182k rows. Full resolution is preserved in the archive;
the web dashboard uses a decimated copy for rendering (see §5).

**PyQt dashboard:** none exists in the repo (a grep hit was the word "dashed").
The current "dashboard" is the three **matplotlib** plotting scripts. We will
build **both** a new PyQt desktop dashboard (Python, per your instruction) and a
React web dashboard that mirrors it.

**Units / science to preserve verbatim:** pressure/stress `[kPa]`, sinkage/
displacement `[mm]`, void ratio `[-]`, density `[kg/m³]`, force `[kN]`
(sinkage 2nd axis uses factor 0.018), `q`, `p'`, `axial_strain`, `e`. Compaction
Method 1–5 semantics and the Kruger et al. (2023) reference are carried through
unchanged.

---

## 2. Target structure

```
paper-repository/
├── README.md                 # top-level: structure, quick start, deploy
├── LICENSE                   # (choice confirmed with user)
├── CITATION.cff              # placeholders where publication metadata unknown
├── .gitignore                # ignores build junk BUT NOT web_dashboard/dist/
├── plan.md                   # this file
├── data/
│   ├── README.md             # data dictionary, formats, provenance
│   ├── raw/                  # datasets AS-IS (source of truth)
│   │   ├── plate_sinkage/    # .pkl, .npz, metadata.csv/json, csv/
│   │   ├── shear/
│   │   └── triaxial/
│   └── processed/            # generated/derived outputs
│       ├── plate_sinkage/    # (regenerated open formats live here if re-run)
│       ├── shear/
│       └── triaxial/
├── python/
│   ├── README.md             # install + usage for every script
│   ├── requirements.txt      # existing deps + PyQt5 + pyqtgraph
│   ├── scripts/
│   │   ├── export_to_open_formats.py   # from 30_03_2026 (paths updated)
│   │   ├── plot_plate_sinkage.py       # preserved matplotlib figure
│   │   ├── plot_shear.py               # preserved matplotlib figure
│   │   ├── plot_triaxial.py            # preserved matplotlib figure
│   │   ├── dashboard_qt.py             # NEW PyQt desktop dashboard (Qt)
│   │   └── build_web_data.py           # NEW: decimated JSON for web_dashboard
│   └── notebooks/
│       └── quickstart.ipynb            # load + plot example (all 3 types)
└── web_dashboard/            # React + Vite static site (no backend)
    ├── README.md             # dev / build / GitHub Pages deploy
    ├── package.json
    ├── vite.config.js        # base path set for GitHub Pages
    ├── index.html
    ├── .gitignore
    ├── public/
    │   └── data/             # decimated JSON consumed by the app (static)
    ├── src/
    │   ├── main.jsx, App.jsx
    │   ├── components/       # Plot, Dropdown, Slider, Tabs, Filters, Table
    │   └── data/            # loaders/hooks
    └── dist/                 # COMMITTED production build (Zenodo-runnable)
```

---

## 3. Migration steps (incremental, verified)

1. **Skeleton** — create all folders + `.gitkeep` where needed.
2. **Copy data** (copy, never move — originals stay put):
   - `30_03_2026/{type}/` → `data/raw/{type}/` (pkl, npz, metadata, csv/).
   - Keep a second regenerated copy target in `data/processed/` (populated by
     re-running the exporter; documented as reproducible).
3. **Python** — copy the 4 scripts into `python/scripts/`, update their data
   paths to point at `data/raw/...` via a small path resolver (no logic/number
   changes). Add `dashboard_qt.py`, `build_web_data.py`, notebook, README,
   requirements (+PyQt5, +pyqtgraph).
4. **Verify Python** — run `export_to_open_formats.py` (round-trip), run each
   `plot_*.py` in a headless/Agg check, smoke-test `dashboard_qt.py` import, run
   `build_web_data.py` to emit `web_dashboard/public/data/*.json`.
5. **Web data** — `build_web_data.py` reads `data/raw` CSVs, decimates each test
   to ≤~2,000 points (largest-triangle / stride), writes compact JSON + an index
   with metadata. Full data untouched; decimation documented and labeled.
6. **React app** — scaffold Vite React, implement components mirroring the three
   matplotlib figures + interactivity (tabs per test type, dropdown/multi-select
   test picker, method filters, point-count slider, hover tooltips, data table,
   CSV download links). Plot lib: lightweight canvas/SVG (Recharts or uPlot).
7. **Build** — `npm install && npm run build`; commit `dist/`.
8. **Docs** — top-level + per-folder READMEs, CITATION.cff, LICENSE, .gitignore.
9. **Final verification** — Python scripts run; `npm run build` succeeds; `dist/`
   present; links resolve under a GitHub Pages base path.

---

## 4. Dashboard feature parity (PyQt ↔ React)

| Figure (matplotlib source) | Interactive equivalent (both dashboards) |
|----------------------------|------------------------------------------|
| Plate sinkage: pressure vs sinkage, colored by Method, 100 kPa nominal line, 2nd axis Force [kN], annotations | Tab with method-colored lines, toggle nominal line, method filter, hover values, Force axis note |
| Shear: shear_stress vs displacement, per-test viridis, rich legend | Tab with per-test lines, test multi-select, legend = Method \| σₙ \| density |
| Triaxial: per test 3 panels (q–εₐ, q–p′, e–p′ semilog) | Tab with test dropdown + 3 linked panels, log-x on e–p′ |
| (all) | point-count slider, data table of the selected test, CSV download |

Numbers, units, equations, colors, and scientific meaning are reproduced exactly;
only the rendering medium changes.

---

## 5. Data-size policy (integrity)

- `data/raw/` and `data/processed/` keep **full-resolution** CSV/NPZ/PKL — the
  scientific record, unchanged.
- `web_dashboard/public/data/` holds a **decimated JSON copy for display only**,
  generated reproducibly by `build_web_data.py`. This is clearly labeled in the
  data README and the dashboard UI; it never overwrites or edits raw values.

---

## 6. Deliverables checklist

- [ ] `paper-repository/` skeleton
- [ ] `data/raw` + `data/processed` populated, `data/README.md`
- [ ] `python/` scripts (preserved + PyQt dashboard + web-data builder), README, requirements, notebook
- [ ] Python verified (export round-trip, plots, web-data build)
- [ ] `web_dashboard/` React+Vite app, components with full interactivity
- [ ] `npm run build` succeeds; `dist/` committed
- [ ] Top-level README, LICENSE, CITATION.cff, .gitignore (keeps dist/)
- [ ] GitHub Pages base path configured & links verified

---

## 7. Decisions locked in

- **LICENSE = CC-BY-4.0 for everything** (data + code + docs), per user choice.
  CITATION.cff carries placeholder DOI/authors where unknown.
- **Keep original `.pkl` AND also provide `.npz`** — both formats ship in
  `data/raw/<type>/`, and re-running the exporter regenerates them into
  `data/processed/<type>/`. Nothing is dropped.
- **`.gitignore`** ignores Python virtualenvs (`venv/`, `.venv/`, `env/`) and
  React deps (`node_modules/`) and build caches, but explicitly **does NOT**
  ignore `web_dashboard/dist/` (the committed production build for Zenodo).
- **Python GUI uses the Qt library** (PyQt5) — `dashboard_qt.py` embeds the exact
  matplotlib figures in a Qt app with tabs/dropdowns/sliders/filters/table.
- **Web dashboard = React + Vite**, static build, loads the JSON below.

## 8. Web data contract (`web_dashboard/public/data/*.json`)

Generated by `python/scripts/build_web_data.py` (LTTB decimation ≤2000 pts/test,
display-only; full data stays in `data/raw/`). The React app consumes:

```
index.json  -> { datasets:[{type,title,file,n_tests}], max_points }
<type>.json -> {
  type, title, group_by, max_points, decimated, note, n_tests,
  axes: {                         // plate/shear: {x, series[]}; triaxial: {panels[]}
    x:{key,label,unit}, series:[{key,label,unit}],
    panels:[{id,x,y,x_label,y_label,logx}]   // triaxial only
  },
  tests: [{
    test_id, csv_file, n_rows_full, n_points,
    scalars:{...per-test metadata...},   // method/density/Normal_Stress/name…
    columns:{ <colName>:[floats|null], ... }   // row-aligned, NaN->null
  }]
}
```

Per type: plate_sinkage cols `sinkage,pressure` (group_by `method`); shear cols
`Displacement,shear_stress` (group_by `Method`); triaxial cols
`axial_strain,q,p_prime,e` (3 linked panels, e–p′ log-x).

## 9. Parallel execution (two subagents)

Data contract (§8) is generated and frozen first, then two independent tracks
run in parallel:

- **Subagent A — Python/Qt & docs**: `dashboard_qt.py` (PyQt5), `quickstart.ipynb`,
  `python/README.md`, `python/requirements.txt`; verify PyQt import + plots.
- **Subagent B — React/Vite web**: full Vite React app against §8 JSON,
  components (tabs, dropdowns, multi-select, sliders, filters, tables, downloads,
  plots), GitHub Pages base path, `npm run build`, commit `dist/`.

Top-level docs (README, LICENSE, CITATION.cff, .gitignore) done by the main agent.

---

## Progress log

- [x] Inspected repo; wrote this plan.
- [x] Created `paper-repository/` skeleton.
- [x] Copied datasets → `data/raw/` (checksums verified bit-identical).
- [x] `python/scripts/`: `paperdata.py`, `export_to_open_formats.py`,
      `plot_{plate_sinkage,shear,triaxial}.py`, `build_web_data.py`.
- [x] Ran exporter (round-trip OK) + web-data builder (JSON emitted) + plots
      (PNGs saved headless).
- [ ] Subagent A: PyQt dashboard, notebook, python README/requirements.
- [ ] Subagent B: React/Vite dashboard + `dist/`.
- [ ] Top-level README, LICENSE (CC-BY-4.0), CITATION.cff, .gitignore.
- [ ] Final verification.
