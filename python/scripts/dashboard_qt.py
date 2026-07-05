"""
Interactive PyQt5 desktop dashboard for the geotechnical test-data archive.

This is the desktop / Qt counterpart of the React web dashboard in
``../web_dashboard``. It mirrors the same three published matplotlib figures
(plate sinkage, Bevameter shear, triaxial compression) but lets you explore
them interactively: filter tests, toggle annotations and re-decimate the curves
with a slider for smooth panning/zooming.

Run it:

    python dashboard_qt.py

It reads only the OPEN formats (metadata.json + csv/*.csv) through
``paperdata`` -- no dill / pickle is imported at runtime, so no custom classes
are required. Nothing here modifies any data: the point-count slider decimates
(drops rows) for display only and never alters the values it keeps.

The window is built by ``build_main_window()`` so it can be smoke-tested without
a display, e.g. on the ``offscreen`` Qt platform::

    QT_QPA_PLATFORM=offscreen python -c "import dashboard_qt as d; \
        from PyQt5.QtWidgets import QApplication; app = QApplication([]); \
        w = d.build_main_window(); print(w.centralWidget().count())"

Reference:
R. Kruger, P. S. Els, and H. A. Hamersma. "Experimental investigation of
factors affecting the characterisation of soil strength properties using a
Bevameter in-situ plate sinkage and shear test apparatus."
Journal of Terramechanics, 109:45-62, 2023. doi:10.1016/j.jterra.2023.06.002.
"""

import os
import sys

# The script's own directory must be importable so that ``paperdata`` resolves
# whether the app is launched from python/scripts/ or from anywhere else.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np

import matplotlib
matplotlib.use("Qt5Agg")  # embed figures in the Qt window
from matplotlib.backends.backend_qt5agg import (
    FigureCanvasQTAgg as FigureCanvas,
    NavigationToolbar2QT as NavigationToolbar,
)
from matplotlib.figure import Figure

from PyQt5.QtCore import Qt
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QTabWidget, QWidget, QVBoxLayout, QHBoxLayout,
    QListWidget, QListWidgetItem, QAbstractItemView, QCheckBox, QSlider,
    QLabel, QComboBox, QTableWidget, QTableWidgetItem, QGroupBox, QSizePolicy,
)

import paperdata


# ---------------------------------------------------------------------------
# Point-count slider bounds (display-only decimation budget per curve).
# ---------------------------------------------------------------------------
MIN_POINTS = 100
MAX_POINTS = 5000
DEFAULT_POINTS = 2000

# Compaction-method styling for the plate-sinkage figure. Colours and labels
# reproduce the published figure exactly (see plot_plate_sinkage.py).
METHOD_STYLES = {
    "Method 1": {"color": "green",   "label": "Method 1 (Loosest)"},
    "Method 2": {"color": "magenta", "label": "Method 2 (Low Compact)"},
    "Method 3": {"color": "blue",    "label": "Method 3, 1390kg/m³ (~77% Mod. AASHTO)"},
    "Method 4": {"color": "black",   "label": "Method 4, 1511kg/m³ (~84% Mod. AASHTO)"},
    "Method 5": {"color": "red",     "label": "Method 5, 1538kg/m³ (~86% Mod. AASHTO), e=0.908"},
}

# Accept either a bare method number ("5") or the full string ("Method 5").
ID_TO_METHOD = {}
for _n in range(1, 6):
    ID_TO_METHOD[str(_n)] = f"Method {_n}"
    ID_TO_METHOD[f"Method {_n}"] = f"Method {_n}"

# 100 kPa nominal ground pressure -> 1.8 kN on a 0.018 m^2 plate.
NOMINAL_PRESSURE = 100.0
FORCE_FACTOR = 0.018


# ---------------------------------------------------------------------------
# Small data helpers (loading is cached so slider moves don't re-read CSVs)
# ---------------------------------------------------------------------------
_CSV_CACHE = {}


def load_arrays(test_type, csv_file):
    """Cached wrapper around ``paperdata.load_test_csv``."""
    key = (test_type, csv_file)
    if key not in _CSV_CACHE:
        _CSV_CACHE[key] = paperdata.load_test_csv(test_type, csv_file)
    return _CSV_CACHE[key]


