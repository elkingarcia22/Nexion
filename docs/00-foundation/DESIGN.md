# Design System Strategy: The Sovereign Architectural Interface

## 1. Overview & Creative North Star: "The Digital Curator"

This design system moves away from the cluttered, "dashboard-heavy" aesthetics of traditional B2B SaaS. Our Creative North Star is **The Digital Curator**. We treat data not as a commodity to be crammed into boxes, but as an exhibition to be hosted.

To achieve this, we reject the rigid "grid-of-lines" layout in favor of **Intentional Asymmetry** and **Tonal Depth**. The experience should feel like walking through a high-end architectural firm: quiet, spacious, and meticulously organized.

This design system is built on the **Ubits Brand Kit** — the official visual identity of Ubits — adapted for a premium B2B operational platform.

---

## 2. Colors: Ubits Tonal Sovereignty

We define space through light and shadow, not ink. Our palette is grounded in the official Ubits color system.

### Primary Palette
| Token | HEX | Role |
|-------|-----|------|
| `navy` | `#04101f` | Base backgrounds, sidebar, dark surfaces, primary text on light |
| `blue-primary` | `#1a6bff` | Brand accent, CTAs, links, active states |
| `blue-bright` | `#2ec6ff` | Highlights, gradients, secondary accents |
| `blue-light` | `#cadeff` | Soft backgrounds, section fills, light badges |
| `white` | `#ffffff` | Cards, modal surfaces, content backgrounds |

### Secondary Palette
| Token | HEX | Role |
|-------|-----|------|
| `action` | `#3865f5` | Interactive buttons, active links |
| `dark-ui` | `#2a303f` | Sidebar inner surfaces, elevated dark panels |
| `accent-yellow` | `#f49e04` | Alerts, special highlights, warnings |
| `border` | `#d0d2d5` | Card borders, dividers when absolutely needed |
| `bg` | `#f8faff` | App-level background |

### Gradients
```css
/* Hero / dark surfaces */
background: linear-gradient(135deg, #04101f 0%, #1a6bff 100%);

/* CTA buttons */
background: linear-gradient(135deg, #1a6bff 0%, #2ec6ff 100%);

/* Soft section backgrounds */
background: linear-gradient(135deg, #cadeff 0%, #ffffff 100%);
```

*   **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Define boundaries through background color shifts. A `#f8faff` section sits directly on `#ffffff` — the tonal shift provides visual affordance without digital noise.

*   **Surface Hierarchy & Nesting:** Treat the UI as physical layers.
    *   **Level 0 (Base App):** `#f8faff` — app background
    *   **Level 1 (Sidebar / Nav):** `#04101f` — dark navy sidebar
    *   **Level 2 (Content Canvas):** `#ffffff` — main content area cards
    *   **Level 3 (Elevated):** `#cadeff` at low opacity — active/hover states, badges
    *   **Level 4 (Floating):** `#ffffff` at 85% opacity + `backdrop-filter: blur(24px)` — modals, popovers

*   **The "Glass" Rule:** For floating elements (navigation overlays, hover cards), use semi-transparent white `rgba(255,255,255,0.85)` with `backdrop-filter: blur(24px)` to create a frosted glass effect.

---

## 3. Typography: Ubits Editorial Scale

We employ the official Ubits typeface system.

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Roboto+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

| Font | Weight | Role |
|------|--------|------|
| **Inter** | 400, 500, 600, 700 | All UI text: headlines, labels, body, buttons |
| **Roboto Mono** | 400, 500, 600 | Metrics, KPIs, data values, numeric emphasis |

