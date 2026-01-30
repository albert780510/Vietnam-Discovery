import { validateImageFile } from './uploader.js';

async function loadJson(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`failed_to_load_${path}`);
  return res.json();
}

async function loadPricing() {
  return loadJson('/shared/config.pricing.json');
}

async function loadProcessing() {
  return loadJson('/shared/config.processing.json');
}

function fmtMoney(amount, currency, locale){
  const n = Number(amount);
  if (!Number.isFinite(n)) return '';
  if (currency === 'TWD') return `NT$ ${n.toLocaleString('zh-TW')}`;
  if (currency === 'CNY') return `CNY ${n.toLocaleString(locale === 'zh-CN' ? 'zh-CN' : 'en-US')}`;
  if (currency === 'USDT') return `USDT ${n.toLocaleString('en-US')}`;
  if (currency === 'VND') return `${n.toLocaleString('vi-VN')} VND`;
  return `${currency} ${n}`;
}

function currencyForLocale(locale){
  if (locale === 'zh-TW') return 'TWD';
  if (locale === 'zh-CN') return 'CNY';
  return 'USDT';
}

function qs(sel){return document.querySelector(sel)}

async function main(locale){
  const [pricing, processing] = await Promise.all([loadPricing(), loadProcessing()]);

  const isZhCn = locale === 'zh-CN';
  const isZhTw = locale === 'zh-TW';
  const isEn = !isZhCn && !isZhTw;

  // Language selector
  const langSelect = qs('#langSelect');
  if (langSelect) {
    const languages = [
      { code: 'en', label: 'English' , path: '/en/' },
      { code: 'zh-TW', label: '繁體中文', path: '/zh-tw/' },
      { code: 'zh-CN', label: '简体中文', path: '/zh-cn/' },
      { code: 'ko', label: '한국어', path: '/ko/' },
      { code: 'ja', label: '日本語', path: '/ja/' },
      { code: 'es', label: 'Español', path: '/es/' },
      { code: 'ru', label: 'Русский', path: '/ru/' },
      { code: 'th', label: 'ไทย', path: '/th/' },
      { code: 'ms', label: 'Bahasa Melayu', path: '/ms/' },
      { code: 'id', label: 'Bahasa Indonesia', path: '/id/' }
    ];

    langSelect.innerHTML = '';
    for (const l of languages) {
      const opt = document.createElement('option');
      opt.value = l.code;
      opt.textContent = l.label;
      langSelect.appendChild(opt);
    }
    langSelect.value = locale;
    if (!langSelect.value) langSelect.value = isZhCn ? 'zh-CN' : (isZhTw ? 'zh-TW' : 'en');

    localStorage.setItem('vd_lang', langSelect.value);

    langSelect.addEventListener('change', () => {
      const chosen = languages.find(x => x.code === langSelect.value);
      if (chosen) {
        localStorage.setItem('vd_lang', chosen.code);
        window.location.href = chosen.path;
      }
    });
  }

  const productSel = qs('#product');
  const speedSel = qs('#speed');
  const productPrice = qs('#productPrice');
  const form = qs('#lead-form');
  const statusEl = qs('#status');
  const phoneEl = qs('#phone');
  const addressEl = qs('#address');

  const nationalityEl = qs('#nationality');
  const entryGateEl = qs('#entryGate');

  // Fill contact placeholders if present
  const lineLink = qs('#lineLink');
  const fbGroupLink = qs('#fbGroupLink');
  const wechatId = qs('#wechatId');
  if (lineLink) lineLink.textContent = (isEn?'LINE: albert780510':'LINE：albert780510');
  if (lineLink) lineLink.href = 'https://line.me/R/ti/p/albert780510';
  if (fbGroupLink) {
    fbGroupLink.textContent = (isEn?'Facebook group':'Facebook 社團');
    fbGroupLink.href = 'https://www.facebook.com/share/1CFZKSjVzy/?mibextid=wwXIfr';
    fbGroupLink.target = '_blank';
    fbGroupLink.rel = 'noopener';
  }
  if (wechatId) wechatId.textContent = 's20389741';

  // Translate helper (any language -> English) via Google Translate
  const translateLink = qs('#translateAddress');
  if (translateLink && addressEl) {
    translateLink.addEventListener('click', (e) => {
      e.preventDefault();
      const text = (addressEl.value || '').trim();
      if (!text) return;
      const url = `https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(text)}&op=translate`;
      window.open(url, '_blank', 'noopener');
    });
  }

  // Populate nationalities (50+)
  if (nationalityEl && nationalityEl.tagName === 'SELECT') {
    const nationalities = await loadJson('/shared/config.nationalities.json');
    for (const n of nationalities) {
      const opt = document.createElement('option');
      opt.value = n.name_en;
      opt.textContent = `${n.emoji} ${n.name_en}`;
      nationalityEl.appendChild(opt);
    }
  }

  // Populate entry gates
  if (entryGateEl && entryGateEl.tagName === 'SELECT') {
    const gates = await loadJson('/shared/config.entrygates.json');
    for (const g of gates) {
      const opt = document.createElement('option');
      opt.value = g.value_en;
      const label = g.label[locale] || g.label['en'];
      opt.textContent = label;
      entryGateEl.appendChild(opt);
    }
  }

  const displayCurrency = currencyForLocale(locale);

  // Populate processing speed selector (if present)
  if (speedSel && processing?.speeds?.length) {
    speedSel.innerHTML = '';
    for (const s of processing.speeds) {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.label?.[locale] || s.label?.['en'] || s.id;
      speedSel.appendChild(opt);
    }
    speedSel.value = 'STD_5_7';
  }

  // Populate products with price inline
  for (const [key, p] of Object.entries(pricing.products)){
    const opt = document.createElement('option');
    opt.value = key;
    const label = p.label[locale] || p.label['en'] || p.label['zh-TW'] || key;
    const base = p.prices?.[displayCurrency];
    opt.textContent = isEn
      ? `${label} (${fmtMoney(base, displayCurrency, locale)})`
      : `${label}（${fmtMoney(base, displayCurrency, locale)}）`;
    productSel.appendChild(opt);
  }

  function calcTotal(p){
    const base = Number(p?.prices?.[displayCurrency] ?? NaN);
    const speed = speedSel?.value || 'STD_5_7';
    const addon = Number(p?.rushAddons?.[displayCurrency]?.[speed] ?? 0);
    if (!Number.isFinite(base)) return { total: NaN, base: NaN, addon: 0, speed };
    return { total: base + addon, base, addon, speed };
  }

  function updatePrice(){
    const p = pricing.products[productSel.value];
    if (!p) {
      productPrice.textContent = '';
      return;
    }
    const { total, addon } = calcTotal(p);
    const money = fmtMoney(total, displayCurrency, locale);
    if (addon > 0) {
      const addonMoney = fmtMoney(addon, displayCurrency, locale);
      productPrice.textContent = isEn
        ? `Price: ${money} (rush fee included: ${addonMoney})`
        : (isZhCn ? `价格：${money}（含加急：${addonMoney}）` : `價格：${money}（含加急：${addonMoney}）`);
    } else {
      productPrice.textContent = isEn
        ? `Price: ${money}`
        : (isZhCn ? `价格：${money}` : `價格：${money}`);
    }
  }
  updatePrice();
  productSel.addEventListener('change', updatePrice);
  speedSel?.addEventListener('change', updatePrice);

  async function setStatus(kind, msg){
    statusEl.className = `notice ${kind==='danger'?'danger':''}`;
    statusEl.textContent = msg;
    statusEl.style.display = 'block';
  }

  const passportInput = qs('#passport');
  const photoInput = qs('#photo');

  passportInput.addEventListener('change', async () => {
    if (!passportInput.files?.[0]) return;
    await setStatus('info', isEn ? 'Checking passport bio page image…' : (isZhCn ? '正在检查护照资料页图片…' : '正在檢查護照資料頁圖片…'));
    const r = await validateImageFile(passportInput.files[0], { kind:'passport', minWidth: 900, minHeight: 600, maxMB: 8 });
    if (!r.ok) {
      passportInput.value = '';
      await setStatus('danger', (isEn?'Passport bio page does not meet requirements: ':(isZhCn?'护照资料页不符合要求：':'護照資料頁不符合要求：')) + (r.message || r.reason));
    } else {
      await setStatus('info', (isEn?'Passport bio page OK. ':(isZhCn?'护照资料页 OK。':'護照資料頁 OK。')) + `（${r.meta.width}×${r.meta.height}）`);
    }
  });

  photoInput.addEventListener('change', async () => {
    if (!photoInput.files?.[0]) return;
    await setStatus('info', isEn ? 'Checking ID photo…' : (isZhCn ? '正在检查证件照…' : '正在檢查證件照…'));
    const r = await validateImageFile(photoInput.files[0], { kind:'photo', minWidth: 600, minHeight: 600, maxMB: 6 });
    if (!r.ok) {
      photoInput.value = '';
      await setStatus('danger', (isEn?'ID photo does not meet requirements: ':(isZhCn?'证件照不符合要求：':'證件照不符合要求：')) + (r.message || r.reason));
    } else {
      await setStatus('info', (isEn?'ID photo OK. ':(isZhCn?'证件照 OK。':'證件照 OK。')) + `（${r.meta.width}×${r.meta.height}）`);
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Basic client validation
    const email = qs('#email').value.trim();
    const phone = phoneEl?.value?.trim() || '';
    const address = addressEl?.value?.trim() || '';
    const nationality = nationalityEl?.value || '';
    const entryGate = entryGateEl?.value || '';

    const msgEmail = isEn ? 'Please enter a valid email.' : (isZhCn ? '请输入有效邮箱。' : '請輸入有效 Email。');
    const msgPhone = isEn ? 'Please enter a phone number.' : (isZhCn ? '请输入联系电话。' : '請輸入聯絡電話。');
    const msgAddr  = isEn ? 'Please enter your address in English.' : (isZhCn ? '请填写英文地址。' : '請填寫英文地址。');
    const msgNat   = isEn ? 'Please select nationality.' : (isZhCn ? '请选择国籍。' : '請選擇國籍。');
    const msgGate  = isEn ? 'Please select entry gate.' : (isZhCn ? '请选择入境口岸。' : '請選擇入境口岸。');
    const msgFiles = isEn ? 'Please upload passport bio page and ID photo.' : (isZhCn ? '请上传护照资料页与证件照。' : '請上傳護照資料頁與證件照。');

    if (!email || !email.includes('@')) return setStatus('danger', msgEmail);
    if (!phone) return setStatus('danger', msgPhone);
    if (!address) return setStatus('danger', msgAddr);
    if (!nationality) return setStatus('danger', msgNat);
    if (!entryGate) return setStatus('danger', msgGate);
    if (!passportInput.files?.[0] || !photoInput.files?.[0]) return setStatus('danger', msgFiles);


    // MVP: create order ticket (no file upload to storage yet)
    form.querySelector('button[type=submit]').disabled = true;
    await setStatus('info', isEn ? 'Creating order…' : (isZhCn ? '正在建立订单…' : '正在建立訂單…'));

    const payload = {
      locale,
      product: productSel.value,
      speed: speedSel?.value || 'STD_5_7',
      email,
      phone,
      address,
      arrival: qs('#arrival').value,
      nationality,
      entryGate,
      notes: qs('#notes').value
    };

    try {
      const res = await fetch('/.netlify/functions/create_order', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'create_order_failed');

      // Show payment instruction
      const p = pricing.products[payload.product];
      const { total } = calcTotal(p);
      const msg = isEn
        ? `Order created: ${data.orderId}\nAmount: ${fmtMoney(total, displayCurrency, locale)}\n\nNext: please complete payment using the details shown on this page, then send us the transfer info / TXID. We will start processing the same day once payment info is received.`
        : (isZhCn
          ? `订单已建立：${data.orderId}\n应付金额：${fmtMoney(total, displayCurrency, locale)}\n\n下一步：请依网页显示的转账资讯完成付款，并回复转账末五码/截图或 TXID。我们收到付款资讯后，当天立刻处理。`
          : `訂單已建立：${data.orderId}\n應付金額：${fmtMoney(total, displayCurrency, locale)}\n\n下一步：請依網頁顯示的轉帳資訊完成付款，並回傳轉帳末五碼/截圖或 TXID。我們收到付款資訊後，當天立刻處理。`
        );
      await setStatus('info', msg);
      qs('#orderId').textContent = data.orderId;
      qs('#paymentBox').style.display = 'block';
    } catch (err) {
      await setStatus('danger', (isEn?'Failed to create order: ':(isZhCn?'建立订单失败：':'建立訂單失敗：')) + err.message);
      form.querySelector('button[type=submit]').disabled = false;
    }
  });
}

window.__VD_init = main;