def decimate(x, y, max_points):
    """Return finite (x, y) reduced to at most ``max_points`` samples.

    Drops NaN padding, then keeps evenly-spaced indices (first and last always
    included). This is display-only: kept values are returned verbatim, never
    averaged, smoothed or rescaled.
    """
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    mask = np.isfinite(x) & np.isfinite(y)
    x, y = x[mask], y[mask]
    n = len(x)
    if n > max_points >= 2:
        idx = np.unique(np.linspace(0, n - 1, int(max_points)).round().astype(int))
        x, y = x[idx], y[idx]
    return x, y


def norm_method(value):
    """Normalise a plate-sinkage method value to 'Method N' (or None)."""
    return ID_TO_METHOD.get(str(value))


# ===========================================================================
# Plate-sinkage tab
# ===========================================================================
class PlateSinkageTab(QWidget):
    """Pressure vs sinkage, coloured by compaction method, with a Force axis."""

    def __init__(self):
        super().__init__()
        self.meta = paperdata.load_metadata("plate_sinkage")

        # Group tests by normalised method so one legend entry covers a method.
        self.by_method = {}
        for row in self.meta:
            key = norm_method(row.get("method"))
            if key is None:
                continue
            self.by_method.setdefault(key, []).append(row)
        self.methods = [m for m in METHOD_STYLES if m in self.by_method]

        # --- figure + toolbar ------------------------------------------------
        self.fig = Figure(figsize=(8, 6))
        self.canvas = FigureCanvas(self.fig)
        self.canvas.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)
        self.toolbar = NavigationToolbar(self.canvas, self)
        self.ax1 = self.fig.add_subplot(111)
        self.ax2 = self.ax1.twinx()  # secondary Force [kN] axis

        # --- controls --------------------------------------------------------
        self.method_list = QListWidget()
        self.method_list.setSelectionMode(QAbstractItemView.ExtendedSelection)
        for m in self.methods:
            item = QListWidgetItem(METHOD_STYLES[m]["label"])
            item.setData(Qt.UserRole, m)
            self.method_list.addItem(item)
            item.setSelected(True)
        self.method_list.itemSelectionChanged.connect(self.redraw)

        self.nominal_check = QCheckBox("Show 100 kPa nominal ground-pressure line")
        self.nominal_check.setChecked(True)
        self.nominal_check.stateChanged.connect(self.redraw)

        self.points_slider, self.points_label = _make_points_slider(self.redraw)

        controls = QGroupBox("Plate sinkage controls")
        cbox = QVBoxLayout(controls)
        cbox.addWidget(QLabel("Compaction methods (multi-select):"))
        cbox.addWidget(self.method_list)
        cbox.addWidget(self.nominal_check)
        cbox.addWidget(self.points_label)
        cbox.addWidget(self.points_slider)
        cbox.addStretch(1)

        _assemble_tab(self, self.toolbar, self.canvas, controls)
        self.redraw()

    def selected_methods(self):
        sel = [i.data(Qt.UserRole) for i in self.method_list.selectedItems()]
        return sel or list(self.methods)

    def redraw(self):
        max_pts = self.points_slider.value()
        self.points_label.setText(f"Max points per curve: {max_pts}")
        self.ax1.clear()
        self.ax2.clear()

        for method in self.selected_methods():
            style = METHOD_STYLES[method]
            first = True
            for row in self.by_method[method]:
                arrays = load_arrays("plate_sinkage", row["csv_file"])
                x, y = decimate(arrays["sinkage"], arrays["pressure"], max_pts)
                if len(x) == 0:
                    continue
                self.ax1.plot(x, y, color=style["color"], linewidth=1.5,
                              alpha=0.9, label=style["label"] if first else None)
                first = False

        if self.nominal_check.isChecked():
            self.ax1.axhline(y=NOMINAL_PRESSURE, color="black",
                             linestyle="--", linewidth=2,
                             label="Nominal Vehicle Ground Pressure")

        self.ax1.set_xlabel("Sinkage [mm]", fontsize=11)
        self.ax1.set_ylabel("Pressure [kPa]", fontsize=11)
        self.ax1.grid(True, which="both", linestyle="-", alpha=0.3)
        self.ax1.legend(loc="upper left", fontsize=8, framealpha=0.8)

        # Secondary Force [kN] axis: Force = pressure * 0.018, kept in sync.
        lo, hi = self.ax1.get_ylim()
        self.ax2.set_ylim(lo * FORCE_FACTOR, hi * FORCE_FACTOR)
        self.ax2.set_ylabel("Force [kN]", fontsize=11)

        self.fig.tight_layout()
        self.canvas.draw_idle()