### Typographic Hierarchy
```css
/* Page titles */
font-family: 'Inter', sans-serif;
font-weight: 700;
font-size: clamp(1.75rem, 2.5vw, 2.5rem);
color: #04101f;

/* Section headings */
font-family: 'Inter', sans-serif;
font-weight: 600;
font-size: clamp(1.125rem, 1.5vw, 1.375rem);
color: #04101f;

/* Metrics / KPIs */
font-family: 'Roboto Mono', monospace;
font-weight: 600;
font-size: clamp(1.5rem, 2vw, 2.25rem);
color: #04101f;

/* Body text */
font-family: 'Inter', sans-serif;
font-weight: 400;
font-size: 0.875rem;
line-height: 1.6;
color: #2a303f;

/* Supporting / secondary text */
font-family: 'Inter', sans-serif;
font-weight: 400;
font-size: 0.75rem;
color: #6b7280;
```

*   **Hierarchy Note:** Always maintain high contrast between headline and body. Metric values must always use Roboto Mono — this creates the B2B "data-forward" identity.

---

## 4. Elevation & Depth: Tonal Layering

Traditional shadows are a crutch. Depth is achieved through **Tonal Layering** and selective use of Ubits shadows.

*   **The Layering Principle:** A white card (`#ffffff`) on `#f8faff` background creates natural elevation without shadows.

*   **Ambient Shadows:** When a component must float (dropdown, modal), use:
    ```css
    box-shadow: 0 2px 8px rgba(4, 16, 31, 0.08);   /* subtle */
    box-shadow: 0 8px 24px rgba(4, 16, 31, 0.15);  /* pronounced */
    ```
    Note: shadow tint is the Ubits navy `#04101f`, never pure black.

*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use `#d0d2d5` at **20% opacity**. It should be felt, not seen.

---

## 5. Components: Refined Primitives

### Buttons
*   **Primary:** Gradient `#1a6bff → #2ec6ff` at 135°, `border-radius: 8px`, white text, no border.
*   **Secondary:** `#cadeff` background with `#04101f` text, `border-radius: 8px`, no border.
*   **Ghost:** Transparent background, `#1a6bff` text, `border-radius: 8px`. Background `#cadeff` appears on hover only.
*   **Destructive:** `#fee2e2` background, `#991b1b` text. Only for irreversible actions.

```css
/* Primary button */
background: linear-gradient(135deg, #1a6bff 0%, #2ec6ff 100%);
color: #ffffff;
border: none;
border-radius: 8px;
padding: 10px 20px;
font-family: 'Inter', sans-serif;
font-weight: 600;
font-size: 14px;
```

### Cards & Lists
*   **Forbid Dividers:** No horizontal lines between list items. Use `16px` vertical whitespace or subtle `#f8faff` hover background.
*   **Card structure:** White card (`#ffffff`) on `#f8faff`, `border-radius: 16px`, `border: 1px solid #d0d2d5`, shadow `0 2px 8px rgba(4,16,31,0.08)`.
*   **Header Blocks within cards:** `#f8faff` top section transitioning to `#ffffff` body.

### KPI / Metric Cards
```html
<div style="background:#fff; border-radius:16px; padding:24px; border:1px solid #d0d2d5; box-shadow:0 2px 8px rgba(4,16,31,0.08);">
  <p style="font-family:Inter; font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 8px;">MÉTRICA</p>
  <p style="font-family:'Roboto Mono'; font-size:36px; font-weight:600; color:#04101f; margin:0;">1,234</p>
  <p style="font-family:Inter; font-size:12px; color:#2ec6ff; margin:8px 0 0;">↑ +12% vs período anterior</p>
</div>
```

### Input Fields
*   **Aesthetic:** Full-box with `border: 1px solid #d0d2d5`, `border-radius: 8px`, `background: #f8faff`. On focus: `border-color: #1a6bff`, `box-shadow: 0 0 0 3px rgba(26,107,255,0.12)`.
*   **Error states:** `border-color: #991b1b`, `background: #fee2e2`.

### Badges / Status Tags
```css
/* Active / Success */    background: #dcfce7; color: #166534;
/* Pending */             background: #fef9c3; color: #854d0e;
/* Alert / Error */       background: #fee2e2; color: #991b1b;
/* Info / Processing */   background: #dbeafe; color: #1e40af;
/* Neutral */             background: #cadeff; color: #04101f;
/* border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 600 */
```

