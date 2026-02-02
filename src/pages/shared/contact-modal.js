function esc(s){return String(s).replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}

function getContactItems(locale){
  const isZhTw = locale === 'zh-TW';
  const isZhCn = locale === 'zh-CN';

  return [
    {
      key: 'wechat',
      name: isZhCn ? '微信 WeChat' : 'WeChat 微信',
      idLabel: isZhCn ? '添加链接' : '加入連結',
      idText: 'u.wechat.com/MJ65zWUs3hWEz_cJ-s_WIQI?s=2',
      href: 'https://u.wechat.com/MJ65zWUs3hWEz_cJ-s_WIQI?s=2'
    },
    {
      key: 'line',
      name: 'LINE',
      idLabel: 'ID',
      idText: '@oth1852d',
      href: 'https://line.me/R/ti/p/@oth1852d'
    },
    {
      key: 'whatsapp',
      name: 'WhatsApp',
      idLabel: isZhCn ? '二维码链接' : (isZhTw ? 'QR 連結' : 'QR link'),
      idText: 'wa.me/qr/WMWEEYWG32N7H1',
      href: 'https://wa.me/qr/WMWEEYWG32N7H1'
    },
    {
      key: 'telegram',
      name: 'Telegram',
      idLabel: 'ID',
      idText: '@AlbertLaipi',
      href: 'https://t.me/AlbertLaipi'
    },
    {
      key: 'zalo',
      name: 'Zalo',
      idLabel: isZhCn ? '二维码链接' : (isZhTw ? 'QR 連結' : 'QR link'),
      idText: 'zaloapp.com/qr/p/1m345knav588v',
      href: 'https://zaloapp.com/qr/p/1m345knav588v'
    }
  ];
}

function qrUrl(data){
  // Lightweight, no JS library. Uses a public QR image generator.
  // If you want to self-host later, we can swap this to a local QR renderer.
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(data)}`;
}

function buildModal(locale){
  const title = locale === 'zh-CN' ? '联系我们' : (locale === 'zh-TW' ? '聯繫我們' : 'Contact');
  const subtitle = locale === 'zh-CN'
    ? '只保留 5 种联系方式与二维码，方便快速添加。'
    : (locale === 'zh-TW'
      ? '只保留 5 種聯絡方式與 QR code，方便快速加入。'
      : 'Five contact methods + QR codes for fast add.');

  const items = getContactItems(locale);

  const cards = items.map((it)=>{
    const qr = qrUrl(it.href);
    return `
      <article class="rounded-2xl border border-black/10 bg-white p-4 shadow-card">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-sm font-extrabold">${esc(it.name)}</h3>
            <p class="mt-1 text-xs font-semibold text-zinc-600">${esc(it.idLabel)}：<span class="font-mono">${esc(it.idText)}</span></p>
          </div>
          <a href="${esc(it.href)}" target="_blank" rel="noopener" class="shrink-0 rounded-xl border border-black/10 bg-brand-4 px-3 py-2 text-xs font-extrabold text-zinc-900 hover:bg-white">Open</a>
        </div>
        <div class="mt-3 overflow-hidden rounded-xl border border-black/10 bg-white">
          <img alt="${esc(it.name)} QR" src="${esc(qr)}" class="block h-[220px] w-[220px]" loading="lazy" />
        </div>
      </article>
    `;
  }).join('');

  const el = document.createElement('div');
  el.id = 'contactModal';
  el.className = 'fixed inset-0 z-[100] hidden';
  el.innerHTML = `
    <div data-contact-backdrop class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
    <div class="relative mx-auto flex h-full max-w-6xl items-start justify-center overflow-auto px-4 py-10">
      <div class="w-full max-w-3xl rounded-3xl border border-black/10 bg-white/90 p-5 shadow-soft backdrop-blur">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-extrabold tracking-tight">${esc(title)}</h2>
            <p class="mt-1 text-sm font-medium text-zinc-600">${esc(subtitle)}</p>
          </div>
          <button type="button" data-contact-close class="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-extrabold text-zinc-900 hover:bg-brand-4">Close</button>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          ${cards}
        </div>

        <p class="mt-6 text-xs font-medium text-zinc-500">© Vietnam Discovery</p>
      </div>
    </div>
  `;
  return el;
}

export function initContactModal(locale){
  if (document.querySelector('#contactModal')) return;

  const modal = buildModal(locale);
  document.body.appendChild(modal);

  function open(){
    modal.classList.remove('hidden');
    document.documentElement.classList.add('overflow-hidden');
  }
  function close(){
    modal.classList.add('hidden');
    document.documentElement.classList.remove('overflow-hidden');
  }

  document.addEventListener('click', (e)=>{
    const openEl = e.target.closest('[data-contact-open]');
    if (openEl) {
      e.preventDefault();
      open();
      return;
    }

    const closeEl = e.target.closest('[data-contact-close]');
    if (closeEl) {
      e.preventDefault();
      close();
      return;
    }

    const backdrop = e.target.closest('[data-contact-backdrop]');
    if (backdrop) {
      e.preventDefault();
      close();
      return;
    }
  }, { passive: false });

  document.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
  });
}
