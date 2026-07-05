"""
Combined plotting script for Bevameter plate-sinkage data.

Reproduces the published pressure-vs-sinkage figure: every test coloured by its
compaction method, the 100 kPa nominal vehicle ground-pressure line, a secondary
Force [kN] axis (100 kPa -> 1.8 kN, factor 0.018) and the annotations.

Run interactively:      python plot_plate_sinkage.py
Save a PNG (headless):  python plot_plate_sinkage.py --save

Numbers, units, colours and annotations are unchanged from the original figure.

Reference:
R. Kruger, P. S. Els, and H. A. Hamersma. "Experimental investigation of
factors affecting the characterisation of soil strength properties using a
Bevameter in-situ plate sinkage and shear test apparatus."
Journal of Terramechanics, 109:45-62, 2023. doi:10.1016/j.jterra.2023.06.002.
"""

import os
import sys

# Headless save mode must select the Agg backend before importing pyplot.
SAVE = "--save" in sys.argv
if SAVE:
    import matplotlib
    matplotlib.use("Agg")

import matplotlib.pyplot as plt

import paperdata


# -----------------------------------------------------------------------------
def trim(*arrays):
    L = min(len(a) for a in arrays)
    return [a[:L] for a in arrays]


# -----------------------------------------------------------------------------
# Load dataset (original Python objects, requires dill)
# -----------------------------------------------------------------------------
data_list = paperdata.load_pkl("plate_sinkage")
print(f"Loaded {len(data_list)} plate sinkage tests.")

# -----------------------------------------------------------------------------
# Formatting and Color Mapping
# -----------------------------------------------------------------------------
method_styles = {
    "Method 1": {"color": "green",   "label": "Method 1 (Loosest)", "method_id": "Method 1"},
    "Method 2": {"color": "magenta", "label": "Method 2 (Low Compact)", "method_id": "Method 2"},
    "Method 3": {"color": "blue",    "label": "Method 3, 1390kg/m³ (~77% Mod. AASHTO)", "method_id": "Method 3"},
    "Method 4": {"color": "black",   "label": "Method 4, 1511kg/m³ (~84% Mod. AASHTO)", "method_id": "Method 4"},
    "Method 5": {"color": "red",     "label": "Method 5, 1538kg/m³ (~86% Mod. AASHTO), e=0.908", "method_id": "5"},
}

# Also handle potential variations in method ID strings
id_to_method = {
    "1": "Method 1", "Method 1": "Method 1",
    "2": "Method 2", "Method 2": "Method 2",
    "3": "Method 3", "Method 3": "Method 3",
    "4": "Method 4", "Method 4": "Method 4",
    "5": "Method 5", "Method 5": "Method 5"
}

# -----------------------------------------------------------------------------
# Plotting
# -----------------------------------------------------------------------------
fig, ax1 = plt.subplots(figsize=(10, 6))

# Process and Plot each test
for test in data_list:
    method_key = id_to_method.get(str(test.method), "Unknown")
    style = method_styles.get(method_key, {"color": "grey", "label": f"Unknown {test.method}"})

    pressure, sinkage = trim(test.pressure, test.sinkage)

    # We only want one legend entry per method type
    # We'll use a hack to ensure legend doesn't duplicate
    current_label = style["label"]
    if any(h.get_label() == current_label for h in ax1.get_legend_handles_labels()[0]):
        current_label = None

    ax1.plot(sinkage, pressure, color=style["color"], label=current_label, linewidth=1.5, alpha=0.9)

# 1. Nominal Vehicle Ground Pressure Line
nominal_p = 100
ax1.axhline(y=nominal_p, color='black', linestyle='--', linewidth=2)

# 2. Secondary Y-Axis (Force in kN)
# Scale: 100 kPa -> 1.8 kN (factor = 0.018)
ax2 = ax1.twinx()
ax2.set_ylabel("Force [kN]", fontsize=12)

# Set limits to match image
ax1.set_xlim(0, 80)
ax1.set_ylim(0, 700)

# Synchronize ax2 with ax1
# 700 kPa * 0.018 = 12.6 kN (Image shows ~12.4 at top)
ax2.set_ylim(0, 700 * 0.018)

# 3. Annotations and Intersections (Approximate positions based on image)
# Method 3, 4, 5 intersections with 100 kPa
# Intersection values from image: 2.4, 10, 16.2
intersections = [
    {"x": 2.4,  "color": "black",   "label": "2.4"},
    {"x": 10.0, "color": "blue",    "label": "10"},
    {"x": 16.2, "color": "magenta", "label": "16.2"},
]

for inter in intersections:
    # Vertical dashed lines
    ax1.vlines(x=inter["x"], ymin=0, ymax=nominal_p, color=inter["color"], linestyle='--', linewidth=1.5)
    # Scatter points at intersections
    ax1.scatter(inter["x"], nominal_p, color='black', zorder=5)

# Update X-ticks to include intersections
current_xticks = sorted(list(plt.xticks()[0]) + [2.4, 10, 16.2])
ax1.set_xticks([0, 2.4, 10, 16.2, 20, 30, 40, 50, 60, 70, 80])

# Text Annotations
ax1.annotate("Nominal Vehicle\nGround Pressure", xy=(55, 110), fontsize=9)
ax1.annotate("Estimated Static\nWheel Sinkage", xy=(18, 40), xytext=(25, 60),
             arrowprops=dict(arrowstyle="->", connectionstyle="arc3,rad=.2"), fontsize=9)

# Repetitive loading annotation (pointing to the dip in Method 5/red curve around x=58)
ax1.annotate("Elastic Recovery\nRepetitive Loading", xy=(57, 500), xytext=(60, 580),
             arrowprops=dict(arrowstyle="->", color='black'), fontsize=9)

# Final Styling with Sorted Legend
# -----------------------------------------------------------------------------
ax1.set_xlabel("Sinkage [mm]", fontsize=12)
ax1.set_ylabel("Pressure [kPa]", fontsize=12)
ax1.grid(True, which='both', linestyle='-', alpha=0.3)

# Define expected order for legend
order = [
    "Method 1 (Loosest)",
    "Method 2 (Low Compact)",
    "Method 3, 1390kg/m³ (~77% Mod. AASHTO)",
    "Method 4, 1511kg/m³ (~84% Mod. AASHTO)",
    "Method 5, 1538kg/m³ (~86% Mod. AASHTO), e=0.908",
    "Nominal Vehicle Ground Pressure"
]

handles, labels = ax1.get_legend_handles_labels()

# Filter/Add the dashed line handle if not already there
if "Nominal Vehicle Ground Pressure" not in labels:
    handles.append(plt.Line2D([0], [0], color='black', linestyle='--', linewidth=2))
    labels.append("Nominal Vehicle Ground Pressure")

# Sort based on 'order' list
sorted_indices = []
for label in order:
    if label in labels:
        sorted_indices.append(labels.index(label))

sorted_handles = [handles[i] for i in sorted_indices]
sorted_labels = [labels[i] for i in sorted_indices]

ax1.legend(sorted_handles, sorted_labels, loc='upper left', fontsize=8, framealpha=0.8)

plt.tight_layout()

if SAVE:
    out_dir = os.path.join(paperdata.PROCESSED_DIR, "figures")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "plate_sinkage.png")
    fig.savefig(out_path, dpi=150)
    print(f"Saved {out_path}")
else:
    plt.show()
