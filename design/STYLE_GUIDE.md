# Vietnam Discovery — Design System (Apple-like)

**Phase:** 1 (規範/Token 定義；不改任何頁面)

目標：把網站視覺質感提升到「高級、克制、可信任」的 Apple 官網節奏。

---

## 1) Typography（字體系統）
**Font stack（只用 1–2 種字體）**
- Primary (UI/Sans):
  - `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, "Noto Sans TC", "Noto Sans SC", "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji"`
- Optional monospace (僅用在 code/txid/數字):
  - `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`

**Type scale（字級階級）**
> 原則：首屏文字短；H1 一行為主、subhead 一行；body 不超過兩行段落。

- H1: 44/52 (mobile), 56/64 (desktop) — `font-weight: 750–800`
- H2: 28/36 (mobile), 32/40 (desktop) — `font-weight: 750`
- H3: 18/26 — `font-weight: 700`
- Body (default): 16/26 — `font-weight: 450–500`
- Small: 14/22 — `font-weight: 450–500`
- Caption: 12/18 — `font-weight: 450–500`

**Letter spacing**
- Headings: `-0.02em`（輕微收緊）
- Body: `0`

---

## 2) Spacing（留白/節奏）
使用 8pt scale（Tailwind spacing 兼容）：
- `0, 4, 8, 12, 16, 24, 32, 40, 56, 72, 96`

版面原則：
- Hero top padding ≥ 56
- Section vertical gap ≥ 56
- Card internal padding 20–24
- Grid gap 16–24

---

## 3) Color（只用黑白灰 + 1 主色）
**Neutrals**
- `--c-bg`: `#FFFFFF`
- `--c-surface`: `#F7F7F8`
- `--c-border`: `rgba(0,0,0,.08)`
- `--c-text`: `#0B0B0C`
- `--c-text-2`: `rgba(0,0,0,.70)`
- `--c-text-3`: `rgba(0,0,0,.52)`

**Single Accent（主色，只用一個）**
- `--c-accent`: `#0A84FF`（Apple-like blue）
- `--c-accent-2`: `rgba(10,132,255,.12)`（僅作 hover/soft bg）

規則：
- 不用彩虹漸層；CTA 只用 accent。
- 灰階用來建立階級；accent 只用在主 CTA/關鍵狀態。

---

## 4) Radius（圓角）
- `--r-sm`: 12
- `--r-md`: 16
- `--r-lg`: 24
- `--r-xl`: 32

原則：
- 全站圓角固定 12/16/24，避免每個元件都不同。

---

## 5) Shadow（陰影：克制）
最多 2 種：
- `--sh-card`: `0 8px 30px rgba(0,0,0,.06)`
- `--sh-float`: `0 14px 50px rgba(0,0,0,.10)`

原則：
- 以「留白 + 灰階」為主；陰影只是輕微層級提示。

---

## 6) Components（元件規範）

### Buttons（只留 2 種）
1) Primary
- bg: accent
- text: white
- radius: 9999（pill）或 r-md（16）二選一（全站統一）
- height: 44–48
- hover: `opacity: .92` 或 `filter: brightness(0.98)`

2) Secondary
- bg: transparent
- border: border
- text: text
- hover: `background: var(--c-surface)`

### Cards（最多 2 種）
1) Surface card
- bg: white
- border: 1px border
- shadow: card

2) Soft section
- bg: surface
- border: none or 1px border
- shadow: none

### Forms（Apple 風格）
- 少框線：改用 soft background + 1px border on focus
- label：小字粗體（12–14, 700）
- input：16px、padding 12–14、radius 16
- error：純文字 + 紅色細線/小 icon（不做大紅框）

---

## 7) Motion（動效）
只允許：
- 淡入 `opacity`
- 上移 `translateY(2–6px)`
- hover opacity

時間：150–220ms
Easing：`cubic-bezier(0.2, 0.8, 0.2, 1)`

---

## 8) Tokens（落地方式：CSS variables / Tailwind 對應）

### A) CSS Variables（建議：Phase 2 開始引用）
新增檔：`/shared/design/tokens.css`
```css
:root{
  --c-bg:#fff;
  --c-surface:#F7F7F8;
  --c-border:rgba(0,0,0,.08);
  --c-text:#0B0B0C;
  --c-text-2:rgba(0,0,0,.70);
  --c-text-3:rgba(0,0,0,.52);
  --c-accent:#0A84FF;
  --c-accent-2:rgba(10,132,255,.12);

  --r-sm:12px;
  --r-md:16px;
  --r-lg:24px;
  --r-xl:32px;

  --sh-card:0 8px 30px rgba(0,0,0,.06);
  --sh-float:0 14px 50px rgba(0,0,0,.10);
}
```

### B) Tailwind config mapping（可選，Phase 2/3 做）
- `colors.accent = 'var(--c-accent)'`
- `borderColor.DEFAULT = 'var(--c-border)'`
- `boxShadow.card = 'var(--sh-card)'`
- `borderRadius.md = 'var(--r-md)'` ...

> Phase 1 只定義，不動現有頁面引用。

---

## 9) Phase 2 적용範圍（提醒）
- 只改 `/zh-tw/` 的 Hero + Solutions
- Solutions：更少框線、更少粗體、更少文字；每個模組：短標題 + 一句描述 + What you get
- Market Entry 放最前面

## 10) Phase 3 적용範圍（提醒）
- header/footer/consult 表單/其他頁
- 表單：大留白、少框線、按鈕一致、錯誤提示乾淨
