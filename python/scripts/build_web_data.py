"""
Build the static JSON that the web dashboard (web_dashboard/) loads.

The raw per-test CSVs contain up to ~180,000 rows each (~45 MB total) — far too
much to ship to a browser and draw as SVG/canvas lines. This script produces a
compact, **decimated-for-display** copy:

  * each test's arrays are reduced to at most ``MAX_POINTS`` samples using the
    Largest-Triangle-Three-Buckets (LTTB) algorithm, which preserves the visual
    shape of the curve (peaks, kinks, critical-state tails) far better than
    naive striding;
  * scalar metadata (method, density, normal stress, …) is carried through
    unchanged;
  * everything is written as JSON under two locations:
      - web_dashboard/public/data/   (consumed by the React app at build time)
      - data/processed/web_json/     (archived copy of the same product)

IMPORTANT — scientific integrity:
  This is a DISPLAY-ONLY derivative. It decimates (drops rows) but never alters
  the values it keeps: no smoothing, rescaling, unit change or rounding beyond
  JSON float formatting. The full-resolution record stays in data/raw/ (CSV,
  NPZ, PKL). The dashboard labels its curves as decimated for display.

Reads only the open formats (metadata.json + csv/*.csv) — no dill required.

Usage:
    python build_web_data.py               # default MAX_POINTS
    python build_web_data.py --points 3000 # override sample budget
"""

import json
import os
import sys

import numpy as np

import paperdata

# Default per-test display budget. ~2000 points per curve is smooth on screen
# while keeping each dataset's JSON small.
MAX_POINTS = 2000
if "--points" in sys.argv:
    MAX_POINTS = int(sys.argv[sys.argv.index("--points") + 1])

# Output locations.
WEB_PUBLIC_DATA = os.path.join(
    paperdata.REPO_ROOT, "web_dashboard", "public", "data")
PROCESSED_WEB_JSON = os.path.join(paperdata.PROCESSED_DIR, "web_json")

# Human-facing axis labels + units for the dashboard (single source of truth).
TYPE_INFO = {
    "plate_sinkage": {
        "title": "Plate Sinkage",
        "x": {"key": "sinkage", "label": "Sinkage", "unit": "mm"},
        "series": [
            {"key": "pressure", "label": "Pressure", "unit": "kPa"},
        ],
        "group_by": "method",
    },
    "shear": {
        "title": "Bevameter Shear",
        "x": {"key": "Displacement", "label": "Displacement", "unit": "mm"},
        "series": [
            {"key": "shear_stress", "label": "Shear stress", "unit": "kPa"},
        ],
        "group_by": "Method",
    },
    "triaxial": {
        "title": "Triaxial Compression",
        # Triaxial has several linked panels; x differs per panel, declared here.
        "panels": [
            {"id": "q_eps", "x": "axial_strain", "y": "q",
             "x_label": "Axial strain [-]", "y_label": "q [kPa]", "logx": False},
            {"id": "q_p",   "x": "p_prime",     "y": "q",
             "x_label": "p′ [kPa]", "y_label": "q [kPa]", "logx": False},
            {"id": "e_p",   "x": "p_prime",     "y": "e",
             "x_label": "p′ [kPa]", "y_label": "Void ratio e [-]", "logx": True},
        ],
        "group_by": "name",
    },
}


