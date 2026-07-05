'''
Combined Plotting Script for Bevameter Shear Test Data
Source: data/raw/shear/All_Bevameter_shear_test_data.pkl

Run interactively:      python plot_shear.py
Save a PNG (headless):  python plot_shear.py --save

Citation:
R. Kruger, P. S. Els, and H. A. Hamersma. Experimental investigation of factors affecting the
characterisation of soil strength properties using a Bevameter in-situ plate sinkage and shear test
apparatus. Journal of Terramechanics, 109:45-62, 2023.
doi: 10.1016/j.jterra.2023.06.002

Data Structure:
list of PlotData objects
└── PlotData
    ├── Method (string)         : Shearing procedure
    ├── Normal_Stress (float)   : Applied normal stress [kPa]
    ├── shear_stress (ndarray)  : Measured shear stress [kPa]
    ├── Displacement (ndarray)  : Horizontal displacement [mm]
    ├── Density (float)         : Material density [kg/m³]
    └── Mod_asshto (string)     : Compaction energy marker

Compaction Method Reference:
Method 1: Loosest
Method 2: Low Compact
Method 3: Med Compact (~1390 kg/m³, ~77% Mod. AASHTO)
Method 4: High Compact (~1511 kg/m³, ~84% Mod. AASHTO)
Method 5: Densest (~1538 kg/m³, e=0.908, ~86% Mod. AASHTO)
'''

import os
import sys

SAVE = "--save" in sys.argv
if SAVE:
    import matplotlib
    matplotlib.use("Agg")

import numpy as np
import matplotlib.pyplot as plt

import paperdata


def trim(*arrays):
    L = min(len(a) for a in arrays)
    return [a[:L] for a in arrays]


# Load dataset (original Python objects, requires dill)
data_list = paperdata.load_pkl("shear")
print(f"Loaded {len(data_list)} Bevameter shear tests.")

# Setup combined figure
plt.close('all')
fig, ax = plt.subplots(figsize=(10, 7))

# Use a colormap for variety
colors = plt.cm.viridis(np.linspace(0, 1, len(data_list)))

# Plot all tests
for i, test in enumerate(data_list):
    disp, tau = trim(test.Displacement, test.shear_stress)

    # Create descriptive label
    label = f"{test.Method} | σ_n={test.Normal_Stress} kPa | {test.Density} kg/m³"

    ax.plot(disp, tau, label=label, linewidth=1.5, color=colors[i], alpha=0.9)

# Formatting
ax.set_title("Bevameter Shear Tests: Shear Stress vs. Displacement", fontsize=14, fontweight='bold', pad=15)
ax.set_xlabel("Displacement [mm]", fontsize=12)
ax.set_ylabel("Shear Stress [kPa]", fontsize=12)
ax.grid(True, which="both", ls="--", alpha=0.6)
ax.set_xlim(0, max(max(t.Displacement) for t in data_list))
ax.set_ylim(0, None)

# Professional Legend
ax.legend(title="Compaction State | Normal Stress | Density",
          bbox_to_anchor=(1.05, 1), loc='upper left', fontsize=9)

plt.tight_layout()

if SAVE:
    out_dir = os.path.join(paperdata.PROCESSED_DIR, "figures")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "shear.png")
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    print(f"Saved {out_path}")
else:
    plt.show()
