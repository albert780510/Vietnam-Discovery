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

    const eth = window.ethereum;
    if (!eth || typeof eth.request !== 'function') {
      // MetaMask not available
      const txidInput = qs('#txid');
      const host = txidInput?.closest('div') || proofForm || document.body;
      const hint = document.createElement('div');
      hint.className = 'help';
      hint.style.marginTop = '8px';
      hint.textContent = isEn
        ? 'Tip: Install/enable MetaMask to pay USDT automatically. Otherwise you can pay by copying the address + QR below.'
        : (isZhCn ? '提示：若要自动打开小狐狸支付 USDT，请先安装/启用 MetaMask。否则可用下方地址/二维码自行转账。' : '提示：若要自動打開小狐狸支付 USDT，請先安裝/啟用 MetaMask。否則可用下方地址/QR 自行轉帳。');
      host.appendChild(hint);
      return;
    }

    const host = txidInput.closest('div') || proofForm || document.body;
    const box = document.createElement('div');
    box.style.marginTop = '8px';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.style.padding = '10px 12px';
    btn.style.fontSize = '14px';
    btn.textContent = isEn
      ? 'Pay USDT with MetaMask'
      : (isZhCn ? '用小狐狸钱包支付 USDT' : '用小狐狸錢包支付 USDT');

    const help = document.createElement('div');
    help.className = 'help';
    help.style.marginTop = '6px';
    help.textContent = isEn
      ? 'Requires MetaMask and BNB for gas (BSC network). After payment, the TXID will be filled automatically.'
      : (isZhCn ? '需要小狐狸钱包，并确保在 BSC 网络且有少量 BNB 作为手续费。付款后会自动填入 TXID。' : '需要小狐狸錢包，並確保在 BSC 網路且有少量 BNB 作為手續費。付款後會自動填入 TXID。');

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

    async function ensureBsc(){
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

        await ensureBsc();

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
    const amountInput = qs('#payAmount');

    const txidRow = txidInput?.closest('.row');
    const last5Row = last5Input?.closest('.row');
    const proofRow = proofInput?.closest('div');
    const amountRow = amountInput?.closest('.row');

    function setHidden(el, hidden){
      if (!el) return;
      el.classList.toggle('hidden', !!hidden);
    }

    function updatePayUI(){
      const m = methodSel?.value || '';

      // Payment info blocks
      setActive(payInfoTwd, m === 'TWD');
      setActive(payInfoCny, m === 'CNY');

      // Field visibility
      // USDT: show TXID; hide last5 + proof screenshot + amount
      // TWD: show last5 + proof screenshot + amount(optional); hide TXID
      // CNY: show proof screenshot + amount(optional); hide TXID + last5
      setHidden(txidRow, m !== 'USDT');
      setHidden(last5Row, m !== 'TWD');
      setHidden(proofRow, !(m === 'TWD' || m === 'CNY'));
      setHidden(amountRow, m === 'USDT');

      // Required hints (UX only; submit handler still validates)
      if (txidInput) txidInput.required = (m === 'USDT');
      if (last5Input) last5Input.required = false; // keep optional; we still recommend
      if (proofInput) proofInput.required = (m === 'TWD' || m === 'CNY');
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
      const amount = qs('#payAmount')?.value?.trim() || '';
      const currency = qs('#payCurrency')?.value || '';
      const note = qs('#payNote')?.value?.trim() || '';

      const contactMethod = qs('#contactMethod')?.value || '';
      const contactValue = qs('#contactValue')?.value?.trim() || '';

      const file = qs('#proofImage')?.files?.[0];
      let proofImage = '';
      if (file) {
        const r = await validateImageFile(file, { kind:'photo', minWidth: 400, minHeight: 400, maxMB: 6 });
        if (!r.ok) {
          return setStatus('danger', (isEn?'Payment proof image is invalid: ':(isZhCn?'付款截图不符合要求：':'付款截圖不符合要求：')) + (r.message || r.reason));
        }
        proofImage = await new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(String(fr.result || ''));
          fr.onerror = () => reject(new Error('file_read_failed'));
          fr.readAsDataURL(file);
        });
      }

      if (!orderId) return setStatus('danger', isEn ? 'Missing Order ID.' : (isZhCn ? '缺少订单编号。' : '缺少訂單編號。'));
      if (!method) return setStatus('danger', isEn ? 'Please choose a payment method.' : (isZhCn ? '请选择付款方式。' : '請選擇付款方式。'));
      if (!contactMethod) return setStatus('danger', isEn ? 'Please choose your preferred contact method.' : (isZhCn ? '请选择你的联系方式类型。' : '請選擇你的聯絡方式類型。'));
      if (!contactValue) return setStatus('danger', isEn ? 'Please enter your contact.' : (isZhCn ? '请填写你的联系方式。' : '請填寫你的聯絡方式。'));

      // minimal requirements
      if (method === 'USDT' && !txid) return setStatus('danger', isEn ? 'Please enter TXID.' : (isZhCn ? '请填写 TXID。' : '請填寫 TXID。'));
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
            contactMethod,
            contactValue,
            txid: txid || undefined,
            last5: last5 || undefined,
            amount: amount || undefined,
            currency: currency || undefined,
            note: note || undefined,
            proofImage: proofImage || undefined
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'submit_failed');

        await setStatus('info', isEn
          ? 'Payment info submitted. We will start processing the same day once confirmed.'
          : (isZhCn ? '付款信息已提交，我们确认后当天立刻处理。' : '付款資訊已提交，我們確認後當天立刻處理。')
        );
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
