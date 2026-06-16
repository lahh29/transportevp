# Reporte de Valores Hardcodeados

Este reporte identifica todos los valores hardcodeados encontrados en los componentes que **NO** son cohesivos con el nuevo sistema de diseño en `index.css`.

## ❌ Valores a Reemplazar

### 1. `/app/src/components/Button.jsx`

**Líneas con valores hardcodeados:**

```javascript
// Línea 27-28: Typography hardcoded
const getTypography = () => {
  if (variant === 'tertiary') return { fontSize: '16px', fontWeight: 400 };
  return { fontSize: '14px', fontWeight: 500, letterSpacing: '0px' };
};
```

**✅ Debería ser:**
```javascript
const getTypography = () => {
  if (variant === 'tertiary') return { 
    fontSize: 'var(--typography-body-md-size)', 
    fontWeight: 'var(--typography-body-md-weight)' 
  };
  return { 
    fontSize: 'var(--typography-button-size)', 
    fontWeight: 'var(--typography-button-weight)', 
    letterSpacing: 'var(--typography-button-ls)' 
  };
};
```

```javascript
// Líneas 35-40: Heights y padding hardcoded
case 'primary':
  return {
    padding: '10px 18px',  // ❌ Hardcoded
    height: '40px',        // ❌ Hardcoded
    // ...
  };
```

**✅ Debería ser:**
```javascript
case 'primary':
  return {
    padding: '0 var(--spacing-lg)',
    height: 'var(--button-height-md)',
    borderRadius: 'var(--rounded-pill)', // Notion: pill-shaped CTAs
    // ...
  };
```

```javascript
// Línea 54: Height hardcoded
padding: '12px 20px',  // ❌
height: '44px',        // ❌
```

**✅ Debería ser:**
```javascript
padding: '0 var(--spacing-md)',
height: 'var(--button-height-lg)',
```

---

### 2. `/app/src/components/Card.jsx`

**Líneas con valores hardcodeados:**

```javascript
// Línea 11: Padding hardcoded
padding: '24px',  // ❌
```

**✅ Debería ser:**
```javascript
padding: 'var(--spacing-lg)',
```

```javascript
// Línea 26: Margin hardcoded
marginBottom: '16px',  // ❌
```

**✅ Debería ser:**
```javascript
marginBottom: 'var(--spacing-base)',
```

```javascript
// Líneas 34-36: Typography hardcoded
fontSize: '18px',   // ❌
fontWeight: 600,    // ❌
lineHeight: 1.4,
```

**✅ Debería ser:**
```javascript
fontSize: 'var(--typography-title-size)',
fontWeight: 'var(--typography-title-weight)',
lineHeight: 'var(--typography-title-lh)',
```

---

### 3. `/app/src/components/Modal.jsx`

**Líneas con valores hardcodeados:**

```javascript
// Línea 101: Backdrop color hardcoded
background: 'rgba(15, 18, 30, 0.5)',  // ❌
backdropFilter: 'blur(6px)',          // ❌
```

**✅ Debería ser:**
```javascript
background: 'var(--backdrop-color)',
backdropFilter: `blur(var(--backdrop-blur))`,
```

```javascript
// Línea 118: Shadow hardcoded
boxShadow: '0 24px 64px rgba(0,0,0,0.22)',  // ❌
```

**✅ Debería ser:**
```javascript
boxShadow: 'var(--shadow-elevated)',
```

```javascript
// Línea 139: Letter spacing hardcoded
letterSpacing: '-0.01em',  // ❌
```

**✅ Debería ser:**
```javascript
letterSpacing: 'var(--ls-tight-2)',
```

```javascript
// Línea 146: Width/height hardcoded
width: '2.25rem',   // ✅ OK (ya usa rem)
height: '2.25rem',  // ✅ OK
```

**✅ Podría mejorar usando:**
```javascript
width: 'var(--button-height-sm)',
height: 'var(--button-height-sm)',
```

---

### 4. `/app/src/components/TopNav.jsx`

**Líneas con valores hardcodeados:**

```javascript
// Líneas 60-61: Font size hardcoded
fontSize: '13px',   // ❌
fontWeight: 500,    // ❌
```

**✅ Debería ser:**
```javascript
fontSize: 'var(--typography-nav-link-size)',
fontWeight: 'var(--typography-nav-link-weight)',
```

```javascript
// Líneas 76-77: Border height hardcoded
height: '1.5px',  // ❌
```

**✅ Debería ser:**
```javascript
height: '0.09375rem', /* 1.5px en rem */
```

```javascript
// Línea 94: Nav height hardcoded
minHeight: '56px',  // ❌
```

**✅ Debería ser:**
```javascript
minHeight: 'var(--nav-height)',
```

```javascript
// Líneas 116-117: Font size hardcoded
fontSize: '15px',  // ❌
fontWeight: 600,   // ❌
letterSpacing: '-0.01em',  // ❌
```

**✅ Debería ser:**
```javascript
fontSize: 'var(--typography-title-size)',
fontWeight: 'var(--typography-title-weight)',
letterSpacing: 'var(--ls-tight-2)',
```

```javascript
// Líneas 159-160: Button size hardcoded
width: '36px',   // ❌
height: '36px',  // ❌
```

**✅ Debería ser:**
```javascript
width: 'var(--button-height-sm)',
height: 'var(--button-height-sm)',
```

```javascript
// Línea 233: Shadow hardcoded
boxShadow: '0 8px 32px rgba(0,0,0,0.06)'  // ❌
```

**✅ Debería ser:**
```javascript
boxShadow: 'var(--shadow-soft)'
```

---

### 5. `/app/src/pages/Landing.jsx`

**Líneas con valores hardcodeadas:**

