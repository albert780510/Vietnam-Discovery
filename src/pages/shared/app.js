import { validateImageFile } from './uploader.js';

async function loadJson(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`failed_to_load_${path}`);
  return res.json();
}

async function loadPricing() {
  return loadJson('/shared/config.pricing.json');
}

function fmtTwd(n){
  return `NT$ ${Number(n).toLocaleString('zh-TW')}`;
}

function qs(sel){return document.querySelector(sel)}

async function main(locale){
  const pricing = await loadPricing();
  const productSel = qs('#product');
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
  if (lineLink) lineLink.textContent = (locale==='en'?'LINE: albert780510':'LINE：albert780510');
  if (lineLink) lineLink.href = 'https://line.me/R/ti/p/@albert780510';
  if (fbGroupLink) {
    fbGroupLink.textContent = (locale==='en'?'Facebook group':'Facebook 社團');
    fbGroupLink.href = 'https://www.facebook.com/share/1CFZKSjVzy/?mibextid=wwXIfr';
    fbGroupLink.target = '_blank';
    fbGroupLink.rel = 'noopener';
  }
  if (wechatId) wechatId.textContent = 's20389741';

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

  // Populate products with price inline
  for (const [key, p] of Object.entries(pricing.products)){
    const opt = document.createElement('option');
    opt.value = key;
    const label = p.label[locale] || p.label['zh-TW'] || key;
    opt.textContent = `${label}（${fmtTwd(p.price)}）`;
    productSel.appendChild(opt);
  }

  function updatePrice(){
    const p = pricing.products[productSel.value];
    if (!p) {
      productPrice.textContent = '';
      return;
    }
    productPrice.textContent = locale==='zh-CN' ? `价格：${fmtTwd(p.price)}` : `價格：${fmtTwd(p.price)}`;
  }
  updatePrice();
  productSel.addEventListener('change', updatePrice);

  async function setStatus(kind, msg){
    statusEl.className = `notice ${kind==='danger'?'danger':''}`;
    statusEl.textContent = msg;
    statusEl.style.display = 'block';
  }

  const passportInput = qs('#passport');
  const photoInput = qs('#photo');

  passportInput.addEventListener('change', async () => {
    if (!passportInput.files?.[0]) return;
    await setStatus('info', locale==='zh-CN' ? '正在检查护照资料页图片…' : '正在檢查護照資料頁圖片…');
    const r = await validateImageFile(passportInput.files[0], { kind:'passport', minWidth: 900, minHeight: 600, maxMB: 8 });
    if (!r.ok) {
      passportInput.value = '';
      await setStatus('danger', (locale==='zh-CN'?'护照资料页不符合要求：':'護照資料頁不符合要求：') + (r.message || r.reason));
    } else {
      await setStatus('info', (locale==='zh-CN'?'护照资料页 OK。':'護照資料頁 OK。') + `（${r.meta.width}×${r.meta.height}）`);
    }
  });

  photoInput.addEventListener('change', async () => {
    if (!photoInput.files?.[0]) return;
    await setStatus('info', locale==='zh-CN' ? '正在检查证件照…' : '正在檢查證件照…');
    const r = await validateImageFile(photoInput.files[0], { kind:'photo', minWidth: 600, minHeight: 600, maxMB: 6 });
    if (!r.ok) {
      photoInput.value = '';
      await setStatus('danger', (locale==='zh-CN'?'证件照不符合要求：':'證件照不符合要求：') + (r.message || r.reason));
    } else {
      await setStatus('info', (locale==='zh-CN'?'证件照 OK。':'證件照 OK。') + `（${r.meta.width}×${r.meta.height}）`);
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

    const msgEmail = locale==='zh-CN'?'请输入有效邮箱。':(locale==='en'?'Please enter a valid email.':'請輸入有效 Email。');
    const msgPhone = locale==='zh-CN'?'请输入联系电话。':(locale==='en'?'Please enter a phone number.':'請輸入聯絡電話。');
    const msgAddr  = locale==='zh-CN'?'请填写英文地址。':(locale==='en'?'Please enter your address in English.':'請填寫英文地址。');
    const msgNat   = locale==='zh-CN'?'请选择国籍。':(locale==='en'?'Please select nationality.':'請選擇國籍。');
    const msgGate  = locale==='zh-CN'?'请选择入境口岸。':(locale==='en'?'Please select entry gate.':'請選擇入境口岸。');
    const msgFiles = locale==='zh-CN'?'请上传护照资料页与证件照。':(locale==='en'?'Please upload passport bio page and ID photo.':'請上傳護照資料頁與證件照。');

    if (!email || !email.includes('@')) return setStatus('danger', msgEmail);
    if (!phone) return setStatus('danger', msgPhone);
    if (!address) return setStatus('danger', msgAddr);
    if (!nationality) return setStatus('danger', msgNat);
    if (!entryGate) return setStatus('danger', msgGate);
    if (!passportInput.files?.[0] || !photoInput.files?.[0]) return setStatus('danger', msgFiles);


    // MVP: create order ticket (no file upload to storage yet)
    form.querySelector('button[type=submit]').disabled = true;
    await setStatus('info', locale==='zh-CN'?'正在建立订单…':'正在建立訂單…');

    const payload = {
      locale,
      product: productSel.value,
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
      const price = p?.price;
      const msg = locale==='zh-CN'
        ? `订单已建立：${data.orderId}\n应付金额：${fmtTwd(price)}\n\n下一步：请依网页显示的转账资讯完成付款，并回复转账末五码/截图。我们确认收款后会开始送件。`
        : `訂單已建立：${data.orderId}\n應付金額：${fmtTwd(price)}\n\n下一步：請依網頁顯示的轉帳資訊完成付款，並回傳轉帳末五碼/截圖。我們確認收款後會開始送件。`;
      await setStatus('info', msg);
      qs('#orderId').textContent = data.orderId;
      qs('#paymentBox').style.display = 'block';
    } catch (err) {
      await setStatus('danger', (locale==='zh-CN'?'建立订单失败：':'建立訂單失敗：') + err.message);
      form.querySelector('button[type=submit]').disabled = false;
    }
  });
}

window.__VD_init = main;
