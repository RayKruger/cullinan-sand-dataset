# Python tools for the geotechnical test-data archive

Python utilities for loading, plotting and exploring the deposited Bevameter and
triaxial test datasets. Everything reads from the archive at `../data/raw/` and
writes any derivatives to `../data/processed/` — the raw data is never modified,
and no numerical value, unit or scientific meaning is altered.

There are two interactive dashboards over the same data:

- **`scripts/dashboard_qt.py`** — a PyQt5 desktop app (this folder).
- **`../web_dashboard`** — a React web app. The Qt dashboard is its desktop
  counterpart and shows the same three figures.

## Contents

```
python/
├── requirements.txt         # all dependencies for the scripts + dashboard + notebook
├── README.md                # this file
├── scripts/
│   ├── paperdata.py               # shared path + loading helper (import this)
│   ├── export_to_open_formats.py  # .pkl  ->  CSV / NPZ / metadata (raw -> processed)
│   ├── plot_plate_sinkage.py      # pressure vs sinkage figure
│   ├── plot_shear.py              # shear stress vs displacement figure
│   ├── plot_triaxial.py           # per-test triaxial 3-panel figures
│   ├── build_web_data.py          # decimated JSON for the web dashboard
│   └── dashboard_qt.py            # interactive PyQt5 desktop dashboard
└── notebooks/
    └── quickstart.ipynb           # load + plot all 3 types from the open formats
```

## Environment setup

Python 3.12 with a virtual environment is recommended.

```bash
# from the python/ directory
python -m venv .venv

# activate it
.venv\Scripts\activate        # Windows (PowerShell / cmd)
source .venv/bin/activate     # macOS / Linux

pip install -r requirements.txt
```

`requirements.txt` pulls in `numpy`, `dill`, `matplotlib`, `pandas`, `scipy`,
`PyQt5` and `notebook` — enough for every script here, the Qt dashboard and the
notebook. Only the legacy `.pkl` loader needs `dill`; the CSV / NPZ workflows do
not.

## Data formats

The archive ships each test type in several redundant formats under
`../data/raw/<type>/` (`<type>` is `plate_sinkage`, `shear` or `triaxial`):

| File | What it is | How to read it |
| --- | --- | --- |
| `csv/NN_<test_id>.csv` | one plain-text CSV per test (the measured signal arrays) | any language / `paperdata.load_test_csv` |
| `<type>.npz` | one compressed NumPy bundle: every test's arrays + a `_metadata_json` string | `np.load(path, allow_pickle=False)` |
| `metadata.csv` / `metadata.json` | per-test scalar properties + row counts | `paperdata.load_metadata` |
| `<original>.pkl` | legacy original Python objects | `paperdata.load_pkl` (needs `dill`) |

### CSV columns and units per type

- **plate_sinkage** — `sinkage` [mm], `pressure` [kPa].
  Plot pressure (y) vs sinkage (x). Group / colour by compaction `method`
  (`1..5` or `"Method 1".."Method 5"`). A nominal ground-pressure line sits at
  100 kPa; a secondary axis shows Force [kN] = pressure × 0.018.
- **shear** — `Displacement` [mm], `shear_stress` [kPa].
  Plot shear_stress (y) vs Displacement (x); label each test
  `{Method} | σ_n={Normal_Stress} kPa | {Density} kg/m³`.
- **triaxial** — `axial_strain` [-], `q` [kPa], `p_prime` [kPa], `e` [-].
  Three linked panels per test: (1) q vs axial_strain, (2) q vs p′
  (stress path), (3) e vs p′ with a **log x-axis** (critical-state view).

Empty padding cells in a CSV (written where a test's arrays had unequal lengths)
are read back as `NaN`.

### Safe NumPy bundle (`.npz`)

```python
import json
import numpy as np

z = np.load("../data/raw/triaxial/triaxial.npz", allow_pickle=False)
q = z["01_TX2_CU200__q"]                 # one test's array by key
meta = json.loads(str(z["_metadata_json"]))  # embedded metadata table
```

`allow_pickle=False` means no code executes on load — unlike the `.pkl` files,
which require the original classes and `dill`. Prefer the CSV / NPZ formats for
reuse and long-term readability.

## The `paperdata.py` helper

All scripts import `paperdata` so that data paths resolve relative to the
repository root regardless of the current working directory. Key API:

```python
import paperdata

paperdata.TEST_TYPES        # ("plate_sinkage", "shear", "triaxial")
paperdata.ARRAY_COLUMNS     # {type: [column names holding measured arrays]}
paperdata.REPO_ROOT         # absolute repo root
paperdata.RAW_DIR           # <repo>/data/raw
paperdata.PROCESSED_DIR     # <repo>/data/processed

paperdata.load_metadata(test_type)         # -> list of per-test dicts
paperdata.load_test_csv(test_type, csv)    # -> {column: np.ndarray(float)}  (NaN padding)
paperdata.iter_tests_from_csv(test_type)   # -> yields (meta_row, arrays_dict)  (no dill)
paperdata.load_pkl(test_type)              # -> original objects (needs dill)
```

`load_test_csv` takes the `csv_file` value stored in each metadata row
(e.g. `"csv/01_TX2_CU200.csv"`).

## Running the scripts

Run any script from the repository root or from inside `scripts/` — paths
resolve either way.

### Export the open formats

Re-generates the CSV / NPZ / metadata under `../data/processed/<type>/` from the
source `.pkl` files (demonstrates the raw → processed pipeline). Needs `dill`.

```bash
python scripts/export_to_open_formats.py
```

### Static plotting scripts

Each opens an interactive window, or writes a PNG headlessly with `--save`
(into `../data/processed/figures/`):

```bash
python scripts/plot_plate_sinkage.py           # interactive
python scripts/plot_plate_sinkage.py --save     # headless PNG

python scripts/plot_shear.py [--save]
python scripts/plot_triaxial.py [--save]         # one PNG per test in --save mode
```

### Build the web-dashboard data

Writes decimated-for-display JSON (LTTB, ≤ 2000 points per curve by default)
consumed by `../web_dashboard`. Reads only the open formats — no `dill`.

```bash
python scripts/build_web_data.py                 # default point budget
python scripts/build_web_data.py --points 3000   # override
```

### Interactive Qt desktop dashboard

```bash
python scripts/dashboard_qt.py
```

A PyQt5 window with one tab per test type (Plate Sinkage, Shear, Triaxial). Each
tab embeds a matplotlib canvas + navigation toolbar and a control panel:

- **Plate Sinkage** — multi-select the compaction methods to show, toggle the
  100 kPa nominal line, and set a max-points-per-curve slider. Reproduces the
  method colours and the Force [kN] secondary axis.
- **Shear** — multi-select the tests (viridis colours, full legend) with a
  point-count slider.
- **Triaxial** — pick one test to draw the three linked panels
  (q–εₐ, q–p′, e–p′ log-x), plus a table of the first ~200 rows.

The point-count slider re-decimates the curves for smooth interaction. The
decimation is **display-only** (evenly-spaced indices, NaN padding dropped) and
never alters the kept values. The app loads only the open formats, so `dill` is
not needed at runtime.

## The quickstart notebook

`notebooks/quickstart.ipynb` walks through loading and minimally plotting all
three test types from the **open formats** (no `dill`): reading `metadata.json`,
loading a test's CSV via `paperdata`, plotting plate pressure–sinkage, shear
stress–displacement and triaxial q–εₐ, and the safe `.npz` load path
(`np.load(..., allow_pickle=False)` + reading `_metadata_json`).

```bash
pip install notebook        # already in requirements.txt
jupyter notebook notebooks/quickstart.ipynb
```
