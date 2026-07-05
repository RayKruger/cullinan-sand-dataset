"""
Per-test plotting script for triaxial compression data.
Source: data/raw/triaxial/All_triaxial_tests_data.pkl

For every test it draws three panels:
  1. q vs axial strain
  2. q vs p'         (stress path)
  3. e vs p'         (semilog-x, critical-state view)

Run interactively:      python plot_triaxial.py
Save PNGs (headless):   python plot_triaxial.py --save   (one PNG per test)

Units and scientific meaning are unchanged from the original figures.
"""

import os
import sys

SAVE = "--save" in sys.argv
if SAVE:
    import matplotlib
    matplotlib.use("Agg")

import numpy as np
import matplotlib.pyplot as plt

import paperdata


# -----------------------------------------------------------------------------
# Helper to trim mismatched arrays within each test
# -----------------------------------------------------------------------------
def trim(*arrays):
    L = min(len(a) for a in arrays)
    return [a[:L] for a in arrays]


# -----------------------------------------------------------------------------
# Load dataset (original Python objects, requires dill)
# -----------------------------------------------------------------------------
data_list = paperdata.load_pkl("triaxial")
print(f"Loaded {len(data_list)} tests.")


# =============================================================================
# Example of the data layout
# =============================================================================
class TriaxialTest:
    def __init__(self, name, axial_strain, q, p_prime, e,
                 dilatancy=None, eta=None):

        # Basic metadata
        self.name = name                      # e.g. "TX16"

        # Raw experimental arrays
        self.axial_strain = np.array(axial_strain)
        self.q = np.array(q)
        self.p_prime = np.array(p_prime)
        self.e = np.array(e)

        # Optional arrays (may be None)
        self.dilatancy = None if dilatancy is None else np.array(dilatancy)
        self.eta = None if eta is None else np.array(eta)


# -----------------------------------------------------------------------------
# Plot each test individually
# -----------------------------------------------------------------------------
if SAVE:
    out_dir = os.path.join(paperdata.PROCESSED_DIR, "figures", "triaxial")
    os.makedirs(out_dir, exist_ok=True)

for i, test in enumerate(data_list):

    print(f"Plotting: {test.name}")

    fig, axes = plt.subplots(1, 3, figsize=(16, 4))
    ax1, ax2, ax3 = axes

    # ---------------------------------------------------------------
    # 1. axial strain vs q
    # ---------------------------------------------------------------
    axial_strain_trim, q_trim = trim(test.axial_strain, test.q)
    ax1.plot(axial_strain_trim, q_trim, 'b-')
    ax1.set_title(f"{test.name} — q vs axial strain")
    ax1.set_xlabel("Axial Strain [-]")
    ax1.set_ylabel("q [kPa]")
    ax1.grid(True)

    # ---------------------------------------------------------------
    # 2. p' vs q
    # ---------------------------------------------------------------
    p_trim, q_trim = trim(test.p_prime, test.q)
    ax2.plot(p_trim, q_trim, 'r-')
    ax2.set_title(f"{test.name} — q vs p′")
    ax2.set_xlabel("p′ [kPa]")
    ax2.set_ylabel("q [kPa]")
    ax2.grid(True)

    # ---------------------------------------------------------------
    # 3. e vs p'
    # ---------------------------------------------------------------
    p_trim, e_trim = trim(test.p_prime, test.e)
    ax3.semilogx(p_trim, e_trim, 'g-')
    ax3.set_title(f"{test.name} — e vs p′")
    ax3.set_xlabel("p′ [kPa]")
    ax3.set_ylabel("Void Ratio e [-]")
    ax3.grid(True)

    plt.suptitle(test.name, fontsize=14)
    plt.tight_layout()

    if SAVE:
        safe = "".join(c if c.isalnum() else "_" for c in str(test.name)).strip("_")
        out_path = os.path.join(out_dir, f"{i+1:02d}_{safe}.png")
        fig.savefig(out_path, dpi=130)
        plt.close(fig)

if SAVE:
    print(f"Saved {len(data_list)} figures -> {out_dir}")
else:
    plt.show()
