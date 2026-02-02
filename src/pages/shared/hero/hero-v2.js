async function loadManifest() {
  const res = await fetch('/shared/hero/manifest.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('failed_to_load_hero_manifest');
  return res.json();
}

function qs(sel){return document.querySelector(sel)}

function setBg(el, url) {
  el.style.backgroundImage = `url(${url})`;
}

export async function initHeroSliderV2() {
  const root = qs('[data-hero-slider]');
  if (!root) return;

  const slides = Array.from(root.querySelectorAll('[data-hero-slide]'));
  if (slides.length < 2) return;

  let manifest;
  try { manifest = await loadManifest(); } catch { return; }
  const images = (manifest.images || []).filter(Boolean);
  if (!images.length) return;

  const intervalMs = Number(manifest.intervalMs || 5000);

  // preload a few
  for (const url of images.slice(0, 4)) {
    const img = new Image();
    img.src = url;
  }

  let i = 0;
  let active = 0;
  setBg(slides[active], images[0]);
  slides[active].classList.add('isActive');

  setInterval(() => {
    i = (i + 1) % images.length;
    const nextUrl = images[i];

    const next = (active + 1) % slides.length;
    setBg(slides[next], nextUrl);
    slides[next].classList.add('isActive');
    slides[active].classList.remove('isActive');
    active = next;
  }, intervalMs);
}
