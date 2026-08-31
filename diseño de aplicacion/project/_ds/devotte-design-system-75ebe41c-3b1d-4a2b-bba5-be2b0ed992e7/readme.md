# Devotte Design System

Devotte is a Hermosillo (Sonora, México) studio offering **custom software development, electronics/tech repair ("soporte técnico"), and tech consulting for small and medium businesses** — "un solo equipo para lo que se descompone y lo que hay que construir." Surfaces: marketing website, client quotes/invoices (cotizaciones y facturas), and web apps.

The visual identity is built on the `< · >` symbol: angle brackets (the software) with a dot at the center (the physical/hardware component).

## Sources

- `uploads/devotte-manual-marca.pdf` — Manual de identidad de marca v1.0, Julio 2026 (8 pages; parsed in full). **Ground truth for everything below.**
- `uploads/devotte-*.svg/png` — wordmark, icon (dark + light), favicon. Copied to `assets/logo/`.
- The website and quotes app are **original designs** (no existing product source), built strictly from the manual's application rules. The website now uses the official spot illustrations (hero, servicios, proceso, contacto, éxito).

## CONTENT FUNDAMENTALS

- **Language: plain Spanish.** Clear, direct, professional but warm. No unnecessary jargon ("habla claro, sin tecnicismos innecesarios").
- **Voice:** first-person plural implied studio voice; addresses the client as **tú** in marketing, **usted-neutral** in documents (quotes/invoices stay formal-neutral).
- **Casing:** sentence case everywhere. The brand name is always **Devotte** — capital D only, never DEVOTTE, never devotte (except inside mono `<labels>`, which are all-lowercase by convention: `<01 · la marca>`, `<devotte · hermosillo, son.>`).
- **Brand motif in copy:** angle brackets `< >` wrap section labels and technical metadata, set in JetBrains Mono lowercase, often with `·` middot separators.
- **No emoji.** Errors/warnings in the manual use plain `✕` and `—` list dashes.
- **Tone examples** (from the manual):
  - "Un solo equipo para lo que se descompone y lo que hay que construir."
  - "Cuatro colores bastan."
  - "Es un condimento, no un plato principal."
  - "Si algo se siente saturado, probablemente lo está."
- Golden rule: **menos elementos, más contraste, y el punto teal siempre pequeño.**

## VISUAL FOUNDATIONS

**Colors** (usage proportion: cream ~55% · navy ~33% · deep teal ~9% · signal teal ~3%):
- `--navy #16232B` — primary. Text, dark backgrounds, the icon.
- `--teal #1D9E75` (señal) — accents ONLY: logo dot, small details, small icons. **Never large backgrounds.**
- `--teal-deep #0F6E56` (profundo) — accent on light backgrounds where signal teal lacks contrast: links, accent text.
- `--cream #F5F4EF` — default light background instead of pure white; text on dark. Pure white allowed for documents/cards.
- If a piece feels "too green," the accent is overused.

**Gradients** — exactly three, **max one per composition**, logo never on a gradient:
- Profundo `135° #16232B→#0F4A3C` — presentation covers, site heroes, banners, document closings. Text on it: cream/white.
- Señal `135° #1D9E75→#0F6E56` — small graphic elements only (bars, stripes, highlighted buttons, separators). Never behind large text blocks.
- Neblina `180° #F5F4EF→#E2EDE7` — light section/card backgrounds; the only gradient that admits long text (navy).
- Never invent new gradients or use 3+ stops.

**Typography** — three families, no more:
- Space Grotesk Bold/Medium — headlines only, **large sizes only** (≥ ~21px on screen); loses character small.
- Inter Regular/Medium/SemiBold — body, UI, buttons, forms, tables, documents.
- JetBrains Mono Medium — small technical details only: `<section labels>`, folios, code. A condiment, not a main dish.
- Fallback when fonts unavailable: Arial for everything.

**Shape & surfaces:** rounded corners 12–20px (`--radius-md/lg/xl`); **pill buttons**. Cards: white or Neblina on cream pages, radius 16–20px, hairline navy-8% border, quiet navy-tinted shadow (`--shadow-card`). Nothing decorative without function.