### Data Tables
*   **Sober Tables:** Remove all vertical lines. White header row (`#ffffff`), `Inter 12px` in `#6b7280` for data. `24px` horizontal padding per cell.
*   **Row hover:** `#f8faff` background on hover.

### Sidebar Navigation
*   **Background:** `#04101f` navy.
*   **Logo:** Ubits SVG in white.
*   **Nav items inactive:** `#cadeff` at 60% opacity text.
*   **Nav items active:** `#ffffff` text + `#1a6bff` left border (4px) + `rgba(26,107,255,0.15)` background.
*   **Width:** 240px fixed.

---

## 6. Spacing & Grid

*   **Base unit:** 4px
*   **Component spacing:** multiples of 4 — use 8, 12, 16, 24, 32, 48, 64
*   **Section padding:** 32px (desktop), 16px (mobile)
*   **Card padding:** 24px
*   **Sidebar padding:** 16px horizontal
*   **Border radius system:** 4px (small), 8px (components), 12px (inputs), 16px (cards), 24px (modals), 999px (badges)

---

## 7. Tailwind Config Token Reference

```js
// tailwind.config.js — Ubits Design Tokens
colors: {
  navy:     '#04101f',
  primary:  '#1a6bff',
  bright:   '#2ec6ff',
  light:    '#cadeff',
  action:   '#3865f5',
  'dark-ui':'#2a303f',
  accent:   '#f49e04',
  border:   '#d0d2d5',
  bg:       '#f8faff',
  white:    '#ffffff',
},
fontFamily: {
  sans:  ['Inter', 'sans-serif'],
  mono:  ['Roboto Mono', 'monospace'],
},
borderRadius: {
  sm:   '4px',
  DEFAULT: '8px',
  md:   '12px',
  lg:   '16px',
  xl:   '24px',
  full: '999px',
},
boxShadow: {
  soft:  '0 2px 8px rgba(4,16,31,0.08)',
  hard:  '0 8px 24px rgba(4,16,31,0.15)',
  focus: '0 0 0 3px rgba(26,107,255,0.12)',
},
```

---

## 8. Do's and Don'ts

### Do
*   **Do** use `#04101f` for all "black" text — never pure `#000000`.
*   **Do** use `Roboto Mono` for every numeric metric or KPI value.
*   **Do** embrace whitespace. If a section feels cramped, double the padding.
*   **Do** use `#f49e04` (accent yellow) for non-critical warnings or special highlights.
*   **Do** use `border-radius: 16px` for large structural containers.
*   **Do** use the sidebar as `#04101f` dark — it grounds the entire UI.

### Don't
*   **Don't** use Manrope — the Ubits brand uses Inter.
*   **Don't** use the Stitch color palette (`#223999`, `#f9f9ff`, etc.) — use Ubits tokens.
*   **Don't** use pure red `#ff0000` — use `#991b1b` (error text) and `#fee2e2` (error bg).
*   **Don't** use a border to separate the sidebar — the `#04101f` vs `#f8faff` contrast is sufficient.
*   **Don't** use standard "blue" for links — use `#1a6bff` to maintain brand consistency.
*   **Don't** use "Alert Red" for everything — `#f49e04` accent yellow is for warnings; red only for errors.

---

## 9. Logo Usage

