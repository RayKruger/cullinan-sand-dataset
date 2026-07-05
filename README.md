# Geotechnical Test Data Repository

Experimental geotechnical test data on sand — **Bevameter plate sinkage**,
**Bevameter shear**, and **triaxial compression** tests — packaged as a clean,
publication-ready archive for **GitHub**, **GitHub Pages**, and **Zenodo**.

The dataset supports soil mechanics, terramechanics, constitutive-model
calibration (NorSand, Cam-Clay, Mohr–Coulomb, …), and numerical modelling
(FEM / DEM / MPM). The Bevameter sinkage and shear data correspond to the
experimental investigation of **Kruger et al. (2023)**.

> **Reference:** R. Kruger, P. S. Els, and H. A. Hamersma. *Experimental
> investigation of factors affecting the characterisation of soil strength
> properties using a Bevameter in-situ plate sinkage and shear test apparatus.*
> Journal of Terramechanics, 109:45–62, 2023.
> <https://doi.org/10.1016/j.jterra.2023.06.002>

---

## What's inside

| Component | Where | What it is |
|-----------|-------|------------|
| **Data** | [`data/`](data/) | 33 tests (13 plate sinkage, 4 shear, 16 triaxial) in open formats — CSV, NumPy `.npz`, JSON metadata, and original `.pkl`. |
| **Python** | [`python/`](python/) | Analysis/plotting scripts, an exporter, a web-data builder, and a **PyQt desktop dashboard**. |
| **Web dashboard** | [`web_dashboard/`](web_dashboard/) | A **React + Vite** static dashboard (no backend) with the same interactive visualisations, deployable to GitHub Pages. |

---

## Repository structure

```text
paper-repository/
├── README.md                 # this file
├── LICENSE                   # CC-BY-4.0 (data + code + docs)
├── CITATION.cff              # how to cite (placeholders where metadata is TBD)
├── .gitignore                # ignores venv/ & node_modules/, KEEPS web_dashboard/dist/
├── plan.md                   # the migration plan for this archive
├── data/
│   ├── README.md             # data dictionary, formats, units, provenance
│   ├── raw/                  # deposited datasets (source of truth)
│   │   ├── plate_sinkage/    #   <original>.pkl, <type>.npz, metadata.csv/json, csv/
│   │   ├── shear/
│   │   └── triaxial/
│   └── processed/            # regenerated/derived outputs (reproducible)
│       ├── plate_sinkage/ · shear/ · triaxial/   # re-exported open formats
│       ├── figures/          # PNGs from the plotting scripts
│       └── web_json/         # decimated JSON consumed by the dashboard
├── python/
│   ├── README.md             # install + per-script usage
│   ├── requirements.txt
│   ├── scripts/              # paperdata.py, export_to_open_formats.py,
│   │                         # plot_*.py, build_web_data.py, dashboard_qt.py
│   └── notebooks/            # quickstart.ipynb
└── web_dashboard/
    ├── README.md             # dev / build / GitHub Pages deploy
    ├── package.json · vite.config.js · index.html
    ├── public/data/          # static JSON the app loads (also in data/processed/web_json)
    ├── src/                  # React components
    └── dist/                 # committed production build (runnable, no build step)
```

---

## Quick start

### Explore the data (no tools required)
Open any `data/raw/<type>/csv/*.csv` in a text editor or spreadsheet, or read
`data/raw/<type>/metadata.json`. See [`data/README.md`](data/README.md) for the
full data dictionary and units.

### Python
```bash
cd python
python -m venv .venv
# Windows:  .venv\Scripts\activate      # macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt

# regenerate the open formats from the .pkl sources (writes to data/processed/)
python scripts/export_to_open_formats.py

# static figures (headless) or interactive windows (omit --save)
python scripts/plot_plate_sinkage.py --save
python scripts/plot_shear.py --save
python scripts/plot_triaxial.py --save

# interactive PyQt desktop dashboard
python scripts/dashboard_qt.py
```
Details and load examples: [`python/README.md`](python/README.md).

### Web dashboard
```bash
cd web_dashboard
npm install
npm run dev      # local dev server with hot reload
npm run build    # produces the static site in web_dashboard/dist/
npm run preview  # serve the built dist/ locally to check it
```
The build is fully static (HTML/CSS/JS) and loads data from `public/data/*.json`
— **no backend server**. Details: [`web_dashboard/README.md`](web_dashboard/README.md).

---

## The two dashboards

The repository ships **two** equivalent interactive front-ends over the same
data, so you can use whichever fits your workflow:

- **`python/scripts/dashboard_qt.py`** — a **PyQt** desktop app that embeds the
  exact matplotlib figures with tabs, dropdowns, method filters, a point-count
  slider, and a data table.
- **`web_dashboard/`** — a **React + Vite** browser app (dark, Tailwind-styled)
  with the same visualisations (tabs per test type, dropdowns/multi-select,
  method filters, hover tooltips, tables, and client-side CSV download),
  compiled to a static site.

Both reproduce the published figures — pressure–sinkage (with the 100 kPa
nominal line and Force [kN] axis), shear-stress–displacement, and the triaxial
q–εₐ / q–p′ / e–p′ panels — with identical numbers, units, and scientific
meaning. Only the rendering medium differs.

> **Display note:** the web dashboard loads a *decimated* copy of each curve
> (≤ 2000 points, shape-preserving) for smooth rendering. It drops rows but never
> alters values. Full-resolution data is always in `data/raw/`.

---

## Deploying to GitHub Pages

The dashboard is configured with a **relative base path** (`base: './'` in
`vite.config.js`), so the committed `web_dashboard/dist/` works both at a
project subpath and when opened locally.

**Option A — publish the committed build directly:** point Pages at the
`web_dashboard/dist/` folder (e.g. via a GitHub Action that uploads it, or by
copying its contents to a `gh-pages` branch / `docs/` folder).

**Option B — build in CI:** run `npm ci && npm run build` in
`web_dashboard/` and deploy the resulting `dist/` with
`actions/deploy-pages`.

Because `dist/` is committed (and **not** git-ignored), a Zenodo release of this
repository already contains a runnable static dashboard — no build step needed.

---

## Preparing a Zenodo deposit

Include the whole `paper-repository/` (the committed `web_dashboard/dist/` makes
the dashboard runnable offline). The Zenodo DOI is
[10.5281/zenodo.17584462](https://doi.org/10.5281/zenodo.17584462). Remaining
before a tagged release:

1. Fill in the remaining `CITATION.cff` placeholders (repo URL, ORCIDs, confirm
   the author list and release date).
2. Tag a release so Zenodo captures a fixed version.

---

## How to cite

Please cite **both** the dataset and the journal article. See
[`CITATION.cff`](CITATION.cff). Dataset citation:

> Kruger, R. (2026). *Geotechnical Test Data Repository: Bevameter plate
> sinkage, shear tests, and triaxial tests* [Data set]. Zenodo.
> DOI: [10.5281/zenodo.17584462](https://doi.org/10.5281/zenodo.17584462)

---

## License

**CC-BY-4.0** — Creative Commons Attribution 4.0 International, covering the data,
code, and documentation. You may share and adapt the material, including
commercially, with attribution. See [`LICENSE`](LICENSE).

---

## Keywords

Terramechanics · Bevameter · Plate Sinkage · Soil Mechanics · Triaxial Test ·
Critical State Soil Mechanics · NorSand · Soil Shear Test · Experimental
Geotechnical Data · Sand Characterization.
