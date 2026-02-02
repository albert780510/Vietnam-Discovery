async function loadManifest() {
  const res = await fetch('/shared/hero/manifest.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('failed_to_load_hero_manifest');
  return res.json();
}

function qs(sel){return document.querySelector(sel)}

function setBg(el, url) {
  el.style.backgroundImage = `url(${url})`;
}

export async function initHeroSlider() {
  const root = qs('[data-hero-slider]');
  if (!root) return;

  const a = root.querySelector('.heroSlideA');
  const b = root.querySelector('.heroSlideB');
  if (!a || !b) return;

  let manifest;
  try {
    manifest = await loadManifest();
  } catch {
    return;
  }

  const images = (manifest.images || []).filter(Boolean);
  if (!images.length) return;

  const intervalMs = Number(manifest.intervalMs || 5000);
  let i = 0;
  let showingA = true;

  // preload
  for (const url of images.slice(0, 3)) {
    const img = new Image();
    img.src = url;
  }

  setBg(a, images[0]);
  a.classList.add('isActive');
  b.classList.remove('isActive');

  setInterval(() => {
    i = (i + 1) % images.length;
    const nextUrl = images[i];

    const showEl = showingA ? b : a;
    const hideEl = showingA ? a : b;

    setBg(showEl, nextUrl);
    showEl.classList.add('isActive');
    hideEl.classList.remove('isActive');

    showingA = !showingA;
  }, intervalMs);
}
