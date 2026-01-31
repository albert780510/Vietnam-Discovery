import Busboy from 'busboy';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';

// Cache a single worker across invocations when possible.
let workerPromise = null;

function getWorker() {
  if (workerPromise) return workerPromise;
  workerPromise = (async () => {
    const worker = await Tesseract.createWorker('eng', 1, {
      // Public tessdata mirror; avoids bundling traineddata in the function.
      langPath: 'https://tessdata.projectnaptha.com/4.0.0'
    });

    // MRZ is typically OCR-B; English model + whitelist usually works for the "does MRZ exist" gate.
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
      preserve_interword_spaces: '1'
    });

    return worker;
  })();
  return workerPromise;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}

function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return reject(new Error('expected_multipart_form_data'));
    }

    const bb = Busboy({ headers: { 'content-type': contentType } });

    const out = { fields: {}, files: [] };

    bb.on('file', (name, file, info) => {
      const { filename, mimeType } = info;
      const chunks = [];
      file.on('data', (d) => chunks.push(d));
      file.on('limit', () => {
        // We enforce size ourselves; this is just informational.
      });
      file.on('end', () => {
        out.files.push({ name, filename, mimeType, buffer: Buffer.concat(chunks) });
      });
    });

    bb.on('field', (name, val) => {
      out.fields[name] = val;
    });

    bb.on('error', reject);
    bb.on('finish', () => resolve(out));

    const body = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64') : Buffer.from(event.body || '', 'utf8');
    bb.end(body);
  });
}

function extractMrzLines(text) {
  const lines = String(text || '')
    .toUpperCase()
    .replace(/[^A-Z0-9<\n]/g, '')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  // MRZ lines typically contain many '<' and are fairly long.
  const candidates = lines.filter((l) => l.length >= 25 && (l.match(/</g) || []).length >= 3);

  if (candidates.length >= 2) {
    const last2 = candidates.slice(-2);
    return last2;
  }

  // Fallback: try to find two long lines even if '<' count is low
  const longLines = lines.filter((l) => l.length >= 30);
  if (longLines.length >= 2) return longLines.slice(-2);

  return null;
}

async function preprocessForMrz(buffer) {
  // Normalize orientation is hard without EXIF + heuristics; sharp will respect EXIF by default.
  // Crop bottom region where MRZ lives; then increase contrast.
  const img = sharp(buffer, { failOn: 'none' });
  const meta = await img.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;

  if (!width || !height) throw new Error('bad_image');

  // Resize for OCR stability (avoid tiny images)
  const targetWidth = Math.min(1800, Math.max(1200, width));

  const bottomCropTop = Math.floor(height * 0.55);
  const bottomCropHeight = height - bottomCropTop;

  const pre = await img
    .resize({ width: targetWidth, withoutEnlargement: true })
    .extract({ left: 0, top: bottomCropTop, width, height: bottomCropHeight })
    .grayscale()
    .normalise()
    .sharpen()
    .threshold(160)
    .toFormat('png')
    .toBuffer();

  return { pre, meta: { width, height, mime: meta.format } };
}

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });

    const { files } = await parseMultipart(event);
    const f = files.find((x) => x.name === 'file') || files[0];
    if (!f?.buffer?.length) return json(400, { ok: false, error: 'missing_file' });

    const sizeMB = f.buffer.length / (1024 * 1024);
    if (sizeMB > 10) return json(413, { ok: false, error: 'file_too_large', message: '檔案太大，請小於 10MB。' });

    // Basic type check (we can still attempt decode with sharp)
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (f.mimeType && !allowed.includes(f.mimeType)) {
      return json(400, { ok: false, error: 'unsupported_type', message: '只接受 JPG/PNG/WEBP。' });
    }

    const { pre, meta } = await preprocessForMrz(f.buffer);

    const worker = await getWorker();
    const r = await worker.recognize(pre);
    const text = r?.data?.text || '';

    const mrzLines = extractMrzLines(text);
    const warnings = [];

    if (sizeMB > 2) warnings.push('檔案超過 2MB（官方系統常見限制），建議重拍或壓縮成小於 2MB。');

    if (!mrzLines) {
      return json(200, {
        ok: false,
        reason: 'MRZ_NOT_FOUND',
        message: '護照 MRZ（底部兩行 <<<<<<）無法辨識。請避免反光、用自然光、平放拍攝，確保最底部兩行清楚可讀。',
        meta: { sizeMB: Number(sizeMB.toFixed(2)), width: meta.width, height: meta.height },
        warnings
      });
    }

    return json(200, {
      ok: true,
      meta: { sizeMB: Number(sizeMB.toFixed(2)), width: meta.width, height: meta.height },
      mrzLines,
      warnings
    });
  } catch (err) {
    return json(500, { ok: false, error: 'internal_error', message: err.message });
  }
}
