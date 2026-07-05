// Client-side NumPy .npz writer (no dependencies). Produces a ZIP (stored, no
// compression) of little-endian float64 .npy arrays — readable with
//   np.load("file.npz", allow_pickle=False)
// Mirrors the archive's .npz key convention: "<NN>_<test_id>__<column>".

// ---- CRC-32 (for the ZIP entries) ----------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const u16 = (n) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
const u32 = (n) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);

function concat(arrs) {
  let len = 0;
  for (const a of arrs) len += a.length;
  const out = new Uint8Array(len);
  let o = 0;
  for (const a of arrs) {
    out.set(a, o);
    o += a.length;
  }
  return out;
}

// ---- .npy encoding (1-D little-endian float64; null/NaN -> NaN) -----------
function npyFloat64(arr) {
  const n = arr.length;
  const buf = new ArrayBuffer(n * 8);
  const dv = new DataView(buf);
  for (let i = 0; i < n; i += 1) {
    const v = arr[i];
    dv.setFloat64(i * 8, v == null || Number.isNaN(v) ? NaN : v, true);
  }
  const dataBytes = new Uint8Array(buf);
  let header = `{'descr': '<f8', 'fortran_order': False, 'shape': (${n},), }`;
  const pre = 10; // magic(6) + version(2) + header-len(2)
  const pad = (64 - ((pre + header.length + 1) % 64)) % 64;
  header = `${header}${' '.repeat(pad)}\n`;
  const headerBytes = new TextEncoder().encode(header);
  const out = new Uint8Array(pre + headerBytes.length + dataBytes.length);
  out.set([0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59, 0x01, 0x00], 0); // \x93NUMPY v1.0
  out[8] = headerBytes.length & 0xff;
  out[9] = (headerBytes.length >>> 8) & 0xff;
  out.set(headerBytes, 10);
  out.set(dataBytes, 10 + headerBytes.length);
  return out;
}

// ---- ZIP (stored / no compression) ---------------------------------------
export function zipStore(files) {
  const enc = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  const push = (b) => {
    chunks.push(b);
    offset += b.length;
  };
  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const crc = crc32(f.data);
    const size = f.data.length;
    const localOffset = offset;
    push(u32(0x04034b50)); // local file header signature
    push(u16(20)); // version needed
    push(u16(0)); // flags
    push(u16(0)); // method: stored
    push(u16(0)); // mod time
    push(u16(0x0021)); // mod date (1980-01-01)
    push(u32(crc));
    push(u32(size)); // compressed size
    push(u32(size)); // uncompressed size
    push(u16(nameBytes.length));
    push(u16(0)); // extra len
    push(nameBytes);
    push(f.data);
    central.push(
      concat([
        u32(0x02014b50), // central dir signature
        u16(20), // version made by
        u16(20), // version needed
        u16(0), // flags
        u16(0), // method
        u16(0), // mod time
        u16(0x0021), // mod date
        u32(crc),
        u32(size),
        u32(size),
        u16(nameBytes.length),
        u16(0), // extra len
        u16(0), // comment len
        u16(0), // disk number start
        u16(0), // internal attrs
        u32(0), // external attrs
        u32(localOffset),
        nameBytes,
      ])
    );
  }
  const cdStart = offset;
  let cdSize = 0;
  for (const c of central) {
    push(c);
    cdSize += c.length;
  }
  push(
    concat([
      u32(0x06054b50), // end of central dir
      u16(0), // disk number
      u16(0), // disk with central dir
      u16(files.length),
      u16(files.length),
      u32(cdSize),
      u32(cdStart),
      u16(0), // comment len
    ])
  );
  return concat(chunks);
}

const slug = (s) => String(s).replace(/[^A-Za-z0-9._-]+/g, '_');

/** .npz bytes for a whole dataset: keys "<NN>_<test_id>__<column>". */
export function datasetToNpz(data) {
  const files = [];
  data.tests.forEach((t, idx) => {
    const stem = `${String(idx + 1).padStart(2, '0')}_${slug(t.test_id)}`;
    Object.keys(t.columns).forEach((col) => {
      files.push({ name: `${stem}__${col}.npy`, data: npyFloat64(t.columns[col]) });
    });
  });
  return zipStore(files);
}

/** .npz bytes for a single test: one array per column (key = column name). */
export function columnsToNpz(columns) {
  const files = Object.keys(columns).map((col) => ({
    name: `${col}.npy`,
    data: npyFloat64(columns[col]),
  }));
  return zipStore(files);
}

/** Trigger a browser download of raw bytes. */
export function downloadBytes(filename, bytes) {
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
