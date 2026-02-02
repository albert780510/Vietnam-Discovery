export function initLangSelect(locale, { basePathByCode } = {}) {
  const langSelect = document.querySelector('#langSelect');
  if (!langSelect) return;

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'zh-TW', label: '繁體中文' },
    { code: 'zh-CN', label: '简体中文' },
    { code: 'ko', label: '한국어' },
    { code: 'ja', label: '日本語' },
    { code: 'es', label: 'Español' },
    { code: 'ru', label: 'Русский' },
    { code: 'th', label: 'ไทย' },
    { code: 'ms', label: 'Bahasa Melayu' },
    { code: 'id', label: 'Bahasa Indonesia' }
  ];

  function defaultPath(code) {
    if (code === 'zh-TW') return '/zh-tw/';
    if (code === 'zh-CN') return '/zh-cn/';
    return `/${code}/`;
  }

  langSelect.innerHTML = '';
  for (const l of languages) {
    const opt = document.createElement('option');
    opt.value = l.code;
    opt.textContent = l.label;
    langSelect.appendChild(opt);
  }

  langSelect.value = locale;
  if (!langSelect.value) langSelect.value = 'en';

  localStorage.setItem('vd_lang', langSelect.value);

  langSelect.addEventListener('change', () => {
    const code = langSelect.value;
    localStorage.setItem('vd_lang', code);
    const path = (basePathByCode && basePathByCode[code]) ? basePathByCode[code] : defaultPath(code);
    window.location.href = path;
  });
}
