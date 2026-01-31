// Minimal client-side validation for passport page + ID photo.
// NOTE: We can only do heuristics (size, blur, brightness). Reflection/occlusion can't be guaranteed.

export async function validateImageFile(file, opts = {}) {
  const {
    minWidth = 600,
    minHeight = 600,
    maxMB = 6,
    kind = 'photo' // 'photo' | 'passport'
  } = opts;

  if (!file) return { ok: false, reason: 'NO_FILE' };
  const typeOk = ['image/jpeg', 'image/png', 'image/jpg'].includes(file.type);
  if (!typeOk) return { ok: false, reason: 'TYPE', message: '只接受 JPG / PNG。' };

  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxMB) return { ok: false, reason: 'SIZE', message: `檔案太大（${sizeMB.toFixed(1)}MB），請小於 ${maxMB}MB。` };

  const img = await fileToImage(file);
  if (img.width < minWidth || img.height < minHeight) {
    return { ok: false, reason: 'DIM', message: `解析度太低（${img.width}×${img.height}），請至少 ${minWidth}×${minHeight}。` };
  }

  // Basic quality checks via canvas
  const { blurScore, brightness, contrast } = analyzeImage(img);

  const warnings = [];

  // Heuristic thresholds
  // For passport pages, we prefer warning over blocking and rely on server-side MRZ OCR.
  if (blurScore < 40) {
    if (kind === 'passport') warnings.push('影像可能偏模糊（建議重拍：字要清楚可讀）。');
    else return { ok: false, reason: 'BLUR', message: '圖片可能過於模糊，請重新拍攝/上傳較清晰的圖片。' };
  }
  if (brightness < 40) {
    if (kind === 'passport') warnings.push('影像偏暗（建議在光線充足處重拍）。');
    else return { ok: false, reason: 'DARK', message: '圖片偏暗，請提高亮度或在光線充足處重新拍攝。' };
  }
  if (brightness > 220) {
    if (kind === 'passport') warnings.push('影像可能過曝/反光（建議避免閃光、用自然光平放拍）。');
    else return { ok: false, reason: 'BRIGHT', message: '圖片可能過曝（太亮），請避免反光、重新拍攝。' };
  }
  if (contrast < 25) {
    if (kind === 'passport') warnings.push('影像對比偏低（可能有霧/反光，建議重拍）。');
    else return { ok: false, reason: 'LOW_CONTRAST', message: '圖片對比偏低（可能有霧/反光），建議重拍。' };
  }

  // Passport page: hard-fail only when extremely blurry
  if (kind === 'passport' && blurScore < 18) {
    return { ok: false, reason: 'PASSPORT_TOO_BLURRY', message: '護照資料頁過於模糊，請重拍（最底部 MRZ 兩行要清楚）。' };
  }

  return { ok: true, meta: { width: img.width, height: img.height, sizeMB, blurScore, brightness, contrast }, warnings };
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
