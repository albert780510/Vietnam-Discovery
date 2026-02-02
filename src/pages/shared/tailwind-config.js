// Tailwind CDN config (static site)
// Note: this is used only on the new marketing home pages.
window.tailwind = window.tailwind || {};
window.tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: {
          1: '#986743',
          2: '#CBB79D',
          3: '#F9CDCF',
          4: '#F5F3EB',
          5: '#EA82A5'
        }
      },
      fontFamily: {
        sans: [
          'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto',
          'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei',
          'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei',
          'Arial', 'sans-serif'
        ]
      },
      borderRadius: {
        xl: '16px',
        '2xl': '20px'
      },
      boxShadow: {
        soft: '0 14px 40px rgba(152,103,67,.14)',
        card: '0 10px 28px rgba(152,103,67,.12)'
      }
    }
  }
};
