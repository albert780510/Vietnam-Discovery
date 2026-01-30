# visa-site (Vietnam Discovery Visa)

Static site + Netlify Functions MVP for Vietnam eVisa lead capture.

## Structure
- `public/` static assets
- `src/pages/zh-TW/` Traditional Chinese pages
- `src/pages/zh-CN/` Simplified Chinese pages
- `src/shared/` shared CSS/JS
- `netlify/functions/` serverless functions (order create, email notify)

## Local dev
This is plain static HTML.
- Open `src/pages/zh-TW/index.html` in browser, or use any static server.

## Deploy (Netlify)
- Build command: *(none)*
- Publish directory: `src/pages`
- Functions directory: `netlify/functions`

> Note: File uploads require object storage (R2/S3) with signed URLs. MVP currently validates files client-side and collects metadata; upload integration is stubbed.