### SVG embebido (para HTML sin archivos externos)
```svg
<svg width="120" height="39" viewBox="0 0 99.201 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14.9724 0V3.10208C11.8558 3.10208 8.86672 4.29447 6.66289 6.41695C4.45907 8.53943 3.22097 11.4181 3.22097 14.4198H0C0 10.5954 1.57745 6.92768 4.38533 4.22345C7.1932 1.51922 11.0015 0 14.9724 0ZM14.9722 5.18599C12.4292 5.18599 9.99039 6.1589 8.19223 7.89068C6.39407 9.62247 5.38387 11.9713 5.38387 14.4204H8.13865C8.13865 12.6748 8.85855 11.0006 10.14 9.76613C11.4215 8.53163 13.1597 7.83788 14.9722 7.83745V5.18599ZM14.9727 9.82667V22.4782C14.9727 25.9395 16.6679 27.982 20.1059 27.982C23.4845 27.982 25.173 25.9395 25.173 22.9746V10.3442H29.935V23.1019C29.935 28.3967 26.7886 32 20.1025 32C13.3469 32 10.2006 28.364 10.2006 23.133V14.4194C10.2006 13.2013 10.703 12.0331 11.5973 11.1718C12.4916 10.3105 13.7045 9.82667 14.9693 9.82667H14.9727ZM68.9796 31.6184V14.3316H62.5224V10.3446H80.1395V14.3316H73.7145V31.6184H68.9796ZM86.7718 27.3049C85.5651 26.8115 84.475 26.0873 83.5675 25.1762L80.989 28.613C83.0708 30.6228 86.1222 31.9943 90.3603 31.9943C96.3191 31.9943 99.201 29.0604 99.201 25.1697C99.201 20.448 94.5662 19.3966 90.9232 18.5982C88.3701 18.0317 86.5155 17.5843 86.5155 16.1492C86.5155 14.8741 87.6412 13.981 89.7602 13.981C91.9132 13.981 94.2967 14.7141 96.0852 16.3092L98.701 12.9916C96.5158 11.0471 93.6017 10.0267 90.0908 10.0267C84.8932 10.0267 81.7129 12.8969 81.7129 16.4365C81.7129 21.1245 86.224 22.1192 89.8106 22.9101L89.9586 22.9428C92.5082 23.5175 94.4289 24.0595 94.4289 25.6546C94.4289 26.8661 93.1711 28.0465 90.5875 28.0465C89.2766 28.0505 87.9785 27.7982 86.7718 27.3049ZM60.156 10.3446H55.4534V31.6167H60.156V10.3446ZM33.8867 10.3446V31.6184L45.8721 31.6135C50.078 31.6135 52.2971 29.0616 52.2971 25.8714C52.2971 23.1987 50.4103 20.9978 48.059 20.6468C50.1458 20.2321 51.8682 18.446 51.8682 15.7668C51.8682 12.9275 49.7152 10.3446 45.5093 10.3446H33.8867ZM44.4837 18.8917H38.5893V14.2043H44.4837C46.0721 14.2043 47.0655 15.2263 47.0655 16.5325C47.0655 17.9039 46.0721 18.8917 44.4837 18.8917ZM44.6481 27.7587H38.5893V22.7513H44.6481C46.5027 22.7513 47.4961 23.8991 47.4961 25.2395C47.4961 26.7693 46.4366 27.7587 44.6481 27.7587Z" fill="currentColor"/>
</svg>
```

*   `fill="white"` — sobre fondos oscuros (sidebar, hero dark)
*   `fill="#04101f"` — sobre fondos claros
*   `fill="#1a6bff"` — versión azul para contextos específicos

---

## 10. Chart / Data Visualization Palette

```js
const UBITS_CHART_COLORS = ['#1a6bff', '#2ec6ff', '#f49e04', '#cadeff', '#04101f', '#3865f5'];
```

Para Chart.js / Recharts / D3: siempre partir de `#1a6bff` como color principal de series.

---

## 11. Rule for Claude Code and Antigravity

All frontend implementation must use this design system exclusively.

*   Never use colors from the old Stitch prototype (`#223999`, `#f9f9ff`, `surface-container-*`, etc.)
*   Never use Manrope — always Inter for UI text, Roboto Mono for numeric data
*   All Tailwind color tokens must map to the Ubits palette defined in Section 7
*   The sidebar is always `#04101f` navy — it defines the product's visual identity
*   Every metric/KPI number must render in Roboto Mono
