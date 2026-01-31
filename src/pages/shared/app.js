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
    fbGroupLink.textContent = 'Vietnam Discovery';
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

  function calcTotalForCurrency(p, currency){
    const base = Number(p?.prices?.[currency] ?? NaN);
    const speed = speedSel?.value || 'STD_5_7';
    const addon = Number(p?.rushAddons?.[currency]?.[speed] ?? 0);
    if (!Number.isFinite(base)) return { total: NaN, base: NaN, addon: 0, speed };
    return { total: base + addon, base, addon, speed };
  }

  function calcTotal(p){
    return calcTotalForCurrency(p, displayCurrency);
  }

  // Prominent total banner (especially for rush)
  let totalBanner = qs('#totalBanner');
  if (!totalBanner && productPrice) {
    totalBanner = document.createElement('div');
    totalBanner.id = 'totalBanner';
    totalBanner.className = 'totalBanner';
    productPrice.insertAdjacentElement('afterend', totalBanner);
  }

  function updatePrice(){
    const p = pricing.products[productSel.value];
    if (!p) {
      if (productPrice) productPrice.textContent = '';
      if (totalBanner) totalBanner.style.display = 'none';
      return;
    }
    const { total, addon } = calcTotal(p);
    const money = fmtMoney(total, displayCurrency, locale);

    // Small line (existing)
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

    // Prominent banner
    if (totalBanner) {
      totalBanner.style.display = 'block';
      if (addon > 0) {
        const addonMoney = fmtMoney(addon, displayCurrency, locale);
        totalBanner.innerHTML = isEn
          ? `Total to pay: ${money}<span class="sub">Rush fee included: ${addonMoney}</span>`
          : (isZhCn
            ? `应付总金额：${money}<span class="sub">含加急：${addonMoney}</span>`
            : `應付總金額：${money}<span class="sub">含加急：${addonMoney}</span>`
          );
      } else {
        totalBanner.innerHTML = isEn
          ? `Total to pay: ${money}`
          : (isZhCn ? `应付总金额：${money}` : `應付總金額：${money}`);
      }
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

  // Simple modal (used for important confirmations like payment submission)
  function showModal({ title, bodyHtml }){
    let overlay = document.querySelector('#vd-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'vd-modal';
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.background = 'rgba(0,0,0,.66)';
      overlay.style.display = 'none';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = '10000';
      overlay.innerHTML = `
        <div id="vd-modal-card" style="width:min(560px,92vw);border-radius:16px;border:1px solid rgba(255,255,255,.14);background:rgba(12,16,28,.98);box-shadow:0 18px 60px rgba(0,0,0,.45);padding:18px 16px;color:#fff">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
            <div>
              <div id="vd-modal-title" style="font-size:16px;font-weight:700;line-height:1.3"></div>
              <div style="height:8px"></div>
            </div>
            <button id="vd-modal-close" type="button" class="btn" style="padding:8px 10px;min-height:auto">${isEn ? 'Close' : (isZhCn ? '关闭' : '關閉')}</button>
          </div>
          <div id="vd-modal-body" style="color:rgba(255,255,255,.9);font-size:14px;line-height:1.55"></div>
        </div>
      `;
      overlay.addEventListener('click', (e) => {
        // Click outside card closes
        if (e.target === overlay) overlay.style.display = 'none';
      });
      document.body.appendChild(overlay);
      overlay.querySelector('#vd-modal-close')?.addEventListener('click', () => {
        overlay.style.display = 'none';
      });
    }

    const titleEl = overlay.querySelector('#vd-modal-title');
    const bodyEl = overlay.querySelector('#vd-modal-body');
    if (titleEl) titleEl.textContent = title || '';
    if (bodyEl) bodyEl.innerHTML = bodyHtml || '';
    overlay.style.display = 'flex';
  }

  function paymentSubmittedModalHtml(){
    const title = isEn
      ? 'Payment info submitted'
      : (isZhCn ? '付款信息已提交' : '付款資訊已提交');

    const msg = isEn
      ? 'We will start processing the same day once confirmed. If you have any questions, please contact us below to confirm.'
      : (isZhCn
        ? '我们确认后当天立刻处理。如有疑问，请通过以下联系方式联系确认。'
        : '我們確認後當天立刻處理。如有疑問，請透過以下聯絡方式確認。'
      );

    const contactsLabel = isEn ? 'Contact' : (isZhCn ? '联络方式' : '聯絡方式');
    const lineLabel = 'LINE';
    const tgLabel = 'Telegram';
    const waLabel = 'WhatsApp';
    const zaloLabel = 'Zalo';
    const fbLabel = isEn ? 'Facebook Group' : (isZhCn ? 'Facebook 群组' : 'Facebook 社團');
    const wechatLabel = isEn ? 'WeChat' : (isZhCn ? '微信' : '微信');

    // Keep it simple: show what we already display on the page.
    const line = 'albert780510';
    const tg = '@AlbertLaipi';
    const tgUrl = 'https://t.me/AlbertLaipi';
    const waUrl = 'https://wa.me/qr/WMWEEYWG32N7H1';
    const zaloUrl = 'https://zaloapp.com/qr/p/1m345knav588v';
    const fbUrl = 'https://www.facebook.com/share/1CFZKSjVzy/?mibextid=wwXIfr';
    const wechat = 's20389741';

    return { title, bodyHtml: `
      <div style="padding:8px 0 12px">${msg}</div>
      <div style="margin-top:6px;font-weight:700">${contactsLabel}</div>
      <ul style="margin:8px 0 0;padding-left:18px">
        <li>${lineLabel}: <a href="https://line.me/R/ti/p/${line}" target="_blank" rel="noopener" style="color:#9ad7ff">${line}</a></li>
        <li>${tgLabel}: <a href="${tgUrl}" target="_blank" rel="noopener" style="color:#9ad7ff">${tg}</a></li>
        <li>${waLabel}: <a href="${waUrl}" target="_blank" rel="noopener" style="color:#9ad7ff">${waLabel}</a></li>
        <li>${zaloLabel}: <a href="${zaloUrl}" target="_blank" rel="noopener" style="color:#9ad7ff">${zaloLabel}</a></li>
        <li>${fbLabel}: <a href="${fbUrl}" target="_blank" rel="noopener" style="color:#9ad7ff">Vietnam Discovery</a></li>
        <li>${wechatLabel}: <span style="color:rgba(255,255,255,.92)">${wechat}</span></li>
      </ul>
    `};
  }

  async function imageFileToJpegDataUrl(file, { maxSide = 1400, quality = 0.86 } = {}){
    if (!file) return '';
    if (!String(file.type || '').startsWith('image/')) return '';
    // Basic size guard (before compression)
    const maxMB = 10;
    if (file.size > maxMB * 1024 * 1024) throw new Error('file_too_large');

    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = url;
      });
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const scale = Math.min(1, maxSide / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));

      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, cw, ch);
      return canvas.toDataURL('image/jpeg', quality);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const passportInput = qs('#passport');
  const photoInput = qs('#photo');

  // Date picker helper
  const arrivalInput = qs('#arrival');
  const openDateBtn = qs('[data-open-date]');
  if (arrivalInput) {
    // Prevent selecting dates before today.
    const today = new Date();
    today.setHours(0,0,0,0);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const min = `${yyyy}-${mm}-${dd}`;
    arrivalInput.min = min;

    // If an old value is already set (< min), clear it.
    if (arrivalInput.value && arrivalInput.value < min) arrivalInput.value = '';
  }
  if (openDateBtn && arrivalInput) {
    openDateBtn.addEventListener('click', () => {
      // showPicker is supported in Chromium; fallback to focus/click
      if (typeof arrivalInput.showPicker === 'function') arrivalInput.showPicker();
      else { arrivalInput.focus(); arrivalInput.click(); }
    });
  }

  // MetaMask (USDT on BSC) helper
  async function setupMetaMaskPay(){
    const txidInput = qs('#txid');
    const methodSel = qs('#payMethod');
    if (!txidInput || !methodSel) return;

    // NOTE: On iOS, MetaMask only injects `window.ethereum` inside the MetaMask in-app browser.
    // So we always show the button; if MetaMask isn't available, the button deep-links to MetaMask.

    // Mount the MetaMask CTA next to the payment method (not inside TXID field),
    // so we can hide the TXID input without hiding the button.
    const methodWrap = methodSel?.closest('div');
    const host = methodWrap || proofForm || document.body;
    const box = document.createElement('div');
    box.id = 'vd-metamask-box';
    box.style.marginTop = '8px';
    // hidden by default; USDT chooser will reveal it
    box.classList.add('hidden');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn metamaskBtn';
    btn.textContent = isEn
      ? 'Pay USDT with MetaMask'
      : (isZhCn ? '用小狐狸钱包支付 USDT' : '用小狐狸錢包支付 USDT');

    const help = document.createElement('div');
    help.className = 'help';
    help.style.marginTop = '6px';
    help.textContent = isEn
      ? 'Requires MetaMask and a little BNB for gas (BSC). After payment, TXID will be filled automatically. On iPhone: open this page in the MetaMask app browser.'
      : (isZhCn
        ? '需要小狐狸钱包，并确保在 BSC 网络且有少量 BNB 作为手续费。付款后会自动填入 TXID。iPhone 请用 MetaMask App 内置浏览器打开本页。'
        : '需要小狐狸錢包，並確保在 BSC 網路且有少量 BNB 作為手續費。付款後會自動填入 TXID。iPhone 請用 MetaMask App 內建瀏覽器開啟本頁。'
      );

    box.appendChild(btn);
    box.appendChild(help);
    host.appendChild(box);

    function toHex32(n){
      const hex = n.toString(16);
      return hex.padStart(64, '0');
    }

    function encodeTransfer(to, amountUnits){
      // ERC20 transfer(address,uint256)
      const selector = 'a9059cbb';
      const addr = String(to).toLowerCase().replace(/^0x/, '').padStart(64, '0');
      const amt = toHex32(amountUnits);
      return '0x' + selector + addr + amt;
    }

    async function ensureBsc(eth){
      const chainId = await eth.request({ method: 'eth_chainId' });
      if (chainId === '0x38') return;
      try {
        await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x38' }] });
      } catch (e) {
        // Try add chain then switch
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x38',
            chainName: 'BNB Smart Chain',
            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
            rpcUrls: ['https://bsc-dataseed.binance.org/'],
            blockExplorerUrls: ['https://bscscan.com']
          }]
        });
      }
    }

    function autoSubmitProof(){
      if (!proofForm) return;
      // Ensure the TXID is already in the field before submit handler reads it.
      setTimeout(() => {
        if (typeof proofForm.requestSubmit === 'function') proofForm.requestSubmit();
        else proofForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }, 0);
    }

    btn.addEventListener('click', async () => {
      try {
        // Do not block MetaMask popup on missing contact fields.
        // We will still require contact fields when the user submits payment proof.

        const eth = window.ethereum;
        if (!eth || typeof eth.request !== 'function') {
          const dappUrl = `${location.host}${location.pathname}${location.search || ''}`;
          const mmLink = `https://metamask.app.link/dapp/${dappUrl}`;
          await setStatus('danger', isEn
            ? 'MetaMask is not detected in this browser. Opening MetaMask…'
            : (isZhCn ? '当前浏览器未检测到 MetaMask，正在打开 MetaMask…' : '目前瀏覽器未偵測到 MetaMask，正在打開 MetaMask…')
          );
          location.href = mmLink;
          return;
        }

        const p = pricing.products[productSel.value];
        const { total: usdtTotal } = calcTotalForCurrency(p, 'USDT');
        if (!Number.isFinite(usdtTotal)) {
          return setStatus('danger', isEn
            ? 'USDT pricing not available for this product. Please pay using the address + QR code.'
            : (isZhCn ? '该产品没有 USDT 定价，请使用地址/二维码转账。' : '此產品沒有 USDT 定價，請使用地址/QR 轉帳。')
          );
        }

        // Force method to USDT
        methodSel.value = 'USDT';

        await setStatus('info', isEn
          ? `Opening MetaMask… Amount: USDT ${usdtTotal}`
          : (isZhCn ? `正在打开小狐狸… 金额：USDT ${usdtTotal}` : `正在打開小狐狸… 金額：USDT ${usdtTotal}`)
        );

        const accounts = await eth.request({ method: 'eth_requestAccounts' });
        const from = accounts?.[0];
        if (!from) throw new Error('no_wallet_account');

        await ensureBsc(eth);

        // Receiver: Binance deposit address on BSC (BEP20)
        const receiver = '0xc0a7a1f638983bb8dcb64b5249d8f9ecaa6d4489';
        const usdtContract = '0x55d398326f99059fF775485246999027B3197955';
        const decimals = 6n;

        const units = BigInt(Math.round(Number(usdtTotal) * 1e6));
        const data = encodeTransfer(receiver, units);

        const txHash = await eth.request({
          method: 'eth_sendTransaction',
          params: [{
            from,
            to: usdtContract,
            value: '0x0',
            data
          }]
        });

        if (txHash) {
          txidInput.value = String(txHash);
          await setStatus('info', isEn
            ? `Payment sent. TXID filled. Submitting payment info…\n${txHash}`
            : (isZhCn ? `已发送付款，TXID 已自动填入。正在自动提交付款信息…\n${txHash}` : `已發送付款，TXID 已自動填入。正在自動提交付款資訊…\n${txHash}`)
          );
          autoSubmitProof();
        }
      } catch (err) {
        await setStatus('danger', (isEn?'MetaMask payment failed: ':(isZhCn?'小狐狸付款失败：':'小狐狸付款失敗：')) + (err?.message || String(err)));
      }
    });
  }

  // Payment proof submission
  const proofForm = qs('#paymentProofForm');
  if (proofForm) {
    // Toggle payment info blocks based on selected method
    const methodSel = qs('#payMethod');
    const payInfoTwd = qs('#payInfoTwd');
    const payInfoCny = qs('#payInfoCny');

    // Add a class so CSS can control visibility
    payInfoTwd?.classList.add('payInfo');
    payInfoCny?.classList.add('payInfo');

    // Ensure QR images are not distorted
    const img = qs('#payInfoCny img');
    if (img) img.classList.add('payQr');

    function setActive(el, on){
      if (!el) return;
      el.classList.toggle('active', !!on);
    }

    const txidInput = qs('#txid');
    const last5Input = qs('#last5');
    const proofInput = qs('#proofImage');
    const amountInput = null; // removed (no longer needed)

    // In the HTML, payMethod select and TXID live in the same row, so we control them separately.
    const methodWrap = methodSel?.closest('div');
    const txidWrap = txidInput?.closest('div');

    const txidRow = txidInput?.closest('.row');
    const last5Row = last5Input?.closest('.row');
    const proofRow = proofInput?.closest('div');
    const amountRow = null;

    function setHidden(el, hidden){
      if (!el) return;
      el.classList.toggle('hidden', !!hidden);
    }

    const payTitleEl = qs('#paymentProof > div'); // first title div inside paymentProof
    const payHelpEl = qs('#paymentProof .help');

    // USDT mode is chosen via modal wizard (see create-order flow below).
    let usdtMode = null; // null | metamask | exchange
    function setUsdtMode(v){
      usdtMode = (v === 'metamask' || v === 'exchange') ? v : null;
      updatePayUI();
    }

    // Expose setter so the payment wizard can control the mode.
    window.__VD_setUsdtMode = setUsdtMode;

    function updatePayUI(){
      const m = methodSel?.value || '';

      // Payment info blocks
      setActive(payInfoTwd, m === 'TWD');
      setActive(payInfoCny, m === 'CNY');

      // If paying in CNY, hide the TWD bank block entirely.
      if (payInfoTwd) payInfoTwd.style.display = (m === 'CNY') ? 'none' : '';

      // If paying in USDT, lock the payment method (no switching) and keep UI minimal.
      if (m === 'USDT') {
        // Hide the dropdown, keep a static label.
        if (methodWrap) {
          const sel = methodWrap.querySelector('select');
          if (sel) sel.classList.add('hidden');
          let staticEl = methodWrap.querySelector('#vd-method-static');
          if (!staticEl) {
            staticEl = document.createElement('div');
            staticEl.id = 'vd-method-static';
            staticEl.className = 'small';
            staticEl.style.marginTop = '6px';
            methodWrap.appendChild(staticEl);
          }
          staticEl.textContent = isEn ? 'USDT' : 'USDT';
        }

        // Ask user to choose MetaMask vs Exchange transfer first.
        renderUsdtChooser();

        const metaBox = document.querySelector('#vd-metamask-box');

        if (!usdtMode) {
          // Hide everything until chosen.
          if (metaBox) metaBox.classList.add('hidden');
          const ex = methodWrap.querySelector('#vd-usdt-exchange');
          if (ex) ex.classList.add('hidden');
          if (txidWrap) txidWrap.classList.add('hidden');
        } else if (usdtMode === 'metamask') {
          if (metaBox) metaBox.classList.remove('hidden');
          const ex = methodWrap.querySelector('#vd-usdt-exchange');
          if (ex) ex.classList.add('hidden');
          // Hide TXID input (auto-filled).
          if (txidWrap) txidWrap.classList.add('hidden');
        } else if (usdtMode === 'exchange') {
          if (metaBox) metaBox.classList.add('hidden');
          const ex = renderUsdtExchangeInfo();
          if (ex) ex.classList.remove('hidden');
          // No TXID required; screenshot required.
          if (txidWrap) txidWrap.classList.add('hidden');
        }
      } else {
        // Non-USDT: show dropdown and remove static label + advanced section
        if (methodWrap) {
          const sel = methodWrap.querySelector('select');
          if (sel) sel.classList.remove('hidden');
          const staticEl = methodWrap.querySelector('#vd-method-static');
          if (staticEl) staticEl.remove();
          const chooser = methodWrap.querySelector('#vd-usdt-chooser');
          if (chooser) chooser.remove();
          const ex = methodWrap.querySelector('#vd-usdt-exchange');
          if (ex) ex.remove();
        }
        if (txidWrap) txidWrap.classList.remove('hidden');
        usdtMode = null;
      }

      // Extra UI cleanup for CNY: they only need to upload a payment screenshot.
      const payTotalEl = qs('#payTotal');
      if (payTotalEl) payTotalEl.style.display = (m === 'CNY') ? 'none' : '';

      // Update CNY block contents (Alipay + WeChat Pay)
      if (payInfoCny) {
        const t = payInfoCny.querySelector('div[style*="font-weight:800"]');
        const h = payInfoCny.querySelector('#payInfoCnyHint');
        const grid = payInfoCny.querySelector('#payInfoCnyQr');

        if (t) t.textContent = isEn ? 'CNY payment (Alipay / WeChat Pay)' : (isZhCn ? '人民币付款（支付宝 / 微信支付）' : '人民幣付款（支付寶 / 微信支付）');
        if (h) h.textContent = isEn
          ? 'Scan one QR to pay, then upload the payment screenshot below.'
          : (isZhCn ? '扫码付款（二选一），付款后请在下方上传付款截图。' : '掃碼付款（二選一），付款後請在下方上傳付款截圖。');

        if (grid && !grid.dataset.ready) {
          grid.dataset.ready = '1';
          grid.innerHTML = `
            <div class="payQrItem">
              <div class="t">Alipay</div>
              <img src="/shared/alipay_qr.jpg" alt="Alipay QR" class="payQr payQrZoom" loading="lazy" />
            </div>
            <div class="payQrItem">
              <div class="t">WeChat Pay</div>
              <img src="/shared/wechatpay_qr.jpg" alt="WeChat Pay QR" class="payQr payQrZoom" loading="lazy" />
            </div>
          `;

          // Click-to-zoom for easier scanning
          for (const img of grid.querySelectorAll('img.payQrZoom')) {
            img.style.cursor = 'zoom-in';
            img.addEventListener('click', () => {
              let dlg = document.querySelector('#vd-qr-zoom');
              if (!dlg) {
                dlg = document.createElement('dialog');
                dlg.id = 'vd-qr-zoom';
                dlg.className = 'vd-modal';
                dlg.innerHTML = `
                  <form method="dialog" class="vd-modal__card" style="max-width:min(640px,calc(100vw - 32px))">
                    <div class="vd-modal__title">QR</div>
                    <div class="vd-modal__body" style="padding:0">
                      <img id="vd-qr-zoom-img" alt="QR" style="width:100%;height:auto;display:block;border-radius:12px" />
                    </div>
                    <div class="vd-modal__actions"><button class="btn" value="ok">OK</button></div>
                  </form>
                `;
                document.body.appendChild(dlg);
              }
              const big = dlg.querySelector('#vd-qr-zoom-img');
              if (big) big.src = img.src;
              dlg.showModal();
            });
          }
        }
      }

      // Payment proof title/help (method-specific)
      if (payTitleEl) payTitleEl.textContent = isEn ? 'Payment confirmation' : (isZhCn ? '付款確認' : '付款確認');
      if (payHelpEl) {
        payHelpEl.textContent = (m === 'USDT')
          ? (isEn
            ? 'Choose MetaMask or Exchange transfer below.'
            : (isZhCn ? '请先在下方选择：小狐狸付款 / 交易所转账。' : '請先在下方選擇：小狐狸付款 / 交易所轉帳。')
          )
          : (m === 'TWD' || m === 'CNY')
            ? (isEn
              ? 'After payment, upload a payment screenshot so we can confirm quickly.'
              : (isZhCn ? '付款后请上传付款截图，以便我们快速核对。' : '付款後請上傳付款截圖，以便我們快速核對。')
            )
            : (isEn
              ? 'Choose a payment method to see what to submit.'
              : (isZhCn ? '请选择付款方式后再提交。' : '請選擇付款方式後再提交。')
            );
      }

      // Field visibility
      // USDT (MetaMask): hide TXID input (auto-fill), no screenshot
      // USDT (Exchange transfer): require screenshot
      // TWD: show last5 + proof screenshot + amount(optional); hide TXID
      // CNY: show proof screenshot only; hide TXID + last5 + amount
      setHidden(txidRow, m !== 'USDT');
      setHidden(last5Row, m !== 'TWD');

      const usdtNeedsProof = (m === 'USDT' && usdtMode === 'exchange');
      // Only show the screenshot uploader when needed (TWD/CNY or USDT-exchange).
      setHidden(proofRow, !(m === 'TWD' || m === 'CNY' || usdtNeedsProof));
      setHidden(amountRow, (m === 'USDT' || m === 'CNY'));

      // Required hints (UX only; submit handler still validates)
      if (txidInput) txidInput.required = false;
      if (last5Input) last5Input.required = (m === 'TWD');
      if (proofInput) proofInput.required = (m === 'TWD' || m === 'CNY' || usdtNeedsProof);
    }

    methodSel?.addEventListener('change', updatePayUI);
    updatePayUI();

    setupMetaMaskPay();
    proofForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const orderId = qs('#paymentProof')?.dataset?.orderId || qs('#orderId')?.textContent?.trim();
      const method = qs('#payMethod')?.value || '';
      const txid = qs('#txid')?.value?.trim() || '';
      const last5 = qs('#last5')?.value?.trim() || '';
      const amount = '';
      const currency = qs('#payCurrency')?.value || '';
      const note = qs('#payNote')?.value?.trim() || '';

      const email = qs('#email')?.value?.trim() || '';
      const phone = qs('#phone')?.value?.trim() || '';

      const file = qs('#proofImage')?.files?.[0];
      let proofImage = '';
      if (file) {
        const r = await validateImageFile(file, { kind:'photo', minWidth: 400, minHeight: 400, maxMB: 6 });
        if (!r.ok) {
          return setStatus('danger', (isEn?'Payment proof image is invalid: ':(isZhCn?'付款截图不符合要求：':'付款截圖不符合要求：')) + (r.message || r.reason));
        }
        proofImage = await imageFileToJpegDataUrl(file, { maxSide: 1600, quality: 0.86 });
      }

      // Also attach the two required application images (passport + ID photo) so the bot can post all of them.
      let passportImage = '';
      let idPhotoImage = '';
      try {
        passportImage = await imageFileToJpegDataUrl(passportInput?.files?.[0], { maxSide: 1600, quality: 0.86 });
        idPhotoImage = await imageFileToJpegDataUrl(photoInput?.files?.[0], { maxSide: 1600, quality: 0.86 });
      } catch (e) {
        // If compression fails, continue without blocking payment submission.
      }

      if (!orderId) return setStatus('danger', isEn ? 'Missing Order ID.' : (isZhCn ? '缺少订单编号。' : '缺少訂單編號。'));
      if (!method) return setStatus('danger', isEn ? 'Please choose a payment method.' : (isZhCn ? '请选择付款方式。' : '請選擇付款方式。'));
      if (!email && !phone) return setStatus('danger', isEn ? 'Missing contact info (email/phone).' : (isZhCn ? '缺少联系方式（Email/电话）。' : '缺少聯絡方式（Email/電話）。'));

      // minimal requirements
      // USDT: TXID is auto-filled if using MetaMask. If transferring from an exchange, screenshot is required.
      const usdtModeSel = usdtMode || null;
      const isUsdtExchange = (method === 'USDT' && usdtModeSel === 'exchange');
      const isUsdtMeta = (method === 'USDT' && usdtModeSel === 'metamask');

      if (method === 'USDT' && !usdtModeSel) {
        return setStatus('danger', isEn
          ? 'Please choose MetaMask or Exchange transfer first.'
          : (isZhCn ? '请先选择小狐狸付款或交易所转账。' : '請先選擇小狐狸付款或交易所轉帳。')
        );
      }

      if (isUsdtMeta && !txid) {
        return setStatus('danger', isEn
          ? 'Please use the MetaMask button to pay (TXID will auto-fill).'
          : (isZhCn ? '请使用小狐狸按钮付款（TXID 会自动填入）。' : '請使用小狐狸按鈕付款（TXID 會自動填入）。')
        );
      }

      if (isUsdtExchange && !file) return setStatus('danger', isEn ? 'Please upload an exchange withdrawal screenshot.' : (isZhCn ? '请上传交易所提币截图。' : '請上傳交易所提幣截圖。'));
      if ((method === 'TWD' || method === 'CNY') && !file) return setStatus('danger', isEn ? 'Please upload a payment screenshot.' : (isZhCn ? '请上传付款截图。' : '請上傳付款截圖。'));

      const submitBtn = proofForm.querySelector('button[type=submit]');
      if (submitBtn) submitBtn.disabled = true;
      await setStatus('info', isEn ? 'Submitting payment info…' : (isZhCn ? '正在提交付款信息…' : '正在提交付款資訊…'));

      try {
        const res = await fetch('/.netlify/functions/submit_payment', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            locale,
            orderId,
            method,
            email: email || undefined,
            phone: phone || undefined,
            usdtMode: usdtModeSel || undefined,
            txid: txid || undefined,
            last5: last5 || undefined,
            amount: amount || undefined,
            currency: currency || undefined,
            note: note || undefined,
            passportImage: passportImage || undefined,
            idPhotoImage: idPhotoImage || undefined,
            proofImage: proofImage || undefined
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'submit_failed');

        await setStatus('info', isEn
          ? 'Payment info submitted. We will start processing the same day once confirmed.'
          : (isZhCn ? '付款信息已提交，我们确认后当天立刻处理。' : '付款資訊已提交，我們確認後當天立刻處理。')
        );
        // Better UX: show a modal so users don't miss the confirmation.
        try { showModal(paymentSubmittedModalHtml()); } catch (_) {}
        if (submitBtn) submitBtn.disabled = false;
      } catch (err) {
        await setStatus('danger', (isEn?'Failed to submit payment info: ':(isZhCn?'提交付款信息失败：':'提交付款資訊失敗：')) + err.message);
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // Disabled: client-side image validation (it blocks too often in practice).
  passportInput.addEventListener('change', async () => {
    if (!passportInput.files?.[0]) return;
    await setStatus('info', isEn ? 'Passport bio page uploaded.' : (isZhCn ? '护照资料页已上传。' : '護照資料頁已上傳。'));
  });

  photoInput.addEventListener('change', async () => {
    if (!photoInput.files?.[0]) return;
    await setStatus('info', isEn ? 'ID photo uploaded.' : (isZhCn ? '证件照已上传。' : '證件照已上傳。'));
  });

  // Simple lightbox for QR images (click to enlarge)
  (function setupQrLightbox(){
    if (document.querySelector('#vd-img-lightbox')) return;
    const overlay = document.createElement('div');
    overlay.id = 'vd-img-lightbox';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,.72)';
    overlay.style.display = 'none';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';
    overlay.innerHTML = `
      <div style="max-width:92vw;max-height:92vh">
        <img id="vd-img-lightbox-img" src="" alt="" style="max-width:92vw;max-height:92vh;width:auto;height:auto;border-radius:16px;border:1px solid rgba(255,255,255,.18);background:#fff" />
        <div style="text-align:center;color:rgba(255,255,255,.85);font-size:12px;margin-top:10px">${isEn?'Click anywhere to close':(isZhCn?'点击任意处关闭':'點任意處關閉')}</div>
      </div>
    `;
    overlay.addEventListener('click', () => { overlay.style.display = 'none'; });
    document.body.appendChild(overlay);

    document.addEventListener('click', (e) => {
      const img = e.target?.closest?.('img.payQr');
      if (!img) return;
      e.preventDefault();
      const big = overlay.querySelector('#vd-img-lightbox-img');
      big.src = img.getAttribute('src') || '';
      big.alt = img.getAttribute('alt') || 'QR';
      overlay.style.display = 'flex';
    });
  })();

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
      const tTwd = calcTotalForCurrency(p, 'TWD');
      const tCny = calcTotalForCurrency(p, 'CNY');
      const tUsdt = calcTotalForCurrency(p, 'USDT');

      // Default message uses locale currency for readability.
      const { total, addon } = calcTotal(p);
      const totalMoney = fmtMoney(total, displayCurrency, locale);
      const addonMoney = addon > 0 ? fmtMoney(addon, displayCurrency, locale) : '';

      const msg = isEn
        ? `Order created: ${data.orderId}\nAmount: ${totalMoney}${addon>0?` (rush included: ${addonMoney})`:''}\n\nNext: please choose a payment method, then complete payment and submit proof/TXID.`
        : (isZhCn
          ? `订单已建立：${data.orderId}\n应付金额：${totalMoney}${addon>0?`（含加急：${addonMoney}）`:''}\n\n下一步：请选择付款方式后完成付款，并提交截图或 TXID。`
          : `訂單已建立：${data.orderId}\n應付金額：${totalMoney}${addon>0?`（含加急：${addonMoney}）`:''}\n\n下一步：請先選擇付款方式後完成付款，並提交截圖或 TXID。`
        );
      await setStatus('info', msg);
      qs('#orderId').textContent = data.orderId;

      // Show a payment method chooser first; only then reveal the corresponding payment info + fields.
      const payMethod = qs('#payMethod');
      const paymentBox = qs('#paymentBox');
      const proofBox = qs('#paymentProof');

      function ensurePayDialog(){
        let dlg = document.querySelector('#vd-pay-dialog');
        if (dlg) return dlg;

        dlg = document.createElement('dialog');
        dlg.id = 'vd-pay-dialog';
        dlg.className = 'vd-modal';
        dlg.innerHTML = `
          <form method="dialog" class="vd-modal__card">
            <div class="vd-modal__title">${isEn ? 'Choose payment method' : (isZhCn ? '请选择付款方式' : '請選擇付款方式')}</div>
            <div class="vd-modal__body" style="white-space:normal">
              <div class="help" style="margin-bottom:10px">${isEn ? 'Pick one method to see the correct payment details and fields.' : (isZhCn ? '选择一种付款方式后，系统会显示对应的付款资讯与填写栏位。' : '選擇一種付款方式後，系統會顯示對應的付款資訊與填寫欄位。')}</div>
              <div class="totalBanner" id="vd-pay-amount" style="margin:0 0 10px 0"></div>
              <select id="vd-pay-choice" style="width:100%;margin-top:4px">
                <option value="">${isEn ? 'Select…' : (isZhCn ? '请选择…' : '請選擇…')}</option>
                <option value="TWD">TWD bank transfer</option>
                <option value="CNY">CNY (Alipay)</option>
                <option value="USDT">USDT (MetaMask)</option>
              </select>
            </div>
            <div class="vd-modal__actions" style="gap:10px">
              <button class="btn" value="cancel">${isEn ? 'Cancel' : (isZhCn ? '取消' : '取消')}</button>
              <button class="btn" id="vd-pay-confirm" value="ok">${isEn ? 'Continue' : (isZhCn ? '继续' : '繼續')}</button>
            </div>
          </form>
        `;
        document.body.appendChild(dlg);
        return dlg;
      }

      const dlg = ensurePayDialog();
      const choice = dlg.querySelector('#vd-pay-choice');

      // Update dialog to show amount in the selected payment currency
      const amountLine = dlg.querySelector('#vd-pay-amount');
      function amountFor(method){
        if (method === 'TWD') return fmtMoney(tTwd.total, 'TWD', locale);
        if (method === 'CNY') return fmtMoney(tCny.total, 'CNY', locale);
        if (method === 'USDT') return fmtMoney(tUsdt.total, 'USDT', locale);
        return '';
      }
      function updateDialogAmount(){
        if (!amountLine) return;
        const v = choice?.value || '';
        const money = v ? amountFor(v) : '';
        amountLine.textContent = money
          ? (isEn ? `Amount to pay: ${money}` : (isZhCn ? `应付金额：${money}` : `應付金額：${money}`))
          : (isEn ? 'Select a payment method to see the amount.' : (isZhCn ? '选择付款方式后显示应付金额。' : '選擇付款方式後顯示應付金額。'));
      }

      // Reset selection each new order
      if (choice) choice.value = '';
      choice?.addEventListener('change', updateDialogAmount, { once: false });
      updateDialogAmount();
      dlg.showModal();

      dlg.addEventListener('close', () => {
        const v = choice?.value || '';
        if (!v) return; // user canceled

        // Reveal payment sections
        if (paymentBox) {
          paymentBox.style.display = 'block';

          // Show a prominent amount in the payment section, in the chosen payment currency
          const money = v === 'USDT'
            ? fmtMoney(tUsdt.total, 'USDT', locale)
            : (v === 'CNY'
              ? fmtMoney(tCny.total, 'CNY', locale)
              : fmtMoney(tTwd.total, 'TWD', locale)
            );

          const addonChosen = v === 'USDT' ? tUsdt.addon : (v === 'CNY' ? tCny.addon : tTwd.addon);
          const addonMoneyChosen = addonChosen > 0
            ? (v === 'USDT'
              ? fmtMoney(addonChosen, 'USDT', locale)
              : (v === 'CNY' ? fmtMoney(addonChosen, 'CNY', locale) : fmtMoney(addonChosen, 'TWD', locale))
            )
            : '';

          let el = paymentBox.querySelector('#payTotal');
          if (!el) {
            el = document.createElement('div');
            el.id = 'payTotal';
            el.className = 'totalBanner';
            el.style.marginTop = '10px';
            const orderP = paymentBox.querySelector('p.p');
            if (orderP) orderP.insertAdjacentElement('afterend', el);
            else paymentBox.prepend(el);
          }

          el.innerHTML = addonChosen > 0
            ? (isEn
              ? `Total to pay: ${money}<span class="sub">Rush included: ${addonMoneyChosen}</span>`
              : (isZhCn ? `应付总金额：${money}<span class="sub">含加急：${addonMoneyChosen}</span>` : `應付總金額：${money}<span class="sub">含加急：${addonMoneyChosen}</span>`)
            )
            : (isEn ? `Total to pay: ${money}` : (isZhCn ? `应付总金额：${money}` : `應付總金額：${money}`));
        }
        if (proofBox) {
          proofBox.style.display = 'block';
          proofBox.dataset.orderId = data.orderId;
        }

        // If paying CNY, do not show TWD bank details under the order id.
        const payInfoTwdEl = paymentBox?.querySelector('#payInfoTwd');
        if (payInfoTwdEl) payInfoTwdEl.style.display = (v === 'CNY') ? 'none' : '';

        // Set method then trigger UI update (listeners are already attached)
        if (payMethod) {
          payMethod.value = v;
          payMethod.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, { once: true });
    } catch (err) {
      await setStatus('danger', (isEn?'Failed to create order: ':(isZhCn?'建立订单失败：':'建立訂單失敗：')) + err.message);
      form.querySelector('button[type=submit]').disabled = false;
    }
  });
}

window.__VD_init = main;