# ===========================================================================
# Shear tab
# ===========================================================================
class ShearTab(QWidget):
    """Shear stress vs displacement, one viridis-coloured line per test."""

    def __init__(self):
        super().__init__()
        self.meta = paperdata.load_metadata("shear")
        # Stable per-test viridis colours (independent of which are selected).
        self.colors = matplotlib.cm.viridis(np.linspace(0, 1, len(self.meta)))

        self.fig = Figure(figsize=(8, 6))
        self.canvas = FigureCanvas(self.fig)
        self.canvas.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)
        self.toolbar = NavigationToolbar(self.canvas, self)
        self.ax = self.fig.add_subplot(111)

        self.test_list = QListWidget()
        self.test_list.setSelectionMode(QAbstractItemView.ExtendedSelection)
        for i, row in enumerate(self.meta):
            item = QListWidgetItem(self._label(row))
            item.setData(Qt.UserRole, i)
            self.test_list.addItem(item)
            item.setSelected(True)
        self.test_list.itemSelectionChanged.connect(self.redraw)

        self.points_slider, self.points_label = _make_points_slider(self.redraw)

        controls = QGroupBox("Shear controls")
        cbox = QVBoxLayout(controls)
        cbox.addWidget(QLabel("Tests (multi-select):"))
        cbox.addWidget(self.test_list)
        cbox.addWidget(self.points_label)
        cbox.addWidget(self.points_slider)
        cbox.addStretch(1)

        _assemble_tab(self, self.toolbar, self.canvas, controls)
        self.redraw()

    @staticmethod
    def _label(row):
        return (f"{row.get('Method')} | "
                f"σ_n={row.get('Normal_Stress')} kPa | "
                f"{row.get('Density')} kg/m³")

    def selected_indices(self):
        sel = [i.data(Qt.UserRole) for i in self.test_list.selectedItems()]
        return sorted(sel) if sel else list(range(len(self.meta)))

    def redraw(self):
        max_pts = self.points_slider.value()
        self.points_label.setText(f"Max points per curve: {max_pts}")
        self.ax.clear()

        for i in self.selected_indices():
            row = self.meta[i]
            arrays = load_arrays("shear", row["csv_file"])
            x, y = decimate(arrays["Displacement"], arrays["shear_stress"], max_pts)
            if len(x) == 0:
                continue
            self.ax.plot(x, y, color=self.colors[i], linewidth=1.5,
                         alpha=0.9, label=self._label(row))

        self.ax.set_title("Bevameter Shear Tests: Shear Stress vs. Displacement",
                          fontsize=12, fontweight="bold")
        self.ax.set_xlabel("Displacement [mm]", fontsize=11)
        self.ax.set_ylabel("Shear Stress [kPa]", fontsize=11)
        self.ax.grid(True, which="both", ls="--", alpha=0.6)
        self.ax.set_ylim(0, None)
        self.ax.legend(title="Compaction State | Normal Stress | Density",
                       loc="best", fontsize=8)

        self.fig.tight_layout()
        self.canvas.draw_idle()


