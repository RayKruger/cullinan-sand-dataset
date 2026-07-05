import { useEffect, useState } from 'react';

// Base-path aware root for static assets. Works under any GitHub Pages
// subpath and when the built index.html is opened directly from disk.
const BASE = import.meta.env.BASE_URL;

// Module-level cache so a dataset is only fetched once per session, even if
// the user switches away from a tab and back again.
const datasetCache = {};

function fetchJson(url) {
  return fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status} while loading ${url}`);
    return r.json();
  });
}

/** Load data/index.json (the dataset catalogue). */
export function useIndex() {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let alive = true;
    fetchJson(`${BASE}data/index.json`)
      .then((data) => alive && setState({ loading: false, error: null, data }))
      .catch((err) => alive && setState({ loading: false, error: err.message, data: null }));
    return () => {
      alive = false;
    };
  }, []);

  return state;
}

/**
 * Load a per-type dataset file (e.g. "plate_sinkage.json") on demand.
 * Pass a falsy `file` to stay idle. Results are cached across mounts.
 *
 * IMPORTANT: the return value is derived so that it always corresponds to the
 * `file` passed in *this* render. Without that guard, when `file` changes the
 * hook would return the previously-loaded dataset for one render (before the
 * effect runs), handing the wrong data shape to the active panel.
 */
export function useDataset(file) {
  const [state, setState] = useState(() => ({
    file: file && datasetCache[file] ? file : null,
    loading: Boolean(file) && !datasetCache[file],
    error: null,
    data: (file && datasetCache[file]) || null,
  }));

  useEffect(() => {
    if (!file) {
      setState({ file: null, loading: false, error: null, data: null });
      return undefined;
    }
    if (datasetCache[file]) {
      setState({ file, loading: false, error: null, data: datasetCache[file] });
      return undefined;
    }

    let alive = true;
    setState({ file, loading: true, error: null, data: null });
    fetchJson(`${BASE}data/${file}`)
      .then((data) => {
        datasetCache[file] = data;
        if (alive) setState({ file, loading: false, error: null, data });
      })
      .catch((err) => alive && setState({ file, loading: false, error: err.message, data: null }));

    return () => {
      alive = false;
    };
  }, [file]);

  // Derived view for the current `file`, guarding the one-render window where
  // `state` still reflects the previously requested file.
  if (file && datasetCache[file]) {
    return { loading: false, error: null, data: datasetCache[file] };
  }
  if (state.file !== file) {
    return { loading: Boolean(file), error: null, data: null };
  }
  return { loading: state.loading, error: state.error, data: state.data };
}
