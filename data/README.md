# Data

Experimental geotechnical test data on sand, from **Kruger et al. (2023)**
(Bevameter tests) and companion triaxial tests. Three test types, all
self-contained and provided in several open, redundant formats.

```
data/
├── raw/          # deposited datasets — the source of truth (do not edit)
│   ├── plate_sinkage/   (13 tests)
│   ├── shear/           (4 tests)
│   └── triaxial/        (16 tests)
└── processed/    # regenerated / derived outputs (reproducible; safe to delete)
    ├── plate_sinkage/   # open formats re-exported from raw/*.pkl
    ├── shear/
    ├── triaxial/
    ├── figures/         # PNGs from the plot_*.py scripts (--save)
    └── web_json/        # decimated JSON copy used by the web dashboard
```

## raw/ vs processed/

- **`raw/`** is the immutable, as-deposited record. For each type it holds the
  original Python objects **and** open formats derived from them (kept in `raw/`
  so the deposit is usable without running any code):

  ```
  raw/<type>/
  ├── <original>.pkl        # original Python objects (kept; needs Python + dill)
  ├── <type>.npz            # safe NumPy bundle of the SAME data (allow_pickle=False)
  ├── metadata.csv / .json  # per-test scalar properties + row counts
  └── csv/NN_<test_id>.csv  # one plain-text CSV per test (the measured arrays)
  ```

  The original **`.pkl` is kept** for provenance/reproducibility, and the
  **`.npz`** is provided alongside it as a safe, language-friendly equivalent.

- **`processed/`** is produced by the scripts in `../python/scripts/` and can be
  regenerated at any time:
  - `export_to_open_formats.py` reads `raw/<type>/<original>.pkl` and re-writes
    the open formats into `processed/<type>/` (a bit-for-bit round-trip of what
    ships in `raw/`, demonstrating the pipeline).
  - `plot_*.py --save` writes figures into `processed/figures/`.
  - `build_web_data.py` writes the dashboard JSON into `processed/web_json/`
    (and into `../web_dashboard/public/data/`).

Nothing in `processed/` is a new measurement — it is all derived from `raw/`.

## Formats and when to use each

| Format | Location | Best for |
|--------|----------|----------|
| CSV (plain text) | `raw/<type>/csv/*.csv` + `raw/<type>/metadata.csv` | Any language/tool, human-readable, long-term archival. *Not* an Excel file. |
| NumPy bundle | `raw/<type>/<type>.npz` | Python/NumPy users — safe (`allow_pickle=False`), compact, exact. |
| JSON metadata | `raw/<type>/metadata.json` | Programmatic access to per-test scalar properties. |
| Python objects | `raw/<type>/*.pkl` | Legacy/original; requires Python + `dill`. Kept for reproducibility. |
| Decimated JSON | `processed/web_json/*.json` | The web dashboard (display-only, downsampled). |

All formats are generated from the `.pkl` sources and contain identical values
(verified as a bit-for-bit round-trip). See `../python/README.md` for load
examples.

## Data dictionary (columns, units, scalars)

Units are preserved exactly and must not be changed.

### plate_sinkage (13 tests)
- **CSV columns:** `sinkage` [mm], `pressure` [kPa]
- **Per-test scalars:** `name`, `original_name`, `method`, `dry_density` [kg/m³],
  `void_ratio` [-], `mod_procter` [%]
- A circular plate is loaded vertically into the soil; pressure vs sinkage.
- **Compaction methods** (color/label convention used by the plots & dashboards):

  | Method | Description | Dry density [kg/m³] | Void ratio e₀ | Mod. AASHTO |
  |:------:|:------------|:--------------------|:--------------|:------------|
  | 1 | Loosest | N/A | N/A | N/A |
  | 2 | Low Compact | N/A | N/A | N/A |
  | 3 | Med Compact | 1390 | N/A | ~77% |
  | 4 | High Compact | 1511 | N/A | ~84% |
  | 5 | Densest | 1538 | 0.908 | ~86% |

  Plots also show a 100 kPa *nominal vehicle ground-pressure* line and a
  secondary Force [kN] axis (Force = pressure × 0.018).

### shear (4 tests)
- **CSV columns:** `Displacement` [mm], `shear_stress` [kPa]
- **Per-test scalars:** `Method`, `Normal_Stress` [kPa], `Density` [kg/m³],
  `Mod_asshto`
- Soil sheared under constant normal stress; shear stress vs horizontal
  displacement.

### triaxial (16 tests)
- **CSV columns:** `axial_strain` [-], `q` [kPa], `p_prime` [kPa], `e` [-]
- **Per-test scalars:** `name`
- Axisymmetric compression; used for stress–strain, dilatancy, and critical-state
  parameters. Standard views: q–εₐ, q–p′ (stress path), and e–p′ (log-x).

## Quick load examples

```python
import csv, json
import numpy as np

# per-test metadata (one row per test)
meta = json.load(open("raw/triaxial/metadata.json"))

# one test's arrays from CSV (any language) ...
rows = list(csv.DictReader(open("raw/triaxial/" + meta[0]["csv_file"])))
q = [float(r["q"]) for r in rows]

# ... or the whole dataset from the safe NumPy bundle (no code execution)
z = np.load("raw/triaxial/triaxial.npz", allow_pickle=False)
q0 = z["01_TX2_CU200__q"]
meta_from_npz = json.loads(str(z["_metadata_json"]))
```

## Integrity note

The **decimated** JSON in `processed/web_json/` and
`../web_dashboard/public/data/` is for on-screen rendering only: it drops rows
(Largest-Triangle-Three-Buckets) but never alters the values it keeps — no
smoothing, rescaling, or unit changes. Always use `raw/` for analysis.

## Reference

R. Kruger, P. S. Els, and H. A. Hamersma. *Experimental investigation of factors
affecting the characterisation of soil strength properties using a Bevameter
in-situ plate sinkage and shear test apparatus.* Journal of Terramechanics,
109:45–62, 2023. https://doi.org/10.1016/j.jterra.2023.06.002
