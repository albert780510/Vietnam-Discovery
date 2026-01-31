import { validateImageFile } from './uploader.js';

async function loadPricing() {
  const res = await fetch('../../shared/config.pricing.json');
  return res.json();
}

function fmtTwd(n){
  return `NT$ ${Number(n).toLocaleString('zh-TW')}`;
}

function qs(sel){return document.querySelector(sel)}

async function main(locale){
  const pricing = await loadPricing();
  const productSel = qs('#product');
  const priceEl = qs('#price');
  const form = qs('#lead-form');
  const statusEl = qs('#status');

  // Populate products
  for (const [key, p] of Object.entries(pricing.products)){
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = p.label[locale] || p.label['zh-TW'] || key;
    productSel.appendChild(opt);
  }

  function updatePrice(){
    const p = pricing.products[productSel.value];
    priceEl.textContent = p ? fmtTwd(p.price) : '—';
  }
  updatePrice();
  productSel.addEventListener('change', updatePrice);

  function ensureModal(){
    let dlg = document.querySelector('#vd-modal');
    if (dlg) return dlg;

    dlg = document.createElement('dialog');
    dlg.id = 'vd-modal';
    dlg.className = 'vd-modal';
    dlg.innerHTML = `
      <form method="dialog" class="vd-modal__card">
        <div class="vd-modal__title" id="vd-modal-title"></div>
        <div class="vd-modal__body" id="vd-modal-body"></div>
        <div class="vd-modal__actions">
          <button class="btn" value="ok">OK</button>
        </div>
      </form>
    `;
    document.body.appendChild(dlg);

    // Click outside to close
    dlg.addEventListener('click', (e) => {
      const card = dlg.querySelector('.vd-modal__card');
      if (card && !card.contains(e.target)) dlg.close();
    });

    return dlg;
  }

  function showModal(kind, msg){
    const title = kind === 'danger'
      ? (locale==='zh-CN' ? '请注意' : '請注意')
      : (locale==='zh-CN' ? '提示' : '提示');

    // Fallback for old browsers
    if (!('HTMLDialogElement' in window)) {
      alert(`${title}\n\n${msg}`);
      return;
    }

    const dlg = ensureModal();
    dlg.querySelector('#vd-modal-title').textContent = title;
    dlg.querySelector('#vd-modal-body').textContent = msg;
    dlg.dataset.kind = kind;
    dlg.showModal();
  }

  async function setStatus(kind, msg){
    statusEl.className = `notice ${kind==='danger'?'danger':''}`;
    statusEl.textContent = msg;
    statusEl.style.display = 'block';

    // Make critical issues very obvious
    if (kind === 'danger') showModal(kind, msg);
  }

  const passportInput = qs('#passport');
  const photoInput = qs('#photo');

  passportInput.addEventListener('change', async () => {
    if (!passportInput.files?.[0]) return;

    // 1) Fast client-side checks (speed + better UX)
    await setStatus('info', locale==='zh-CN' ? '正在检查护照资料页图片…' : '正在檢查護照資料頁圖片…');
    const r = await validateImageFile(passportInput.files[0], { kind:'passport', minWidth: 900, minHeight: 600, maxMB: 10 });
    if (!r.ok) {
      passportInput.value = '';
      await setStatus('danger', (locale==='zh-CN'?'护照资料页不符合要求：':'護照資料頁不符合要求：') + (r.message || r.reason));
      return;
    }

    // 2) Server-side MRZ check (reduces official-system rejections)
    await setStatus('info', locale==='zh-CN' ? '正在进行护照 MRZ 自动辨识（防退件）…' : '正在進行護照 MRZ 自動辨識（防退件）…');
    try {
      const fd = new FormData();
      fd.append('file', passportInput.files[0]);
      const res = await fetch('/.netlify/functions/validate_passport', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || data?.error || 'validate_passport_failed');
      if (!data.ok) {
        passportInput.value = '';
        await setStatus('danger', (locale==='zh-CN'?'护照资料页不符合要求：':'護照資料頁不符合要求：') + (data.message || data.reason));
        return;
      }

      const warn = (data.warnings && data.warnings.length)
        ? (locale==='zh-CN' ? '\n\n提醒：' : '\n\n提醒：') + data.warnings.join('；')
        : '';

      await setStatus('info', (locale==='zh-CN'?'护照资料页 OK（MRZ 可辨识）。':'護照資料頁 OK（MRZ 可辨識）。') + `（${r.meta.width}×${r.meta.height}）` + warn);
    } catch (err) {
      // If validation endpoint fails, don't hard-block (avoid false negatives due to infra).
      await setStatus('info', (locale==='zh-CN'
        ? '护照资料页已通过基本检查，但 MRZ 线上辨识暂时不可用；建议确保最底部两行清楚可读。'
        : '護照資料頁已通過基本檢查，但 MRZ 線上辨識暫時不可用；建議確保最底部兩行清楚可讀。'
      ));
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
    if (!email || !email.includes('@')) {
      return setStatus('danger', locale==='zh-CN'?'请输入有效邮箱。':'請輸入有效 Email。');
    }
    if (!passportInput.files?.[0] || !photoInput.files?.[0]) {
      return setStatus('danger', locale==='zh-CN'?'请上传护照资料页与证件照。':'請上傳護照資料頁與證件照。');
    }

    // MVP: create order ticket (no file upload to storage yet)
    form.querySelector('button[type=submit]').disabled = true;
    await setStatus('info', locale==='zh-CN'?'正在建立订单…':'正在建立訂單…');

    const payload = {
      locale,
      product: productSel.value,
      email,
      arrival: qs('#arrival').value,
      nationality: qs('#nationality').value,
      entryGate: qs('#entryGate').value,
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
