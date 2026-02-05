function qs(sel, root=document){return root.querySelector(sel)}

function getParam(name){
  try { return new URLSearchParams(location.search).get(name) || ''; } catch (_) { return ''; }
}

function pickServiceDefault(){
  const v = (getParam('service') || '').toLowerCase();
  const allowed = new Set(['fasttrack','transfer','concierge','business','visa','market_entry','unknown']);
  return allowed.has(v) ? v : '';
}

function buildBriefing(locale){
  const isTW = locale === 'zh-TW';
  const isCN = locale === 'zh-CN';

  const get = (id) => (qs('#' + id)?.value || '').trim();
  const getRadio = (name) => (qs(`input[name="${name}"]:checked`)?.value || '').trim();

  const service = get('service');
  const city = get('city');
  const dates = get('dates');
  const flights = get('flights');
  const pax = get('pax');
  const language = get('language');
  const timing = getRadio('timing');
  const volatility = getRadio('volatility');
  const outcome = getRadio('outcome');

  // Market Entry extra fields (optional)
  const meStage = get('meStage');
  const meCity = get('meCity');
  const meIndustry = get('meIndustry');
  const meTimeline = get('meTimeline');
  const meBudget = get('meBudget');
  const meSectors = [
    qs('#meSectorRetail')?.checked ? (isCN ? '零售' : '零售') : '',
    qs('#meSectorCash')?.checked ? (isCN ? '收现金' : '收現金') : '',
    qs('#meSectorFnb')?.checked ? (isCN ? '餐饮' : '餐飲') : '',
    qs('#meSectorEdu')?.checked ? (isCN ? '教育' : '教育') : '',
    qs('#meSectorTravel')?.checked ? (isCN ? '旅游' : '旅遊') : ''
  ].filter(Boolean).join(' / ');

  const notes = get('notes');
  const contact = get('contact');

  const lines = [];
  lines.push(isCN ? '【付费顾问咨询｜简报】' : '【付費顧問諮詢｜簡報】');
  if (service) lines.push((isCN?'服务：':'服務：') + service);
  if (city) lines.push((isCN?'城市：':'城市：') + city);
  if (dates) lines.push((isCN?'日期/时间：':'日期/時間：') + dates);
  if (flights) lines.push((isCN?'航班/抵达点：':'航班/抵達點：') + flights);
  if (pax) lines.push((isCN?'人数/行李：':'人數/行李：') + pax);
  if (language) lines.push((isCN?'沟通语言：':'溝通語言：') + language);
  if (timing) lines.push((isCN?'时间敏感：':'時間敏感：') + timing);
  if (volatility) lines.push((isCN?'计划变动：':'計畫變動：') + volatility);
  if (outcome) lines.push((isCN?'结果导向：':'結果導向：') + outcome);

  // Market Entry output (only print when any field is provided)
  const hasMe = meStage || meCity || meIndustry || meSectors || meTimeline || meBudget;
  if (hasMe) {
    lines.push(isCN ? '【Market Entry / Company Setup】' : '【Market Entry / Company Setup】');
    if (meStage) lines.push((isCN ? '目前阶段：' : '目前階段：') + meStage);
    if (meCity) lines.push((isCN ? '预计城市：' : '預計城市：') + meCity);
    if (meIndustry) lines.push((isCN ? '预计行业/服务：' : '預計行業/服務：') + meIndustry);
    if (meSectors) lines.push((isCN ? '涉及：' : '涉及：') + meSectors);
    if (meTimeline) lines.push((isCN ? '时间表：' : '時間表：') + meTimeline);
    if (meBudget) lines.push((isCN ? '预算区间：' : '預算區間：') + meBudget);
  }

  if (notes) lines.push((isCN?'补充：':'補充：') + notes);
  if (contact) lines.push((isCN?'联系方式：':'聯絡方式：') + contact);
  return lines.join('\n');
}

function recommend(locale){
  const isTW = locale === 'zh-TW';
  const isCN = locale === 'zh-CN';
  const getRadio = (name) => (qs(`input[name="${name}"]:checked`)?.value || '').trim();
  const timing = getRadio('timing');
  const volatility = getRadio('volatility');
  const outcome = getRadio('outcome');

  const rec = [];
  if (timing === 'High' || timing === '高') rec.push('Fast Track');
  if (volatility === 'Likely' || volatility === '可能') rec.push('On-site Concierge (Half Day / Full Day)');
  if (outcome === 'High' || outcome === '高') rec.push('Business & Executive Support');
  if (!rec.length) rec.push(isCN ? '先从 Fast Track / Transfer 开始，我们再按情况升级 Concierge' : '先從 Fast Track / Transfer 開始，我們再按情況升級 Concierge');

  return isCN ? `推荐：${rec.join(' + ')}` : `建議：${rec.join(' + ')}`;
}

export function initConsultForm(locale){
  const serviceSel = qs('#service');
  if (serviceSel) {
    const d = pickServiceDefault();
    if (d) serviceSel.value = d;
  }

  const form = qs('#consultForm');
  const out = qs('#consultOut');
  const briefingEl = qs('#briefing');
  const recEl = qs('#recommendation');
  const copyBtn = qs('#copyBrief');
  const waBtn = qs('#openWhatsApp');
  const tgBtn = qs('#openTelegram');

  function updateOutputs(){
    const ack = qs('#paidAck');
    const ok = !!ack?.checked;
    const msg = buildBriefing(locale);
    const recMsg = recommend(locale);

    if (briefingEl) briefingEl.value = msg;
    if (recEl) recEl.textContent = recMsg;

    if (copyBtn) copyBtn.disabled = !ok;
    if (waBtn) waBtn.classList.toggle('opacity-50', !ok);
    if (tgBtn) tgBtn.classList.toggle('opacity-50', !ok);
  }

  document.addEventListener('input', (e)=>{
    if (e.target?.closest?.('#consultForm')) updateOutputs();
  });

  copyBtn?.addEventListener('click', async ()=>{
    const ack = qs('#paidAck');
    if (!ack?.checked) return;
    try {
      await navigator.clipboard.writeText(briefingEl?.value || '');
      copyBtn.textContent = (locale==='zh-CN') ? '已复制' : '已複製';
      setTimeout(()=>{ copyBtn.textContent = (locale==='zh-CN') ? '复制简报' : '複製簡報'; }, 1200);
    } catch (_) {
      // ignore
    }
  });

  function openLink(kind){
    const ack = qs('#paidAck');
    if (!ack?.checked) {
      ack?.scrollIntoView?.({ behavior:'smooth', block:'center' });
      return;
    }
    const text = briefingEl?.value || '';
    if (!text) return;

    if (kind === 'wa') {
      // WhatsApp share
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener');
    }
    if (kind === 'tg') {
      // Telegram share
      const url = `https://t.me/share/url?url=&text=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener');
    }
  }

  waBtn?.addEventListener('click', ()=>openLink('wa'));
  tgBtn?.addEventListener('click', ()=>openLink('tg'));

  form?.addEventListener('submit', (e)=>{
    e.preventDefault();
    updateOutputs();
    out?.classList.remove('hidden');
    out?.scrollIntoView?.({ behavior:'smooth', block:'start' });
  });

  updateOutputs();
}
