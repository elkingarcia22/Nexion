# Design System Strategy: The Sovereign Architectural Interface

## 1. Overview & Creative North Star: "The Digital Curator"
This design system moves away from the cluttered, "dashboard-heavy" aesthetics of traditional B2B SaaS. Our Creative North Star is **The Digital Curator**. We treat data not as a commodity to be crammed into boxes, but as an exhibition to be hosted.

To achieve this, we reject the rigid "grid-of-lines" layout in favor of **Intentional Asymmetry** and **Tonal Depth**. By utilizing high-contrast typography scales (Manrope for displays and Inter for utility) alongside layered, borderless surfaces, we create a workspace that feels authoritative, sober, and exceptionally premium. The experience should feel like walking through a high-end architectural firm: quiet, spacious, and meticulously organized.

---

## 2. Colors: Tonal Sovereignty
We define space through light and shadow, not ink. Our palette relies on a sophisticated range of navies (`primary`) and slate grays (`secondary`).

*   **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. To define boundaries, use background color shifts. For example, a `surface-container-low` section should sit directly on a `surface` background. The shift in tone provides all the visual affordance necessary without the "digital noise" of lines.
*   **Surface Hierarchy & Nesting:** Treat the UI as physical layers.
    *   **Level 0 (Base):** `surface` (#f9f9ff)
    *   **Level 1 (Subtle Inset):** `surface-container-low` (#f0f3ff) for secondary sidebar areas.
    *   **Level 2 (Active Canvas):** `surface-container` (#e7eeff) for main content blocks.
    *   **Level 3 (Elevated Priority):** `surface-container-highest` (#d8e3fb) for floating modals or pop-overs.
*   **The "Glass & Gradient" Rule:** For primary CTAs and hero states, move beyond flat fills. Apply a subtle linear gradient from `primary` (#223999) to `primary_container` (#3d52b2) at a 135-degree angle. For floating elements (like a navigation bar or hover card), use a semi-transparent `surface_container_lowest` (#ffffff at 80% opacity) with a `24px` backdrop-blur to create a "frosted glass" effect.

---

## 3. Typography: The Editorial Edge
We employ a dual-typeface system to distinguish between *Information* and *Action*.

*   **The Hero (Manrope):** Used for `display` and `headline` scales. Its geometric nature provides a modern, "architectural" feel. Use `headline-lg` (2rem) for page titles to establish immediate dominance.
*   **The Workhorse (Inter):** Used for `title`, `body`, and `label` scales. Inter’s high x-height ensures maximum legibility in data-dense B2B environments.
*   **Hierarchy Note:** Always maintain a high contrast between the headline and the body. If a `headline-md` is used, the supporting `body-md` should use `on_surface_variant` (#454652) to create a clear visual step-down in importance.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are a crutch. In this system, depth is achieved through **Tonal Layering**.

*   **The Layering Principle:** Place a `surface-container-lowest` card (Pure White) on a `surface-container-low` background. The natural contrast creates an "elevation" effect without a single drop shadow.
*   **Ambient Shadows:** If a component *must* float (e.g., a dropdown), use an ultra-diffused shadow: `box-shadow: 0 12px 40px rgba(17, 28, 45, 0.06)`. Note the use of `on_surface` as the shadow tint rather than pure black.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility (e.g., in high-contrast modes), use the `outline_variant` (#c5c5d4) at **20% opacity**. It should be felt, not seen.

---

## 5. Components: Refined Primitives

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary_container`), `lg` roundedness (0.5rem), and white text. No border.
*   **Secondary:** `surface_container_high` fill with `primary` text. No border.
*   **Tertiary:** Ghost style. `on_surface` text, with a `surface_variant` background appearing only on hover.

### Cards & Lists
*   **Forbid Dividers:** Do not use horizontal lines between list items. Instead, use `16px` of vertical whitespace or a subtle background hover state using `surface_container_low`.
*   **Header Blocks:** Use a `surface_container_lowest` block for the header section of a card, transitioning to `surface_container` for the body.

### Input Fields
*   **Aesthetic:** "Bottom-line" focus. Instead of a full box, use a `surface_variant` fill with a `lg` top-radius. When focused, animate a 2px `primary` line at the bottom.
*   **States:** Error states must use `error` (#ba1a1a) for the text and a 5% opacity `error_container` fill for the field background.

### Data Tables
*   **Sober Tables:** Remove all vertical lines. Use `surface_container_lowest` for the header row and a simple `body-sm` font in `secondary` (#515f74) for the data. Ensure `24px` of horizontal padding per cell to provide "The Curator’s" signature breathing room.

---

## 6. Do’s and Don’ts

### Do
*   **Do** embrace whitespace. If a section feels cramped, double the padding.
*   **Do** use `tertiary` (#004c45) for "Success" or "Processing" states to maintain the sober, refined palette.
*   **Do** utilize `roundedness-xl` (0.75rem) for large structural containers to soften the B2B rigidity.

### Don’t
*   **Don’t** use pure black (#000000). Use `on_background` (#111c2d) for all "black" text.
*   **Don’t** use a border to separate the fixed left sidebar. Use a background shift from `surface` to `surface_container_low`.
*   **Don’t** use standard "Blue" for links. Use the `primary` indigo-navy to maintain the professional tone.
*   **Don’t** use "Alert Red" for everything. Use `error` (#ba1a1a) sparingly; for non-critical warnings, use `secondary` tones with a warning icon.