**Motion:** precise and restrained — short fades/slides, `--ease-out` cubic-bezier(0.22,1,0.36,1), 120–320ms. No bounces or springs.

**States:** hover = slight darken (navy→#0D161C on dark buttons) or navy-8% wash on quiet controls; press = darken further, no shrink; focus = 2px deep-teal ring, 2px offset. Links: deep teal, underline on hover.

**Layout:** generous whitespace ("deja que respire"), content max ~1120px, mono `<labels>` mark sections. Backgrounds are flat color or one permitted gradient — no photography treatment defined, no textures, no patterns.

**Logo rules:** wordmark preferred wherever space allows; icon for square/small spaces. Dark icon is primary; light one-ink icon for engraving/monochrome. On dark backgrounds use the light wordmark (cream strokes, teal dot). Clear space = 4× dot height. Min sizes: icon 24px, wordmark 120px. Never distort, recolor the dot, add effects, place on gradients or low-contrast backgrounds, or write DEVOTTE.

## ICONOGRAPHY

- The manual defines **no icon set** beyond the logo system. The brand's own "icons" are typographic: angle brackets, middots, `✕`, `—`.
- For UI needs, this system uses **Lucide** (CDN) at 1.75px stroke — its geometric round-capped strokes match the logo's chevrons. **This is a substitution; flag to Devotte and replace if they adopt an official set.** Signal teal only for small accent icons; default icon color is navy.
- No emoji, ever. Unicode `·` and `✕` and `—` are used as typographic marks.
- **Spot illustrations** (`assets/illustrations/`) — official brand vectors, one per site moment:
  - `hero.svg` — escritorio con laptop mostrando el símbolo `< · >` (hero/inicio). A futuro puede sustituirse o complementarse con una foto real del estudio.
  - `servicio-software.svg` — ventana de navegador con código y módulos ensamblándose (software a la medida).
  - `servicio-reparacion.svg` — teléfono en diagnóstico con desarmador, tornillos y chip (reparación y mantenimiento).
  - `servicio-consultoria.svg` — lupa sobre un flujo de proceso con métrica al alza (consultoría/optimización).
  - `proceso.svg` — camino punteado con hitos y bandera al final; los 4 pasos del proceso van como texto junto a él.
  - `contacto.svg` — burbuja de mensaje con el símbolo de la marca y avión de papel (contacto/CTA).
  - `exito.svg` — confirmación de "mensaje enviado" — el último momento de la experiencia de contacto; no descuidarlo.
- Logo assets in `assets/logo/`: `devotte-wordmark.svg/-2x.png` (navy, for light bg), `devotte-icon-dark.svg/-512.png` (navy rounded square, white chevrons, teal dot — primary), `devotte-icon-light.svg/-512.png` (cream square, navy strokes — engraving/mono), `devotte-favicon-32.png`.
- **Missing:** no light-background wordmark variant for dark surfaces was provided (manual says cream strokes + teal dot exists). Ask Devotte for it; until then render the name in type on dark surfaces.

## Intentional additions

- `SectionLabel` component — the `<label>` mono motif is used everywhere in the manual; codified as a primitive.
- Lucide icons via CDN (see ICONOGRAPHY — substitution).
- Status colors (warn/error) derived quietly for app UI; not in the manual.

## Index

- `styles.css` → imports `tokens/` (fonts, colors, typography, layout, base).
- `assets/logo/` — brand marks. `assets/fonts/` — woff2 webfonts (Google Fonts, latin subset).
- `guidelines/` — specimen cards shown in the Design System tab.
- `components/core/` — Button, IconButton, Input, Select, Checkbox, Radio, Switch, Card, Badge, Tag, Tabs, Dialog, Toast, Tooltip, SectionLabel.
- `ui_kits/website/` — marketing site (homepage).
- `ui_kits/quotes/` — client quotes web app (cotizador).
- `SKILL.md` — agent skill entry point.
