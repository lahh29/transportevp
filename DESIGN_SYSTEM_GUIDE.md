# 🎨 Guía Visual del Sistema de Diseño Notion

## Colores de Marca

### Color Primario (Structural)
```
--color-primary: #0075de (Notion Blue)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Uso: CTAs primarios, links, active states, focus signals
Regla de Oro: Es el ÚNICO color estructural para acciones
```

### Color Secundario (Hero Band)
```
--color-secondary: #213183 (Deep Indigo)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Uso: Hero bands oscuros con inversión de colores
Ejemplo: <div class="hero-band">...</div>
```

### Canvas & Surfaces
```
--color-canvas: #f6f5f4 (Warm Paper-Soft)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
El fondo cálido característico de Notion

--color-surface-card: #ffffff (White)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cards y paneles sobre el canvas
```

### Text Colors
```
--color-ink:           ████  #000000 (Near-black, ~95% alpha)
--color-ink-secondary: ███   #31302e (Secondary body)
--color-ink-muted:     ██    #615d59 (Supporting text)
--color-ink-faint:     █     #a39e98 (Captions/metadata)
```

---

## 🎨 Paleta Decorativa de Stickers

**⚠️ IMPORTANTE: Solo para decoración, NUNCA para CTAs o estructura**

```
--color-accent-sky:    🔵 #62aef0  (Sky Blue)
--color-accent-purple: 🟣 #d6b6f6  (Lavender)
--color-accent-pink:   🩷 #ff64c8  (Hot Pink)
--color-accent-orange: 🟠 #dd5b00  (Vibrant Orange)
--color-accent-teal:   🩵 #2a9d99  (Teal)
--color-accent-green:  🟢 #1aae39  (Grass Green)
--color-accent-brown:  🟤 #523410  (Earth Brown)
```

**Uso correcto:**
- ✅ Illustrated blocks
- ✅ App-icon stickers
- ✅ Category dots
- ✅ Timeline pills (in-product)

**Uso incorrecto:**
- ❌ Botones primarios o secundarios
- ❌ Estructuras de navegación
- ❌ Fondos de secciones importantes

---

## 📐 Typography Scale

### Display Sizes (Heavy + Tight Tracking)

```
Display-1 (Hero Headlines)
━━━━━━━━━━━━━━━━━━━━━━━
64px · Weight 700 · -2.125px tracking
Ejemplo: "Meet the night shift"

Display-2 (Large Sections)
━━━━━━━━━━━━━━━━━━━━
54px · Weight 700 · -1.875px tracking

Heading-1 (Section Headlines)
━━━━━━━━━━━━━━━━━━━━━━━
40px · Weight 700 · -1px tracking
Ejemplo: "Plans and features"

Heading-2 (Sub-sections)
━━━━━━━━━━━━━━━━
26px · Weight 700 · -0.625px tracking

Heading-3 (Card Titles)
━━━━━━━━━━━━━━
22px · Weight 700 · -0.25px tracking
```

### Body & UI

```
Title (Callouts)
20px · Weight 600 · -0.125px tracking

Body Medium (Default)
16px · Weight 400 · 0 tracking · 1.5 line-height

Body Small (Dense)
15px · Weight 400 · 0 tracking · 1.33 line-height

Button Labels
16px · Weight 500 · 0 tracking

Caption (Footnotes)
14px · Weight 400 · 0 tracking

Eyebrow (Pills, Labels)
12px · Weight 600 · +0.125px tracking · UPPERCASE
```

---

## 🔘 Buttons

### Primary CTA (Marketing)
```css
.btn-primary
┌─────────────────────┐
│  Get Notion free    │  ← Pill-shaped (9999px)
└─────────────────────┘
Background: --color-primary (#0075de)
Text: white
Height: 38px (--button-height-md)
Radius: --rounded-pill (9999px)
Transform on press: scale(0.97)
```

### Secondary CTA (Marketing)
```css
.btn-secondary
┌─────────────────────┐
│  Request a demo     │  ← Pill-shaped (9999px)
└─────────────────────┘
Background: white + shadow-soft
Text: --color-ink
Height: 38px
Radius: --rounded-pill
```

### Utility Button (Nav/Utility)
```css
.btn-utility
┌──────────────┐
│   Select     │  ← Tighter corners (8px)
└──────────────┘
Background: white
Border: 1px hairline
Height: 36px (--button-height-sm)
Radius: --rounded-md (8px)
```

---

## 🃏 Cards

### Default Card (Hairline Only)
```css
.card
┌─────────────────────────┐
│                         │
│  Feature Card Content   │
│                         │
└─────────────────────────┘
Background: white
Border: 1px hairline-soft
Radius: 12px (--rounded-lg)
Shadow: none (flat)
Padding: 24px (--spacing-lg)
```

### Elevated Card (Soft Shadow)
```css
.card-elevated
┌─────────────────────────┐
│                         │
│  Floating Panel         │  ← Shadow-soft
│                         │
└─────────────────────────┘
Same as .card but with:
Shadow: --shadow-soft (multi-layer)
```

### Pricing Card
```css
.card-pricing
┌───────────────┐
│   Free        │  ← Tighter corners (8px)
│   $0/month    │
│   • Feature   │
│   • Feature   │
└───────────────┘
Radius: 8px (--rounded-md)
Padding: 24px
```

---

## 🌓 Hero Band (Night Mode)

### Dark Hero Inverted
```css
.hero-band
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
█                                      █
█  Meet the night shift               █  ← White text
█                                      █
█  [Get started]  [Request demo]      █
█                                      █
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Background: --color-secondary (#213183)
Text: white
Full-bleed edge to edge
El único "dark island" en la página
```