```javascript
// Línea 164: Letter spacing hardcoded
letterSpacing: '-0.03em',  // ❌
```

**✅ Debería ser:**
```javascript
letterSpacing: 'var(--ls-tight-1)',
```

```javascript
// Línea 196: Height hardcoded
minHeight: '3.5rem',  // ❌
```

**✅ Debería ser:**
```javascript
minHeight: 'var(--nav-height)',
```

```javascript
// Líneas 216-217: Size hardcoded
width: '2rem',   // ❌
height: '2rem',  // ❌
```

**✅ Debería ser:**
```javascript
width: 'var(--button-height-sm)',
height: 'var(--button-height-sm)',
```

```javascript
// Línea 224: Letter spacing hardcoded
letterSpacing: '-0.005em',  // ❌
```

**✅ Debería ser:**
```javascript
letterSpacing: 'var(--ls-tight-3)',
```

```javascript
// Línea 247: Letter spacing hardcoded
letterSpacing: '0.02em',  // ❌
```

**✅ Debería ser:**
```javascript
letterSpacing: 'var(--ls-wide-1)',
```

---

### 6. `/app/src/components/AuthShell.jsx`

**Líneas con valores hardcodeadas:**

```javascript
// Línea 122: Letter spacing hardcoded
letterSpacing: '-0.03em',  // ❌
```

**✅ Debería ser:**
```javascript
letterSpacing: 'var(--ls-tight-1)',
```

---

### 7. `/app/src/components/Input.jsx`

**Líneas con valores hardcodeadas:**

```javascript
// Líneas 11-12: Padding y height hardcoded
padding: '12px 16px',  // ❌
height: '44px',        // ❌
```

**✅ Debería ser:**
```javascript
padding: '0.375rem var(--spacing-base)', /* 6px vertical como Notion */
height: 'var(--input-height-lg)',
```

```javascript
// Línea 14: Font size hardcoded
fontSize: '16px',  // ❌
```

**✅ Debería ser:**
```javascript
fontSize: 'var(--typography-body-md-size)',
```

**Nota:** El fontSize: '16px' previene el zoom en iOS al hacer focus, pero ahora `--typography-body-md-size` ya es 16px (1rem), así que está bien usar la variable.

---

## ✅ Resumen de Variables Disponibles

### Spacing
- `--spacing-xxs` (4px)
- `--spacing-xs` (8px)
- `--spacing-sm` (12px)
- `--spacing-base` (16px)
- `--spacing-md` (20px)
- `--spacing-lg` (24px)
- `--spacing-xl` (28px)
- `--spacing-xxl` (32px)

### Button/Input Heights
- `--button-height-sm` (36px)
- `--button-height-md` (38px)
- `--button-height-lg` (44px)
- `--input-height-sm`, `--input-height-md`, `--input-height-lg` (same as buttons)

### Typography
- `--typography-display-1-size` (64px) + weight/lh/ls
- `--typography-heading-1-size` (40px) + weight/lh/ls
- `--typography-heading-2-size` (26px) + weight/lh/ls
- `--typography-heading-3-size` (22px) + weight/lh/ls
- `--typography-title-size` (20px) + weight/lh/ls
- `--typography-body-md-size` (16px) + weight/lh/ls
- `--typography-body-sm-size` (15px) + weight/lh/ls
- `--typography-button-size` (16px) + weight/lh/ls
- `--typography-caption-size` (14px) + weight/lh/ls
- `--typography-eyebrow-size` (12px) + weight/lh/ls

### Letter Spacing
- `--ls-tight-1` (-0.03em)
- `--ls-tight-2` (-0.01em)
- `--ls-tight-3` (-0.005em)
- `--ls-normal` (0)
- `--ls-wide-1` (0.02em)
- `--ls-wide-2` (0.05em)

### Shadows
- `--shadow-flat` (none)
- `--shadow-soft` (multi-layer subtle)
- `--shadow-elevated` (modals/popovers)
- `--shadow-strong` (maximum depth)

### Border Radius
- `--rounded-xs` (4px) - inputs
- `--rounded-sm` (5px) - menu items
- `--rounded-md` (8px) - utility buttons
- `--rounded-lg` (12px) - cards
- `--rounded-xl` (16px) - large containers
- `--rounded-pill` (9999px) - marketing CTAs

### Colors
- `--color-primary` (Notion Blue #0075de)
- `--color-secondary` (Deep Indigo #213183 para hero band)
- `--color-canvas` (warm paper #f6f5f4)
- `--color-surface-card` (white #ffffff)
- Sticker palette: `--color-accent-sky`, `--color-accent-purple`, `--color-accent-pink`, etc.

### Backdrop
- `--backdrop-color`
- `--backdrop-blur`

### Other
- `--nav-height` (56px)
- `--touch-target-min` (44px)

---

## 📝 Notas Importantes

1. **Notion usa pill-shaped CTAs**: Los botones principales (`btn-primary`, `btn-secondary`) ahora usan `border-radius: var(--rounded-pill)` (9999px)

2. **Typography con tracking negativo**: Los headings ahora usan weight 700 con negative letter-spacing como especifica Notion

3. **Inputs usan rounded-xs (4px)**: Notion mantiene los inputs con corners apretados (4px), no pills

4. **Sombras multicapa sutiles**: Notion usa sombras muy sutiles con múltiples capas en lugar de drop shadows pesados

5. **Mobile-first**: Todo el sistema está diseñado mobile-first con breakpoints en 600px, 768px, 1080px, 1440px

6. **Hero band oscuro disponible**: Puedes usar `.hero-band` para crear secciones con el Deep Indigo (#213183) invertido

7. **Paleta de stickers decorativa**: Disponible pero solo para decoración, nunca para CTAs estructurales
