"""
Shared path + loading helpers for the geotechnical test-data archive.

All scripts in ``python/scripts/`` import from here so that data paths are
resolved relative to the repository root, regardless of the current working
directory. This keeps the scripts runnable from anywhere:

    python python/scripts/plot_shear.py
    cd python/scripts && python plot_shear.py

Directory layout resolved by this module::

    <repo>/data/raw/<type>/          # deposited datasets (source of truth)
        ├── <original>.pkl           # original Python objects (needs dill)
        ├── <type>.npz               # safe NumPy bundle
        ├── metadata.csv / .json     # per-test scalar properties + row counts
        └── csv/NN_<test_id>.csv     # one plain-text CSV per test
    <repo>/data/processed/<type>/    # regenerated open formats (pipeline output)

Nothing here modifies any data. Numerical values, units and scientific meaning
are preserved exactly.
"""

import csv
import json
import os

import numpy as np

# ---------------------------------------------------------------------------
# Path resolution: this file lives at <repo>/python/scripts/paperdata.py
# ---------------------------------------------------------------------------
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPTS_DIR, os.pardir, os.pardir))

DATA_DIR = os.path.join(REPO_ROOT, "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")

# The three test types and the pickle file name shipped for each.
PKL_NAME = {
    "plate_sinkage": "All_Bevameter_plate_sinkage_tests_data.pkl",
    "shear": "All_Bevameter_shear_test_data.pkl",
    "triaxial": "All_triaxial_tests_data.pkl",
}
TEST_TYPES = tuple(PKL_NAME.keys())

# Which CSV columns hold measured signal arrays for each type.
ARRAY_COLUMNS = {
    "plate_sinkage": ["sinkage", "pressure"],
    "shear": ["Displacement", "shear_stress"],
    "triaxial": ["axial_strain", "q", "p_prime", "e"],
}


def raw_type_dir(test_type):
    """Absolute path to ``data/raw/<test_type>/``."""
    return os.path.join(RAW_DIR, test_type)


def raw_pkl_path(test_type):
    """Absolute path to the original ``.pkl`` for a test type."""
    return os.path.join(raw_type_dir(test_type), PKL_NAME[test_type])


def load_pkl(test_type):
    """Load the original Python objects for a test type (requires ``dill``).

    Returns the list of test objects exactly as stored — no modification.
    """
    import dill  # local import so CSV-only workflows don't need dill

    with open(raw_pkl_path(test_type), "rb") as f:
        return dill.load(f)


def load_metadata(test_type):
    """Return the per-test metadata list (from ``metadata.json``)."""
    with open(os.path.join(raw_type_dir(test_type), "metadata.json"),
              encoding="utf-8") as f:
        return json.load(f)


def load_test_csv(test_type, csv_file):
    """Load one test's measured arrays from its plain-text CSV.

    ``csv_file`` is the value stored in metadata (e.g. ``"csv/01_TX2_CU200.csv"``).
    Returns a dict ``{column_name: np.ndarray(float)}``. Empty padding cells
    (written when arrays had unequal lengths) become ``NaN``.
    """
    path = os.path.join(raw_type_dir(test_type), csv_file)
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        headers = next(reader)
        cols = {h: [] for h in headers}
        for row in reader:
            for h, v in zip(headers, row):
                cols[h].append(float(v) if v != "" else np.nan)
    return {h: np.asarray(v, dtype=float) for h, v in cols.items()}


def iter_tests_from_csv(test_type):
    """Yield ``(meta_row, arrays_dict)`` for every test, read from open formats.

    Uses only ``metadata.json`` + the per-test CSVs, so no ``dill`` / custom
    classes are needed. This is the robust path used by the dashboard and the
    web-data builder.
    """
    for meta in load_metadata(test_type):
        yield meta, load_test_csv(test_type, meta["csv_file"])
