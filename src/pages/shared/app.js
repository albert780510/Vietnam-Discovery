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

  // Date picker helper
  const arrivalInput = qs('#arrival');
  const openDateBtn = qs('[data-open-date]');
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
    if (!eth || typeof eth.request !== 'function') return; // MetaMask not available

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

    btn.addEventListener('click', async () => {
      try {
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
            ? `Payment sent. TXID filled. Please click “Submit payment info”.\n${txHash}`
            : (isZhCn ? `已发送付款，TXID 已自动填入。请点击「提交付款信息」。\n${txHash}` : `已發送付款，TXID 已自動填入。請點擊「提交付款資訊」。\n${txHash}`)
          );
        }
      } catch (err) {
        await setStatus('danger', (isEn?'MetaMask payment failed: ':(isZhCn?'小狐狸付款失败：':'小狐狸付款失敗：')) + (err?.message || String(err)));
      }
    });
  }

  // Payment proof submission
  const proofForm = qs('#paymentProofForm');
  if (proofForm) {
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

      // Payment proof submission UI
      const proofBox = qs('#paymentProof');
      if (proofBox) {
        proofBox.style.display = 'block';
        proofBox.dataset.orderId = data.orderId;
      }
    } catch (err) {
      await setStatus('danger', (isEn?'Failed to create order: ':(isZhCn?'建立订单失败：':'建立訂單失敗：')) + err.message);
      form.querySelector('button[type=submit]').disabled = false;
    }
  });
}

window.__VD_init = main;
