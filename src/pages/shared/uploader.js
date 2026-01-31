// Client-side image validation was removed (it produced too many false negatives).
// Keep a stub so imports won't break.

export async function validateImageFile(file) {
  if (!file) return { ok: false, reason: 'NO_FILE' };
  return { ok: true };
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function analyzeImage(img) {
  const canvas = document.createElement('canvas');
  const maxSide = 900;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Convert to grayscale and compute mean/variance + Laplacian-like blur metric
  let sum = 0;
  let sumSq = 0;
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    gray[p] = y;
    sum += y;
    sumSq += y * y;
  }
  const n = gray.length;
  const mean = sum / n;
  const variance = sumSq / n - mean * mean;
  const contrast = Math.sqrt(Math.max(0, variance));

  // Blur: sum of absolute differences with neighbors (cheap proxy)
  let sharp = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const c = gray[y * width + x];
      sharp += Math.abs(c - gray[y * width + (x - 1)]);
      sharp += Math.abs(c - gray[y * width + (x + 1)]);
      sharp += Math.abs(c - gray[(y - 1) * width + x]);
      sharp += Math.abs(c - gray[(y + 1) * width + x]);
    }
  }
  const blurScore = sharp / (width * height);

  // Brightness: use mean
  const brightness = mean;

  return { blurScore, brightness, contrast };
}
