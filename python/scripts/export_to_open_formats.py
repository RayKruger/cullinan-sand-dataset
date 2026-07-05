"""
Export the Bevameter / triaxial pickle datasets to open, archival formats.

Why: the .pkl (dill) files require the exact Python classes + dill + a
compatible numpy to load, are unreadable outside Python, and execute code on
load. This script re-exports the SAME data as:

  * one CSV per test            -> plain text, opens in any language / text editor
  * a metadata table (CSV+JSON) -> the per-test scalar properties + row counts
  * one compressed .npz per dataset -> safe NumPy binary (no custom classes,
      no code execution on load), convenient for Python/NumPy users

Source of truth (read-only):   <repo>/data/raw/<type>/<original>.pkl
Regenerated outputs (written): <repo>/data/processed/<type>/

    data/processed/<type>/
    ├── <type>.npz            (all tests + metadata, one NumPy file)
    ├── metadata.csv / .json  (per-test scalar properties + row counts)
    └── csv/                  (one CSV per test: the measured arrays)
        └── NN_<test_id>.csv

The export is additive: it never modifies or deletes the source .pkl files, and
never touches data/raw/. Re-running it reproduces (bit-for-bit) the open formats
that ship in data/raw/, demonstrating the raw -> processed pipeline.

Dependencies: numpy + dill only (both already required by the repo).
No pandas / Excel needed.

Usage:
    python export_to_open_formats.py
"""

import csv
import json
import os
import re

import dill
import numpy as np

import paperdata  # shared repo paths (data/raw, data/processed)

# Each test TYPE lives in its own folder <RAW_DIR>/<key>/.
#   pkl     = source pickle inside data/raw/<key>/
#   arrays  = attributes written as CSV columns (the measured signals)
#   scalars = per-test single values written into the metadata table
DATASETS = {
    "plate_sinkage": {
        "pkl": paperdata.PKL_NAME["plate_sinkage"],
        "id_attr": "name",
        "arrays": ["sinkage", "pressure"],
        "scalars": ["name", "original_name", "method", "dry_density",
                    "void_ratio", "mod_procter"],
    },
    "shear": {
        "pkl": paperdata.PKL_NAME["shear"],
        "id_attr": None,  # PlotData has no unique name -> build one
        "arrays": ["Displacement", "shear_stress"],
        "scalars": ["Method", "Normal_Stress", "Density", "Mod_asshto"],
    },
    "triaxial": {
        "pkl": paperdata.PKL_NAME["triaxial"],
        "id_attr": "name",
        "arrays": ["axial_strain", "q", "p_prime", "e", "eta", "dilatancy"],
        "scalars": ["name"],
    },
}


def slug(text):
    """Filesystem-safe token from a test name, e.g. 'TX2 CU200' -> 'TX2_CU200'."""
    s = re.sub(r"[^A-Za-z0-9._-]+", "_", str(text)).strip("_")
    return s or "test"


def as_scalar(value):
    """JSON/CSV-friendly scalar; numpy types -> Python types, None stays None."""
    if value is None:
        return None
    if isinstance(value, np.generic):
        return value.item()
    return value


def write_test_csv(path, columns):
    """columns = list of (header, ndarray-or-None). Unequal lengths are padded
    with '' so no data is silently trimmed."""
    present = [(h, np.asarray(a).ravel()) for h, a in columns if a is not None]
    if not present:
        return 0
    n = max(len(a) for _, a in present)
    headers = [h for h, _ in present]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(headers)
        for i in range(n):
            w.writerow(["" if i >= len(a) else a[i] for _, a in present])
    return n


def export_dataset(key, spec):
    # Read the immutable source from data/raw/<key>/, write to data/processed/<key>/.
    src_dir = paperdata.raw_type_dir(key)
    out_dir = os.path.join(paperdata.PROCESSED_DIR, key)
    csv_dir = os.path.join(out_dir, "csv")
    os.makedirs(csv_dir, exist_ok=True)

    pkl_path = os.path.join(src_dir, spec["pkl"])
    with open(pkl_path, "rb") as f:
        tests = dill.load(f)

    meta_rows = []
    npz_arrays = {}  # keys like "01_TX2_CU200__q" -> ndarray
    for idx, t in enumerate(tests, start=1):
        attrs = vars(t)

        # Build a stable test id.
        if spec["id_attr"] and getattr(t, spec["id_attr"], None):
            test_id = str(getattr(t, spec["id_attr"]))
        else:
            method = attrs.get("Method", key)
            sig = attrs.get("Normal_Stress", "")
            test_id = f"{method}_sn{sig}_test{idx}"

        stem = f"{idx:02d}_{slug(test_id)}"
        csv_name = f"{stem}.csv"
        cols = [(a, attrs.get(a)) for a in spec["arrays"] if a in attrs]
        n_rows = write_test_csv(os.path.join(csv_dir, csv_name), cols)

        # Same arrays into the per-dataset .npz bundle (prefixed by test).
        for a, arr in cols:
            if arr is not None:
                npz_arrays[f"{stem}__{a}"] = np.asarray(arr)

        row = {"test_id": test_id, "csv_file": f"csv/{csv_name}", "n_rows": n_rows}
        for s in spec["scalars"]:
            if s in attrs:
                row[s] = as_scalar(attrs[s])
        meta_rows.append(row)

    # One compressed .npz per dataset: every test's arrays plus the metadata
    # table (as a JSON string) so the file is self-describing. Load with
    #   z = np.load("<type>.npz", allow_pickle=False)
    #   z["01_TX2_CU200__q"]; json.loads(str(z["_metadata_json"]))
    npz_arrays["_metadata_json"] = np.array(json.dumps(meta_rows))
    np.savez_compressed(os.path.join(out_dir, f"{key}.npz"), **npz_arrays)

    # Metadata as CSV (union of keys, stable order) ...
    fieldnames = []
    for r in meta_rows:
        for k in r:
            if k not in fieldnames:
                fieldnames.append(k)
    with open(os.path.join(out_dir, "metadata.csv"), "w", newline="",
              encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(meta_rows)

    # ... and as JSON (nice for programmatic reuse).
    with open(os.path.join(out_dir, "metadata.json"), "w",
              encoding="utf-8") as f:
        json.dump(meta_rows, f, indent=2)

    rel = os.path.relpath(out_dir, paperdata.REPO_ROOT).replace(os.sep, "/")
    print(f"[{key:13s}] {len(tests):2d} tests -> {rel}/csv/  "
          f"(+ metadata.csv/.json  + {key}.npz)")
    return len(tests)


def main():
    total = sum(export_dataset(k, s) for k, s in DATASETS.items())
    print(f"\nDone. {total} tests exported into per-type folders under:\n"
          f"  {paperdata.PROCESSED_DIR}")
    print("Source .pkl files in data/raw/ were not modified.")


if __name__ == "__main__":
    main()