# ===========================================================================
# Triaxial tab
# ===========================================================================
class TriaxialTab(QWidget):
    """Three linked panels (q-eps_a, q-p', e-p' log-x) for one selected test,
    plus a table of the first rows of that test's columns."""

    TABLE_ROWS = 200
    COLS = ["axial_strain", "q", "p_prime", "e"]

    def __init__(self):
        super().__init__()
        self.meta = paperdata.load_metadata("triaxial")

        self.fig = Figure(figsize=(11, 4))
        self.canvas = FigureCanvas(self.fig)
        self.canvas.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)
        self.toolbar = NavigationToolbar(self.canvas, self)
        self.ax1, self.ax2, self.ax3 = self.fig.subplots(1, 3)

        self.combo = QComboBox()
        for row in self.meta:
            self.combo.addItem(str(row.get("name", row["test_id"])))
        self.combo.currentIndexChanged.connect(self.redraw)

        self.points_slider, self.points_label = _make_points_slider(self.redraw)

        self.table = QTableWidget()
        self.table.setColumnCount(len(self.COLS))
        self.table.setHorizontalHeaderLabels(self.COLS)
        self.table.setEditTriggers(QAbstractItemView.NoEditTriggers)

        controls = QGroupBox("Triaxial controls")
        cbox = QVBoxLayout(controls)
        cbox.addWidget(QLabel("Test:"))
        cbox.addWidget(self.combo)
        cbox.addWidget(self.points_label)
        cbox.addWidget(self.points_slider)
        cbox.addWidget(QLabel(f"First {self.TABLE_ROWS} rows:"))
        cbox.addWidget(self.table, 1)

        _assemble_tab(self, self.toolbar, self.canvas, controls)
        self.redraw()

    def redraw(self):
        max_pts = self.points_slider.value()
        self.points_label.setText(f"Max points per curve: {max_pts}")
        row = self.meta[max(0, self.combo.currentIndex())]
        arrays = load_arrays("triaxial", row["csv_file"])
        name = str(row.get("name", row["test_id"]))

        for ax in (self.ax1, self.ax2, self.ax3):
            ax.clear()

        # Panel 1: q vs axial strain
        x, y = decimate(arrays["axial_strain"], arrays["q"], max_pts)
        self.ax1.plot(x, y, "b-")
        self.ax1.set_title(f"{name} — q vs axial strain", fontsize=10)
        self.ax1.set_xlabel("Axial Strain [-]")
        self.ax1.set_ylabel("q [kPa]")
        self.ax1.grid(True)

        # Panel 2: q vs p' (stress path)
        x, y = decimate(arrays["p_prime"], arrays["q"], max_pts)
        self.ax2.plot(x, y, "r-")
        self.ax2.set_title(f"{name} — q vs p′", fontsize=10)
        self.ax2.set_xlabel("p′ [kPa]")
        self.ax2.set_ylabel("q [kPa]")
        self.ax2.grid(True)

        # Panel 3: e vs p' on a log x-axis (critical-state view)
        x, y = decimate(arrays["p_prime"], arrays["e"], max_pts)
        self.ax3.semilogx(x, y, "g-")
        self.ax3.set_title(f"{name} — e vs p′", fontsize=10)
        self.ax3.set_xlabel("p′ [kPa]")
        self.ax3.set_ylabel("Void Ratio e [-]")
        self.ax3.grid(True)

        self.fig.suptitle(name, fontsize=13)
        self.fig.tight_layout()
        self.canvas.draw_idle()

        self._fill_table(arrays)

    def _fill_table(self, arrays):
        n = min(self.TABLE_ROWS, max(len(arrays[c]) for c in self.COLS))
        self.table.setRowCount(n)
        for c, col in enumerate(self.COLS):
            data = arrays[col]
            for r in range(n):
                val = data[r] if r < len(data) else np.nan
                text = "" if not np.isfinite(val) else f"{val:.6g}"
                self.table.setItem(r, c, QTableWidgetItem(text))


# ---------------------------------------------------------------------------
# Shared widget helpers
# ---------------------------------------------------------------------------
def _make_points_slider(on_change):
    """Return a (QSlider, QLabel) pair for the display point budget."""
    slider = QSlider(Qt.Horizontal)
    slider.setMinimum(MIN_POINTS)
    slider.setMaximum(MAX_POINTS)
    slider.setValue(DEFAULT_POINTS)
    slider.setSingleStep(100)
    slider.setPageStep(500)
    slider.valueChanged.connect(lambda _v: on_change())
    label = QLabel(f"Max points per curve: {DEFAULT_POINTS}")
    return slider, label


def _assemble_tab(tab, toolbar, canvas, controls):
    """Lay out a tab: plot (toolbar + canvas) on the left, controls on right."""
    layout = QHBoxLayout(tab)
    plot_box = QVBoxLayout()
    plot_box.addWidget(toolbar)
    plot_box.addWidget(canvas, 1)
    layout.addLayout(plot_box, 3)
    layout.addWidget(controls, 1)


# ---------------------------------------------------------------------------
# Window assembly
# ---------------------------------------------------------------------------
def build_main_window():
    """Construct and return the QMainWindow (no event loop entered).

    A ``QApplication`` must already exist. Kept import-safe / headless so it can
    be smoke-tested on the ``offscreen`` Qt platform.
    """
    window = QMainWindow()
    window.setWindowTitle("Geotechnical Test-Data Dashboard (Qt)")

    tabs = QTabWidget()
    tabs.addTab(PlateSinkageTab(), "Plate Sinkage")
    tabs.addTab(ShearTab(), "Shear")
    tabs.addTab(TriaxialTab(), "Triaxial")

    window.setCentralWidget(tabs)
    window.resize(1250, 700)
    return window


def main():
    app = QApplication(sys.argv)
    window = build_main_window()
    window.show()
    return app.exec_()


if __name__ == "__main__":
    sys.exit(main())