def lttb(x, y, n_out):
    """Largest-Triangle-Three-Buckets downsampling.

    Returns indices (sorted) selecting <= n_out points from the x/y series while
    preserving the visual shape. If the series already fits, returns all indices.
    Values at the kept indices are returned verbatim (never averaged/altered).
    """
    n = len(x)
    if n_out >= n or n_out < 3:
        return np.arange(n)

    # Drop NaNs consistently first (keeps x/y aligned).
    finite = np.isfinite(x) & np.isfinite(y)
    idx_all = np.nonzero(finite)[0]
    if len(idx_all) <= n_out:
        return idx_all
    xf = x[idx_all]
    yf = y[idx_all]
    m = len(xf)

    sampled = [0]  # always keep first
    bucket_size = (m - 2) / (n_out - 2)
    a = 0  # index (into filtered arrays) of the last selected point
    for i in range(n_out - 2):
        # Next bucket boundaries.
        start = int(np.floor((i + 1) * bucket_size)) + 1
        end = int(np.floor((i + 2) * bucket_size)) + 1
        end = min(end, m)
        # Average point of the next bucket (the third triangle vertex).
        avg_start = int(np.floor((i + 1) * bucket_size)) + 1
        avg_end = min(int(np.floor((i + 2) * bucket_size)) + 1, m)
        if avg_end <= avg_start:
            avg_end = min(avg_start + 1, m)
        avg_x = xf[avg_start:avg_end].mean()
        avg_y = yf[avg_start:avg_end].mean()

        # Point range for this bucket.
        rng_lo = int(np.floor(i * bucket_size)) + 1
        rng_hi = min(int(np.floor((i + 1) * bucket_size)) + 1, m)
        ax_, ay_ = xf[a], yf[a]
        # Choose the bucket point forming the largest triangle.
        best_area = -1.0
        best = rng_lo
        for j in range(rng_lo, rng_hi):
            area = abs((ax_ - avg_x) * (yf[j] - ay_)
                       - (ax_ - xf[j]) * (avg_y - ay_))
            if area > best_area:
                best_area = area
                best = j
        sampled.append(best)
        a = best
    sampled.append(m - 1)  # always keep last
    return idx_all[np.array(sampled)]


def clean_list(arr):
    """ndarray -> list of floats/None (JSON-safe; NaN -> None)."""
    return [None if not np.isfinite(v) else float(v) for v in arr]


def build_type(test_type):
    info = TYPE_INFO[test_type]
    meta = paperdata.load_metadata(test_type)

    tests_out = []
    for row in meta:
        arrays = paperdata.load_test_csv(test_type, row["csv_file"])

        # Decimate on the primary x/y pair for this type, then apply the SAME
        # kept indices to every column so all series stay row-aligned.
        if test_type == "triaxial":
            x_key = "axial_strain"
            y_key = "q"
        else:
            x_key = info["x"]["key"]
            y_key = info["series"][0]["key"]

        x = arrays[x_key]
        y = arrays[y_key]
        keep = lttb(x, y, MAX_POINTS)

        columns = {k: clean_list(v[keep]) for k, v in arrays.items()}

        # Scalar metadata: everything in the metadata row except bookkeeping.
        scalars = {k: v for k, v in row.items()
                   if k not in ("csv_file",)}

        tests_out.append({
            "test_id": row["test_id"],
            "csv_file": row["csv_file"],          # link back to full-res CSV
            "n_rows_full": row.get("n_rows"),
            "n_points": len(keep),
            "scalars": scalars,
            "columns": columns,
        })

    out = {
        "type": test_type,
        "title": info["title"],
        "group_by": info.get("group_by"),
        "axes": {k: info[k] for k in ("x", "series", "panels") if k in info},
        "max_points": MAX_POINTS,
        "decimated": True,
        "note": ("Curves are decimated (LTTB) for display only; full-resolution "
                 "data is in data/raw/%s/." % test_type),
        "n_tests": len(tests_out),
        "tests": tests_out,
    }
    return out


def main():
    os.makedirs(WEB_PUBLIC_DATA, exist_ok=True)
    os.makedirs(PROCESSED_WEB_JSON, exist_ok=True)

    index = []
    for test_type in paperdata.TEST_TYPES:
        payload = build_type(test_type)
        fname = f"{test_type}.json"
        for dest in (WEB_PUBLIC_DATA, PROCESSED_WEB_JSON):
            with open(os.path.join(dest, fname), "w", encoding="utf-8") as f:
                json.dump(payload, f, separators=(",", ":"))
        index.append({
            "type": test_type,
            "title": payload["title"],
            "file": fname,
            "n_tests": payload["n_tests"],
        })
        print(f"[{test_type:13s}] {payload['n_tests']:2d} tests -> {fname} "
              f"(<= {MAX_POINTS} pts/test)")

    for dest in (WEB_PUBLIC_DATA, PROCESSED_WEB_JSON):
        with open(os.path.join(dest, "index.json"), "w", encoding="utf-8") as f:
            json.dump({"datasets": index, "max_points": MAX_POINTS}, f, indent=2)

    print(f"\nWrote web JSON to:\n  {WEB_PUBLIC_DATA}\n  {PROCESSED_WEB_JSON}")


if __name__ == "__main__":
    main()