---

## 📏 Spacing Scale

```
xxs   ▪           4px   Tags, pequeños gaps
xs    ▪▪          8px   Icon gaps, list items
sm    ▪▪▪         12px  Card interior gaps
base  ▪▪▪▪        16px  Default gap
md    ▪▪▪▪▪       20px  Component separation
lg    ▪▪▪▪▪▪      24px  Card padding, large gaps
xl    ▪▪▪▪▪▪▪▪    28px  Section headers
xxl   ▪▪▪▪▪▪▪▪▪▪  32px  Between major sections
section ▪▪▪...    80px  Full section padding
```

---

## 🎭 Shadows (Barely-There Philosophy)

### Shadow Flat
```
No shadow, solo hairline
━━━━━━━━━━━━━━━━━━━━━
Uso: Default cards sobre canvas
```

### Shadow Soft (Multi-Layer)
```
Subtle lift con 4 capas near-transparent
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ╱╲
  ╱  ╲   ← Gently lifted
 ╱____╲

Uso: Raised cards, floating buttons
```

### Shadow Elevated (Deep)
```
6-layer stack para modals
━━━━━━━━━━━━━━━━━━━━━
   ╱╲
  ╱  ╲   ← Más elevado
 ╱    ╲
╱______╲

Uso: Modals, popovers, overlays
```

---

## 🔲 Border Radius Scale

```
xs (4px)     ▁▁   Form fields, small chips
sm (5px)     ▁▁   Menu items, status pills
md (8px)     ▁▁▁  Utility buttons, small cards
lg (12px)    ▁▁▁▁ Feature cards, content tiles
xl (16px)    ▁▁▁▁ Large containers, modals
pill (9999px) (●) Marketing CTAs, badges
```

---

## 📱 Responsive Breakpoints

```
Mobile (≤600px)
┌──────┐
│      │  Full-width CTAs
│      │  Single column stacks
│      │  Hamburger nav
└──────┘

Tablet (768px)
┌────────────┐
│            │  Grids collapse to 2-up
│    ┌──┐    │  Nav begins condensing
└────────────┘

Desktop (1080px)
┌──────────────────┐
│  ┌──┐ ┌──┐ ┌──┐  │  Standard 3-up grids
│  └──┘ └──┘ └──┘  │  Centered container
└──────────────────┘

Wide (1440px+)
┌────────────────────────┐
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐  │  Full multi-column
│  └──┘ └──┘ └──┘ └──┘  │  Widest container
└────────────────────────┘
```

---

## 🎯 Uso de Clases en HTML

### Ejemplo: Hero Section
```html
<div class="hero-band">
  <div class="container">
    <h1>Transform your workflow</h1>
    <p class="hero-band__subhead">
      All-in-one workspace for your notes, tasks, and projects.
    </p>
    <div class="hero-band__ctas">
      <button class="btn-primary">Get started</button>
      <button class="btn-secondary">Request demo</button>
    </div>
  </div>
</div>
```

### Ejemplo: Feature Card
```html
<div class="card">
  <h3>Powerful collaboration</h3>
  <p class="type-body-md text-ink-secondary">
    Work together in real-time with your team.
  </p>
  <button class="btn-utility">Learn more</button>
</div>
```

### Ejemplo: Typography
```html
<h1 class="type-display-1">Main Headline</h1>
<h2 class="type-heading-1">Section Title</h2>
<p class="type-body-md text-ink-secondary">Body text goes here.</p>
<span class="type-eyebrow text-muted">Label</span>
```

---

## ✅ Do's

1. ✅ Reservar `--color-primary` para CTAs primarios y links
2. ✅ Usar warm canvas `--color-canvas` como fondo principal
3. ✅ Aplicar weight 700 + tracking negativo en headlines
4. ✅ Usar `rounded-pill` para marketing CTAs
5. ✅ Usar `rounded-xs` (4px) para form inputs
6. ✅ Definir superficies con hairlines + shadow-soft
7. ✅ Un solo hero band oscuro por página

## ❌ Don'ts

1. ❌ No usar colores sticker para CTAs estructurales
2. ❌ No introducir segundo color estructural junto a primary
3. ❌ No usar `rounded-pill` en form fields
4. ❌ No usar sombras pesadas (heavy drop-shadows)
5. ❌ No usar weight 700 en body text (solo headlines)
6. ❌ No poner type sobre pure white en full pages
7. ❌ No repetir el hero band oscuro múltiples veces

---

## 🚀 Quick Start

### 1. Usar variables en lugar de valores directos
```css
/* ❌ Incorrecto */
padding: 24px;
font-size: 16px;
color: #0075de;

/* ✅ Correcto */
padding: var(--spacing-lg);
font-size: var(--typography-body-md-size);
color: var(--color-primary);
```

### 2. Aplicar clases de utilidad
```html
<p class="type-body-md text-ink-secondary">...</p>
<button class="btn-primary">...</button>
<div class="card-elevated">...</div>
```

### 3. Usar tokens de spacing
```css
gap: var(--spacing-base);
margin-block: var(--spacing-xl);
padding-inline: var(--spacing-lg);
```

---

## 📚 Referencias Rápidas

**Ver tokens completos:** `/app/src/index.css` líneas 1-250
**Ver valores hardcoded:** `/app/HARDCODED_VALUES_REPORT.md`
**Ver resumen completo:** `/app/CSS_REDESIGN_SUMMARY.md`
